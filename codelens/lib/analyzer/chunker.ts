export interface Chunk {
  chunkText: string;
  startLine: number;
  endLine: number;
  symbolName: string | null;
}

const SYMBOL_PATTERN =
  /^\s*(export\s+)?(default\s+)?(async\s+)?(function|class|const|interface|type)\s+([A-Za-z0-9_]+)/;

/**
 * Splits a file into overlapping line-ranged chunks for retrieval.
 * Tries to break on top-level symbol boundaries (function/class/const/type)
 * first; falls back to fixed-size windows for files without clear symbols
 * (config files, markdown, etc).
 */
export function chunkFile(content: string, maxLines = 60, overlap = 8): Chunk[] {
  const lines = content.split("\n");
  if (lines.length === 0) return [];

  const boundaries: number[] = [0];
  lines.forEach((line, i) => {
    if (i > 0 && SYMBOL_PATTERN.test(line)) boundaries.push(i);
  });
  boundaries.push(lines.length);

  const chunks: Chunk[] = [];

  if (boundaries.length > 2) {
    // Symbol-aware chunking
    for (let i = 0; i < boundaries.length - 1; i++) {
      const start = boundaries[i];
      const end = boundaries[i + 1];
      if (end - start < 1) continue;
      const slice = lines.slice(start, end);
      const symbolMatch = slice[0].match(SYMBOL_PATTERN);
      chunks.push({
        chunkText: slice.join("\n"),
        startLine: start + 1,
        endLine: end,
        symbolName: symbolMatch ? symbolMatch[5] : null,
      });
    }
  } else {
    // Fixed-window chunking with overlap
    let start = 0;
    while (start < lines.length) {
      const end = Math.min(start + maxLines, lines.length);
      chunks.push({
        chunkText: lines.slice(start, end).join("\n"),
        startLine: start + 1,
        endLine: end,
        symbolName: null,
      });
      if (end === lines.length) break;
      start = end - overlap;
    }
  }

  return chunks;
}
