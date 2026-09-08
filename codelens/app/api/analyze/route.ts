import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { parseJsonBody, analyzeRequestSchema } from "@/lib/security/validation";
import { getStoredGitHubToken } from "@/lib/github/oauth";
import { getRepoByFullName, GitHubApiError } from "@/lib/github/client";
import { scanRepository } from "@/lib/analyzer/scanner";
import { collectDependencies } from "@/lib/analyzer/dependencies";
import { detectApiRoutes } from "@/lib/analyzer/api-routes";
import { summarizeLanguages } from "@/lib/analyzer/languages";
import { chunkFile } from "@/lib/analyzer/chunker";
import { buildProjectAnalysisContext } from "@/lib/ai/context-builder";
import { generateProjectAnalysis, GrokApiError } from "@/lib/ai/grok";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const maxDuration = 300; // allow up to 5 minutes for larger repos

// POST /api/analyze
// Runs the full pipeline described in the spec:
// fetch repo -> scan files -> detect deps/APIs/languages -> chunk code ->
// store everything in Supabase -> build AI context -> call Grok -> store analysis.
export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const { data, error } = await parseJsonBody(request, analyzeRequestSchema);
  if (!data) return NextResponse.json({ error }, { status: 400 });

  const admin = createSupabaseAdminClient();

  const { data: repoRow, error: repoError } = await admin
    .from("repositories")
    .select("*")
    .eq("id", data.repositoryId)
    .eq("user_id", user.id) // ensures a user can only analyze their own repository row
    .single();

  if (repoError || !repoRow) {
    return NextResponse.json({ error: "Repository not found." }, { status: 404 });
  }

  const token = await getStoredGitHubToken(user.id);
  if (!token) {
    return NextResponse.json({ error: "GitHub is not connected." }, { status: 401 });
  }

  await admin
    .from("repositories")
    .update({ analysis_status: "analyzing", analysis_error: null })
    .eq("id", repoRow.id);

  try {
    // 1. Confirm the repo is still reachable (handles deleted/renamed/permission-revoked repos)
    await getRepoByFullName(token, repoRow.owner, repoRow.name);

    // 2. Scan files (ignoring node_modules/.env/binaries/etc — see lib/security/filters.ts)
    const scanned = await scanRepository(token, repoRow.owner, repoRow.name, repoRow.default_branch);

    if (scanned.length === 0) {
      throw new Error("Repository appears to be empty.");
    }

    // 3. Persist file metadata + content
    await admin.from("repository_files").delete().eq("repository_id", repoRow.id);
    const { data: insertedFiles, error: insertFilesError } = await admin
      .from("repository_files")
      .insert(
        scanned.map((f) => ({
          repository_id: repoRow.id,
          file_path: f.filePath,
          file_name: f.fileName,
          extension: f.extension,
          language: f.language,
          file_size: f.fileSize,
          content: f.content,
          is_important: f.isImportant,
        }))
      )
      .select("id, file_path, content, language");
    if (insertFilesError) throw insertFilesError;

    // 4. Detect dependencies
    const dependencies = collectDependencies(scanned);
    await admin.from("dependencies").delete().eq("repository_id", repoRow.id);
    if (dependencies.length > 0) {
      await admin.from("dependencies").insert(
        dependencies.map((d) => ({
          repository_id: repoRow.id,
          name: d.name,
          version: d.version,
          dependency_type: d.dependencyType,
          source_file: d.sourceFile,
        }))
      );
    }

    // 5. Detect API routes
    const apiRoutes = detectApiRoutes(scanned);

    // 6. Chunk code for retrieval (RAG)
    await admin.from("code_chunks").delete().eq("repository_id", repoRow.id);
    const chunkRows = (insertedFiles ?? [])
      .filter((f: any) => f.content)
      .flatMap((f: any) =>
        chunkFile(f.content).map((chunk) => ({
          repository_id: repoRow.id,
          file_id: f.id,
          chunk_text: chunk.chunkText,
          start_line: chunk.startLine,
          end_line: chunk.endLine,
          symbol_name: chunk.symbolName,
          language: f.language,
        }))
      );
    if (chunkRows.length > 0) {
      // Insert in batches to stay under request size limits on large repos.
      const BATCH = 200;
      for (let i = 0; i < chunkRows.length; i += BATCH) {
        await admin.from("code_chunks").insert(chunkRows.slice(i, i + BATCH));
      }
    }

    // 7. Build bounded AI context and call Grok for the project-level analysis
    const context = buildProjectAnalysisContext({
      repoFullName: repoRow.full_name,
      files: scanned,
      dependencies,
      apiRoutes,
    });
    const raw = await generateProjectAnalysis(context);
    const parsed = safeParseAnalysisJson(raw);

    await admin.from("analyses").delete().eq("repository_id", repoRow.id);
    await admin.from("analyses").insert({
      repository_id: repoRow.id,
      project_overview: parsed.projectOverview,
      technology_stack: parsed.technologyStack,
      architecture: parsed.architecture,
      authentication: parsed.authentication,
      database_information: parsed.databaseInformation,
      important_files: parsed.importantFiles,
      api_information: apiRoutes,
      dependencies_summary: parsed.dependenciesSummary,
    });

    // 8. Derive simple architecture components from the tech stack for the visualization
    const components = buildArchitectureComponents(parsed.technologyStack, repoRow.full_name);
    await admin.from("architecture_components").delete().eq("repository_id", repoRow.id);
    if (components.length > 0) {
      await admin.from("architecture_components").insert(
        components.map((c) => ({ ...c, repository_id: repoRow.id }))
      );
    }

    await admin
      .from("repositories")
      .update({
        analyzed: true,
        analysis_status: "complete",
        language: summarizeLanguages(scanned)[0]?.language ?? repoRow.language,
      })
      .eq("id", repoRow.id);

    return NextResponse.json({ status: "complete" });
  } catch (err) {
    const message =
      err instanceof GitHubApiError || err instanceof GrokApiError || err instanceof Error
        ? err.message
        : "Analysis failed.";
    console.error(`Analysis failed for repository ${repoRow.id}:`, err);
    await admin
      .from("repositories")
      .update({ analysis_status: "failed", analysis_error: message })
      .eq("id", repoRow.id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function safeParseAnalysisJson(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return {
      projectOverview: "The AI response could not be parsed. Please re-run the analysis.",
      technologyStack: { frontend: [], backend: [], database: [], frameworks: [], libraries: [], authentication: [], apis: [] },
      architecture: "",
      authentication: "",
      databaseInformation: "",
      importantFiles: [],
      dependenciesSummary: "",
    };
  }
}

function buildArchitectureComponents(stack: any, repoName: string) {
  const components: { component_name: string; component_type: string; description: string; related_files: string[] }[] = [];
  if (stack?.frontend?.length) {
    components.push({
      component_name: "Frontend",
      component_type: "frontend",
      description: `Built with ${stack.frontend.join(", ")}.`,
      related_files: [],
    });
  }
  if (stack?.backend?.length) {
    components.push({
      component_name: "Backend / API layer",
      component_type: "backend",
      description: `Built with ${stack.backend.join(", ")}.`,
      related_files: [],
    });
  }
  if (stack?.database?.length) {
    components.push({
      component_name: "Database",
      component_type: "database",
      description: `Uses ${stack.database.join(", ")}.`,
      related_files: [],
    });
  }
  if (stack?.authentication?.length) {
    components.push({
      component_name: "Authentication",
      component_type: "auth",
      description: `Handled via ${stack.authentication.join(", ")}.`,
      related_files: [],
    });
  }
  return components;
}
