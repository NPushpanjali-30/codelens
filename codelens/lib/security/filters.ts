// Everything the analyzer and the AI context builder rely on to avoid
// touching noise, binaries, or secrets. Keep this conservative: it is
// better to skip an ambiguous file than to leak it to Grok.

const IGNORED_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  "coverage",
  "vendor",
  ".turbo",
  ".cache",
  "out",
  ".vercel",
]);

const IGNORED_FILENAMES = new Set([
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
  ".env.test",
  "credentials.json",
  "secrets.json",
  "id_rsa",
  "id_ed25519",
]);

const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".bmp", ".svg",
  ".mp4", ".mov", ".avi", ".webm", ".mp3", ".wav",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".zip", ".tar", ".gz", ".rar", ".7z",
  ".pdf", ".exe", ".dll", ".so", ".dylib",
  ".pyc", ".class", ".jar",
  ".lock", // package-lock.json is JSON text but huge/low-signal; parsed separately, not stored raw
]);

const MAX_FILE_SIZE_BYTES = 300 * 1024; // 300KB — large generated files are skipped, not truncated silently

export function shouldIgnorePath(path: string): boolean {
  const segments = path.split("/");
  if (segments.some((seg) => IGNORED_DIRS.has(seg))) return true;

  const fileName = segments[segments.length - 1];
  if (IGNORED_FILENAMES.has(fileName)) return true;
  if (fileName.startsWith(".env")) return true;

  const ext = getExtension(fileName);
  if (ext && BINARY_EXTENSIONS.has(ext)) return true;

  return false;
}

export function isFileTooLarge(sizeBytes: number): boolean {
  return sizeBytes > MAX_FILE_SIZE_BYTES;
}

export function getExtension(fileName: string): string | null {
  const idx = fileName.lastIndexOf(".");
  if (idx === -1) return null;
  return fileName.slice(idx).toLowerCase();
}

// Patterns that indicate a secret is present in file content. Used both to
// skip storing raw content for a file, and to redact before any AI call as
// defense in depth even for files that otherwise looked safe.
const SECRET_PATTERNS: RegExp[] = [
  /-----BEGIN (RSA|EC|OPENSSH|PGP) PRIVATE KEY-----/,
  /AKIA[0-9A-Z]{16}/, // AWS access key id
  /(?:api|secret|access)[_-]?key\s*[:=]\s*['"][A-Za-z0-9_\-]{16,}['"]/i,
  /sk-[A-Za-z0-9]{20,}/, // OpenAI/Anthropic/Grok-style secret key prefix
  /ghp_[A-Za-z0-9]{36}/, // GitHub personal access token
  /xox[baprs]-[A-Za-z0-9-]{10,}/, // Slack token
];

export function containsLikelySecret(content: string): boolean {
  return SECRET_PATTERNS.some((pattern) => pattern.test(content));
}

/** Redacts anything that looks like a secret before content is ever sent to Grok. */
export function redactSecrets(content: string): string {
  let redacted = content;
  for (const pattern of SECRET_PATTERNS) {
    redacted = redacted.replace(new RegExp(pattern, "g"), "[REDACTED]");
  }
  return redacted;
}
