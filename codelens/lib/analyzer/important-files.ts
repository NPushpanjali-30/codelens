// Heuristics for flagging files worth prioritizing in AI context and in the
// file explorer's important-file indicator. Deliberately simple and
// explainable rather than ML-based, so the reasoning stays auditable.

const IMPORTANT_FILENAMES = new Set([
  "package.json",
  "readme.md",
  "next.config.js",
  "next.config.mjs",
  "tsconfig.json",
  "middleware.ts",
  "docker-compose.yml",
  "dockerfile",
  ".env.example",
  "schema.sql",
  "schema.prisma",
]);

const IMPORTANT_PATH_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /(^|\/)api\/.*route\.(t|j)sx?$/, reason: "Defines an API route" },
  { pattern: /(^|\/)auth[a-z\-\/]*\.(t|j)sx?$/i, reason: "Handles authentication logic" },
  { pattern: /(^|\/)middleware\.(t|j)s$/, reason: "Runs on every matched request (route protection)" },
  { pattern: /(^|\/)(supabase|db|database|prisma)[a-z\-\/]*\.(t|j)sx?$/i, reason: "Configures database access" },
  { pattern: /(^|\/)login\/page\.(t|j)sx?$/, reason: "Entry point for the login flow" },
  { pattern: /(^|\/)signup\/page\.(t|j)sx?$/, reason: "Entry point for the signup flow" },
  { pattern: /(^|\/)layout\.(t|j)sx?$/, reason: "Defines shared layout/providers" },
  { pattern: /(^|\/)schema\.(sql|prisma)$/, reason: "Defines the database schema" },
];

export function isImportantFile(filePath: string): { important: boolean; reason?: string } {
  const fileName = filePath.split("/").pop()?.toLowerCase() ?? "";
  if (IMPORTANT_FILENAMES.has(fileName)) {
    return { important: true, reason: "Project configuration or entry-point file" };
  }
  for (const { pattern, reason } of IMPORTANT_PATH_PATTERNS) {
    if (pattern.test(filePath)) return { important: true, reason };
  }
  return { important: false };
}
