// Server-side-only AI client. This key must never be imported into
// a "use client" file — this module has no "use client" directive and is
// only ever called from Route Handlers.
//
// Currently configured to call Groq's free, OpenAI-compatible API
// (https://console.groq.com) instead of xAI's paid Grok API. Groq mirrors
// the OpenAI chat/completions request & response shape, so no other code
// in this file needs to change to swap providers again later — just update
// GROK_BASE_URL, GROK_MODEL, and the GROK_API_KEY env var.
//
// NOTE: llama-3.3-70b-versatile was moved to Groq's Enterprise-only tier
// (Aug 2026), so requests to it now fail for normal developer API keys.
// Defaulting to openai/gpt-oss-120b, a currently-supported production
// model on the standard developer plan. Override via GROK_MODEL if Groq
// changes its lineup again.

const GROK_BASE_URL = process.env.GROK_API_BASE_URL ?? "https://api.groq.com/openai/v1";
const GROK_MODEL = process.env.GROK_MODEL ?? "openai/gpt-oss-120b";

export class GrokApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "GrokApiError";
  }
}

interface GrokMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function callGrok(messages: GrokMessage[], options?: { jsonMode?: boolean }): Promise<string> {
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) {
    throw new GrokApiError("GROK_API_KEY is not configured on the server.", 500);
  }

  const res = await fetch(`${GROK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROK_MODEL,
      messages,
      temperature: 0.2,
      ...(options?.jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new GrokApiError(`Grok API error (${res.status}): ${text.slice(0, 300)}`, res.status);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new GrokApiError("Grok returned an unexpected response shape.", 502);
  }
  return content;
}

const GROUNDING_SYSTEM_PROMPT = `You are analyzing an actual software repository. Answer only using the supplied repository context. Do not invent files, functions, APIs, database tables, dependencies or architecture. If the provided context is insufficient, explicitly say that the repository context is insufficient.`;

/** Generates the structured project-level analysis (overview, stack, architecture, etc). */
export async function generateProjectAnalysis(context: string): Promise<string> {
  return callGrok(
    [
      { role: "system", content: GROUNDING_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Given the following repository context, respond with ONLY a JSON object (no markdown fences, no preamble) matching this shape:
{
  "projectOverview": string,
  "technologyStack": { "frontend": string[], "backend": string[], "database": string[], "frameworks": string[], "libraries": string[], "authentication": string[], "apis": string[] },
  "architecture": string,
  "authentication": string,
  "databaseInformation": string,
  "importantFiles": [{ "path": string, "reason": string }],
  "dependenciesSummary": string
}

Repository context:
${context}`,
      },
    ],
    { jsonMode: true }
  );
}

/** Answers a codebase question grounded in retrieved chunks, with citations. */
export async function answerCodebaseQuestion(question: string, retrievedContext: string): Promise<string> {
  return callGrok(
    [
      { role: "system", content: GROUNDING_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Answer this question about the repository using ONLY the retrieved code context below. Respond with ONLY a JSON object (no markdown fences) matching this shape:
{
  "answer": string,
  "relevantFiles": [{ "path": string, "reason": string }],
  "codeFlow": string[],
  "sources": [{ "filePath": string, "startLine": number, "endLine": number }],
  "confident": boolean
}

If the retrieved context does not contain enough information, set "confident" to false, set "answer" to "I could not find enough evidence in the repository to answer this confidently.", and leave "sources" empty. Never cite a file or line range that isn't present in the retrieved context below.

Question: ${question}

Retrieved code context:
${retrievedContext}`,
      },
    ],
    { jsonMode: true }
  );
}