import { getRepoTree, getFileContent, type GitHubTreeEntry } from "@/lib/github/client";
import { shouldIgnorePath, isFileTooLarge, containsLikelySecret, redactSecrets } from "@/lib/security/filters";
import { detectLanguage } from "@/lib/analyzer/languages";
import { isImportantFile } from "@/lib/analyzer/important-files";

export interface ScannedFile {
  filePath: string;
  fileName: string;
  extension: string | null;
  language: string | null;
  fileSize: number;
  content: string | null;
  isImportant: boolean;
}

// Files whose full content is fetched and stored. Everything else is
// recorded as metadata only (path/language/size) so large repos stay fast
// and cheap without needing every byte of every file.
const CONTENT_PRIORITY_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".mdx", ".sql", ".prisma", ".yml", ".yaml",
]);
const MAX_FILES_WITH_CONTENT = 400;

/**
 * Walks a repository's git tree, applies the ignore rules, and fetches
 * content for a bounded, prioritized subset of files (source, config,
 * docs, package manifests). Returns metadata-only entries for the rest.
 */
export async function scanRepository(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  onProgress?: (step: string) => void
): Promise<ScannedFile[]> {
  onProgress?.("files-retrieved");
  const tree = await getRepoTree(token, owner, repo, branch);
  const blobs = tree.filter((entry): entry is GitHubTreeEntry & { type: "blob" } => entry.type === "blob");

  const candidates = blobs.filter((entry) => !shouldIgnorePath(entry.path));
  onProgress?.("structure-detected");

  const fileName = (path: string) => path.split("/").pop() ?? path;
  const extension = (name: string) => {
    const idx = name.lastIndexOf(".");
    return idx === -1 ? null : name.slice(idx).toLowerCase();
  };

  // Prioritize small, high-signal files for content fetching.
  const prioritized = [...candidates].sort((a, b) => {
    const aName = fileName(a.path);
    const bName = fileName(b.path);
    const aImportant = isImportantFile(a.path).important || CONTENT_PRIORITY_EXTENSIONS.has(extension(aName) ?? "");
    const bImportant = isImportantFile(b.path).important || CONTENT_PRIORITY_EXTENSIONS.has(extension(bName) ?? "");
    if (aImportant !== bImportant) return aImportant ? -1 : 1;
    return (a.size ?? 0) - (b.size ?? 0);
  });

  const results: ScannedFile[] = [];

  // The original entries eligible for content, in priority order — everyone
  // else just gets metadata (path/language/size), no fetch at all.
  const eligible = prioritized.filter((entry) => {
    const name = fileName(entry.path);
    const ext = extension(name);
    const size = entry.size ?? 0;
    const { important } = isImportantFile(entry.path);
    return !isFileTooLarge(size) && (important || CONTENT_PRIORITY_EXTENSIONS.has(ext ?? ""));
  });

  // Fetch content with a bounded worker pool instead of one request at a
  // time. Sequentially awaiting up to MAX_FILES_WITH_CONTENT GitHub API
  // calls (previously ~1-2+ minutes on a large repo) was the main reason
  // "Analyze" felt slow — this cuts it down to roughly (files / CONCURRENCY)
  // round trips instead of one per file, while preserving the original
  // behavior: content is fetched in priority order, and a failed fetch
  // doesn't count against the MAX_FILES_WITH_CONTENT cap (the next eligible
  // file is tried in its place).
  const CONCURRENCY = 10;
  const contentByPath = new Map<string, string>();
  let nextIndex = 0;
  let contentFetched = 0;

  async function worker() {
    while (contentFetched < MAX_FILES_WITH_CONTENT) {
      const i = nextIndex++;
      if (i >= eligible.length) return;
      const entry = eligible[i];
      const raw = await getFileContent(token, owner, repo, entry.path, branch);
      if (raw !== null && contentFetched < MAX_FILES_WITH_CONTENT) {
        contentByPath.set(entry.path, containsLikelySecret(raw) ? redactSecrets(raw) : raw);
        contentFetched += 1;
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, eligible.length) }, worker));

  for (const entry of prioritized) {
    const name = fileName(entry.path);
    const ext = extension(name);
    const language = detectLanguage(name);
    const size = entry.size ?? 0;
    const { important } = isImportantFile(entry.path);

    results.push({
      filePath: entry.path,
      fileName: name,
      extension: ext,
      language,
      fileSize: size,
      content: contentByPath.get(entry.path) ?? null,
      isImportant: important,
    });
  }

  onProgress?.("languages-detected");
  return results;
}