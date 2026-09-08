const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  ".ts": "TypeScript",
  ".tsx": "TypeScript (React)",
  ".js": "JavaScript",
  ".jsx": "JavaScript (React)",
  ".mjs": "JavaScript",
  ".cjs": "JavaScript",
  ".json": "JSON",
  ".css": "CSS",
  ".scss": "SCSS",
  ".html": "HTML",
  ".md": "Markdown",
  ".mdx": "MDX",
  ".yml": "YAML",
  ".yaml": "YAML",
  ".sql": "SQL",
  ".py": "Python",
  ".go": "Go",
  ".rs": "Rust",
  ".java": "Java",
  ".rb": "Ruby",
  ".php": "PHP",
  ".sh": "Shell",
  ".prisma": "Prisma Schema",
  ".graphql": "GraphQL",
  ".vue": "Vue",
  ".svelte": "Svelte",
};

export function detectLanguage(fileName: string): string | null {
  const idx = fileName.lastIndexOf(".");
  if (idx === -1) return null;
  const ext = fileName.slice(idx).toLowerCase();
  return EXTENSION_LANGUAGE_MAP[ext] ?? null;
}

/** Aggregates file languages into a repo-level summary, sorted by prevalence. */
export function summarizeLanguages(files: { language: string | null }[]): { language: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const file of files) {
    if (!file.language) continue;
    counts.set(file.language, (counts.get(file.language) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([language, count]) => ({ language, count }))
    .sort((a, b) => b.count - a.count);
}
