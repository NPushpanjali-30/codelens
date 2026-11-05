import type { ScannedFile } from "@/lib/analyzer/scanner";
import type { ParsedDependency } from "@/lib/analyzer/dependencies";
import type { ApiRoute } from "@/types";

// Reduced from 60_000 so a single request stays under Groq's free-tier
// limit of 8,000 tokens per minute (~14,000 chars is roughly 3,500 tokens).
const MAX_CONTEXT_CHARS = 14_000;

/**
 * Builds a bounded, structured context string for the project-level
 * analysis call. Prioritizes README, package.json, config, and files
 * flagged important by the analyzer — never the whole repository.
 */
export function buildProjectAnalysisContext(params: {
  repoFullName: string;
  files: ScannedFile[];
  dependencies: ParsedDependency[];
  apiRoutes: ApiRoute[];
}): string {
  const { repoFullName, files, dependencies, apiRoutes } = params;

  const structure = files.map((f) => f.filePath).sort().join("\n");
  const important = files.filter((f) => f.isImportant && f.content);
  const readme = files.find((f) => /^readme/i.test(f.fileName));

  let context = `Repository: ${repoFullName}\n\n`;
  context += `## File structure\n${truncate(structure, 3000)}\n\n`;

  if (readme?.content) {
    context += `## README\n${truncate(readme.content, 2000)}\n\n`;
  }

  context += `## Dependencies\n${dependencies.map((d) => `${d.name}@${d.version} (${d.dependencyType})`).join(", ") || "none detected"}\n\n`;

  context += `## Detected API routes\n${apiRoutes.map((r) => `${r.method} ${r.endpoint} (${r.file})`).join("\n") || "none detected"}\n\n`;

  context += `## Important files\n`;
  for (const file of important) {
    if (context.length > MAX_CONTEXT_CHARS) break;
    context += `\n### ${file.filePath}\n\`\`\`\n${truncate(file.content ?? "", 1000)}\n\`\`\`\n`;
  }

  return truncate(context, MAX_CONTEXT_CHARS);
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}\n…(truncated)` : text;
}