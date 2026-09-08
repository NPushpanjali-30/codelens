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
  const { data: components, error } = await supabase
    .from("architecture_components")
    .select("*")
    .eq("repository_id", parsedParams.data.id);

  if (error) {
    return NextResponse.json({ error: "Failed to load architecture." }, { status: 500 });
  }
  return NextResponse.json({ components });
}
