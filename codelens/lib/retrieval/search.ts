import { createSupabaseAdminClient } from "@/lib/supabase/server";

export interface RetrievedChunk {
  filePath: string;
  chunkText: string;
  startLine: number;
  endLine: number;
  symbolName: string | null;
  score: number;
}

// Reduced from 8 to stay under Groq's free-tier token limit.
const MAX_CHUNKS = 4;
// Max characters of code kept per chunk when building the AI prompt.
const MAX_CHUNK_CHARS = 1500;

/**
 * Retrieval over code_chunks, three passes, each only run if the previous
 * one came back empty:
 *  1. Postgres full-text search (fast, stemmed) — good for prose-like text
 *     (README, comments) but its stemmer often produces *different* stems
 *     for related English words (e.g. "register" -> "regist" but
 *     "registration" -> "registr"), so it can miss obviously-related terms.
 *  2. A substring (ILIKE) search on stemmed terms (see `stem` below), which
 *     catches both camelCase/snake_case identifiers (e.g. `signUp`) and
 *     word-family mismatches FTS's stemmer misses (e.g. "registration"
 *     matching code that says "register").
 *  3. A search over file *paths* (not content) for the same terms. This
 *     catches questions that name a file/concept directly — e.g. "where is
 *     readme" — where the matching text is the filename, not the file's
 *     own prose. Any matching files' chunks are returned as context.
 * The embedding column in the schema is reserved for a future vector-search
 * pass that would replace/augment all of these.
 */
export async function retrieveRelevantChunks(
  repositoryId: string,
  question: string
): Promise<RetrievedChunk[]> {
  const admin = createSupabaseAdminClient();

  const searchTerms = extractSearchTerms(question);
  if (searchTerms.length === 0) return [];

  const tsQuery = searchTerms.map((t) => `${t}:*`).join(" | ");

  const { data: ftsData, error: ftsError } = await admin
    .from("code_chunks")
    .select("chunk_text, start_line, end_line, symbol_name, repository_files(file_path)")
    .eq("repository_id", repositoryId)
    .textSearch("chunk_text", tsQuery, { config: "english" })
    .limit(MAX_CHUNKS);

  if (!ftsError && ftsData && ftsData.length > 0) {
    return mapRows(ftsData);
  }

  // Pass 2: substring match on stemmed terms, catches camelCase/snake_case
  // identifiers and word-family variants FTS's tokenizer splits differently.
  const stems = Array.from(new Set(searchTerms.map(stem)));
  const contentOrFilter = stems.map((t) => `chunk_text.ilike.%${t}%`).join(",");
  const { data: likeData, error: likeError } = await admin
    .from("code_chunks")
    .select("chunk_text, start_line, end_line, symbol_name, repository_files(file_path)")
    .eq("repository_id", repositoryId)
    .or(contentOrFilter)
    .limit(MAX_CHUNKS);

  if (!likeError && likeData && likeData.length > 0) {
    return mapRows(likeData);
  }

  // Pass 3: the question may name a file/concept directly (e.g. "where is
  // readme", "show me the auth routes file") rather than quoting text that
  // appears inside the file. Search file paths themselves, then pull that
  // file's chunks in as context.
  const pathOrFilter = stems.map((t) => `file_path.ilike.%${t}%`).join(",");
  const { data: fileMatches, error: fileError } = await admin
    .from("repository_files")
    .select("id, file_path")
    .eq("repository_id", repositoryId)
    .or(pathOrFilter)
    .limit(5);

  if (fileError || !fileMatches || fileMatches.length === 0) return [];

  const { data: chunksForFiles, error: chunksError } = await admin
    .from("code_chunks")
    .select("chunk_text, start_line, end_line, symbol_name, repository_files(file_path)")
    .in(
      "file_id",
      fileMatches.map((f: { id: string }) => f.id)
    )
    .limit(MAX_CHUNKS);

  if (chunksError || !chunksForFiles) return [];
  return mapRows(chunksForFiles);
}

// Crude prefix stemmer: related English words (register/registration,
// dependency/dependencies) usually share their first few characters even
// when a proper stemmer would diverge. Short words are left as-is since
// truncating them would make the match too broad to be useful.
function stem(word: string): string {
  return word.length <= 5 ? word : word.slice(0, 5);
}

function mapRows(data: any[]): RetrievedChunk[] {
  return data.map((row: any) => ({
    filePath: row.repository_files?.file_path ?? "unknown",
    chunkText: row.chunk_text,
    startLine: row.start_line,
    endLine: row.end_line,
    symbolName: row.symbol_name,
    score: 1,
  }));
}

function extractSearchTerms(question: string): string[] {
  const stopwords = new Set([
    "the", "is", "are", "where", "how", "does", "do", "what", "which", "a", "an", "of", "in", "to", "this", "project",
  ]);
  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s_.-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopwords.has(w))
    .slice(0, 8);
}

export function formatRetrievedContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "(no matching code found in the repository)";
  return chunks
    .map((c) => {
      const code =
        c.chunkText.length > MAX_CHUNK_CHARS
          ? `${c.chunkText.slice(0, MAX_CHUNK_CHARS)}\n…(truncated)`
          : c.chunkText;
      return `### ${c.filePath} (lines ${c.startLine}-${c.endLine}${c.symbolName ? `, ${c.symbolName}` : ""})\n\`\`\`\n${code}\n\`\`\``;
    })
    .join("\n\n");
}