import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { repositoryIdParamSchema } from "@/lib/security/validation";

// GET /api/repositories/[id]/files
// Returns file metadata + content for the file explorer. RLS ensures this
// only ever returns rows for a repository the caller owns.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const parsedParams = repositoryIdParamSchema.safeParse(params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid repository id." }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data: files, error } = await supabase
    .from("repository_files")
    .select("id, repository_id, file_path, file_name, extension, language, file_size, content, is_important, created_at")
    .eq("repository_id", parsedParams.data.id)
    .order("file_path");

  if (error) {
    return NextResponse.json({ error: "Failed to load files." }, { status: 500 });
  }
  return NextResponse.json({ files });
}
