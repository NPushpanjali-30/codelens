import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fileIdParamSchema } from "@/lib/security/validation";

// GET /api/files/[id]
// Used by the "View Code" action from chat citations and the API explorer.
// RLS on repository_files (scoped through its parent repository) prevents
// a user from reading another user's file by guessing an id.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const parsedParams = fileIdParamSchema.safeParse(params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid file id." }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data: file, error } = await supabase
    .from("repository_files")
    .select("id, file_path, file_name, language, content, is_important")
    .eq("id", parsedParams.data.id)
    .single();

  if (error || !file) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
  return NextResponse.json({ file });
}
