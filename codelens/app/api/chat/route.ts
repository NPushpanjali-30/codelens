const NextResponse = Response;

import { requireUser } from "@/lib/auth/session";
import { parseJsonBody, chatRequestSchema } from "@/lib/security/validation";
import { retrieveRelevantChunks, formatRetrievedContext } from "@/lib/retrieval/search";
import { answerCodebaseQuestion, GrokApiError } from "@/lib/ai/grok";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import type { AIResponse } from "@/types";

// POST /api/chat
// Flow: verify the repository belongs to the caller -> retrieve relevant
// code chunks (RAG) -> send only those chunks to Grok -> persist the
// exchange -> return the answer with file+line citations.
export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const { data, error } = await parseJsonBody(request, chatRequestSchema);
  if (!data) return NextResponse.json({ error }, { status: 400 });

  const payload = data as {
    repositoryId: string;
    question: string;
    sessionId?: string;
  };

  const supabase = createSupabaseServerClient();

  const { data: repository, error: repoError } = await supabase
    .from("repositories")
    .select("id, analyzed")
    .eq("id", payload.repositoryId)
    .single();

  if (repoError || !repository) {
    return NextResponse.json({ error: "Repository not found." }, { status: 404 });
  }
  if (!repository.analyzed) {
    return NextResponse.json({ error: "This repository hasn't been analyzed yet." }, { status: 409 });
  }

  const { data: analysis } = await supabase
    .from("analyses")
    .select("architecture, authentication, database_information, technology_stack, dependencies_summary")
    .eq("repository_id", repository.id)
    .maybeSingle();

  const projectSummary = analysis
    ? [
        analysis.architecture ? `Architecture: ${analysis.architecture}` : null,
        analysis.authentication ? `Authentication: ${analysis.authentication}` : null,
        analysis.database_information ? `Database: ${analysis.database_information}` : null,
        analysis.technology_stack ? `Technology stack: ${JSON.stringify(analysis.technology_stack)}` : null,
        analysis.dependencies_summary ? `Dependencies: ${analysis.dependencies_summary}` : null,
      ]
        .filter(Boolean)
        .join("\n\n")
    : "(no project-level analysis available)";

  const admin = createSupabaseAdminClient();

  let sessionId = payload.sessionId;
  if (!sessionId) {
    const { data: session, error: sessionError } = await admin
      .from("chat_sessions")
      .insert({
        user_id: user.id,
        repository_id: repository.id,
        title: payload.question.slice(0, 60),
      })
      .select("id")
      .single();
    if (sessionError || !session) {
      return NextResponse.json({ error: "Failed to start chat session." }, { status: 500 });
    }
    sessionId = session.id;
  }

  await admin.from("chat_messages").insert({
    session_id: sessionId,
    role: "user",
    message: payload.question,
    sources: [],
  });

  try {
    const chunks = await retrieveRelevantChunks(repository.id, payload.question);
    const context = formatRetrievedContext(chunks);

    const raw = await answerCodebaseQuestion(payload.question, context, projectSummary);
    const parsed = safeParseAIResponse(raw);
    // The model is asked to copy file paths verbatim from the retrieved
    // context, but LLMs occasionally normalize/trim them (e.g. dropping a
    // repo folder prefix). Since that path is later used for an exact-match
    // lookup to display the file, reconcile every citation against the
    // authoritative paths we actually retrieved so a citation never points
    // at a path that doesn't exist in the database.
    const knownPaths = Array.from(new Set(chunks.map((c) => c.filePath)));
    parsed.sources = parsed.sources
      .map((s) => ({ ...s, filePath: resolveKnownPath(s.filePath, knownPaths) }))
      .filter((s): s is typeof s & { filePath: string } => s.filePath !== null);

    await admin.from("chat_messages").insert({
      session_id: sessionId,
      role: "assistant",
      message: parsed.answer,
      sources: parsed.sources,
    });

    return NextResponse.json({
      sessionId,
      answer: parsed.answer,
      relevantFiles: parsed.relevantFiles,
      codeFlow: parsed.codeFlow,
      sources: parsed.sources,
      confident: parsed.confident,
    });
  } catch (err) {
    const message = err instanceof GrokApiError ? err.message : "Failed to generate an answer.";
    console.error("Chat generation failed:", err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

// Matches a path the model cited back to one of the real paths we actually
// retrieved for it, tolerating the small ways a model can mangle a path
// (dropped/added leading segments, different casing, a leading "./").
// Returns null if nothing close enough is found, rather than pass through
// something that will fail to look up on the client.
function resolveKnownPath(cited: string, knownPaths: string[]): string | null {
  const normalize = (p: string) => p.replace(/^\.\//, "").toLowerCase();
  const citedNorm = normalize(cited);

  const exact = knownPaths.find((p) => normalize(p) === citedNorm);
  if (exact) return exact;

  const suffixMatch = knownPaths.find(
    (p) => normalize(p).endsWith(citedNorm) || citedNorm.endsWith(normalize(p))
  );
  if (suffixMatch) return suffixMatch;

  return null;
}

function safeParseAIResponse(raw: string): AIResponse {
  try {
    const parsed = JSON.parse(raw);
    return {
      answer: parsed.answer ?? "I could not find enough evidence in the repository to answer this confidently.",
      relevantFiles: parsed.relevantFiles ?? [],
      codeFlow: parsed.codeFlow ?? [],
      sources: parsed.sources ?? [],
      confident: parsed.confident ?? false,
    };
  } catch {
    return {
      answer: "I could not find enough evidence in the repository to answer this confidently.",
      relevantFiles: [],
      codeFlow: [],
      sources: [],
      confident: false,
    };
  }
}