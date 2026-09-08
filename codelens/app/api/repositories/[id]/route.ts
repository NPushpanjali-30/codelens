import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { repositoryIdParamSchema } from "@/lib/security/validation";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const parsedParams = repositoryIdParamSchema.safeParse(params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid repository id." }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data: repository, error: repoErr } = await supabase
    .from("repositories")
    .select("*")
    .eq("id", parsedParams.data.id)
    .single();

  if (repoErr || !repository) {
    // RLS also blocks other users' rows, so this covers both "not found" and "not yours"
    return NextResponse.json({ error: "Repository not found." }, { status: 404 });
  }

  const { data: analysis } = await supabase
    .from("analyses")
    .select("*")
    .eq("repository_id", repository.id)
    .maybeSingle();

  return NextResponse.json({ repository, analysis });
}
