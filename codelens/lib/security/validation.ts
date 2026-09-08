import { z } from "zod";

export const analyzeRequestSchema = z.object({
  repositoryId: z.string().uuid(),
});

export const chatRequestSchema = z.object({
  repositoryId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  question: z.string().min(1).max(2000),
});

export const repositoryIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const fileIdParamSchema = z.object({
  id: z.string().uuid(),
});

/** Parses a request body against a schema, returning a typed result or a 400-friendly error. */
export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ data: T; error: null } | { data: null; error: string }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { data: null, error: "Request body must be valid JSON." };
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    return { data: null, error: result.error.issues.map((i) => i.message).join("; ") };
  }
  return { data: result.data, error: null };
}
