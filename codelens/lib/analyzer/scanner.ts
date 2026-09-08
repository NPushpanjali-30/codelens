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
  let contentFetched = 0;

  for (const entry of prioritized) {
    const name = fileName(entry.path);
    const ext = extension(name);
    const language = detectLanguage(name);
    const size = entry.size ?? 0;
    const { important } = isImportantFile(entry.path);

    const eligibleForContent =
      contentFetched < MAX_FILES_WITH_CONTENT &&
      !isFileTooLarge(size) &&
      (important || CONTENT_PRIORITY_EXTENSIONS.has(ext ?? ""));

    let content: string | null = null;
    if (eligibleForContent) {
      const raw = await getFileContent(token, owner, repo, entry.path, branch);
      if (raw !== null) {
        content = containsLikelySecret(raw) ? redactSecrets(raw) : raw;
        contentFetched += 1;
      }
    }

    results.push({
      filePath: entry.path,
      fileName: name,
      extension: ext,
      language,
      fileSize: size,
      content,
      isImportant: important,
    });
  }

  onProgress?.("languages-detected");
  return results;
}
