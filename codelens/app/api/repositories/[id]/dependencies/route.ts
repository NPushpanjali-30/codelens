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
  const { data: dependencies, error } = await supabase
    .from("dependencies")
    .select("*")
    .eq("repository_id", parsedParams.data.id)
    .order("dependency_type")
    .order("name");

  if (error) {
    return NextResponse.json({ error: "Failed to load dependencies." }, { status: 500 });
  }
  return NextResponse.json({ dependencies });
}
