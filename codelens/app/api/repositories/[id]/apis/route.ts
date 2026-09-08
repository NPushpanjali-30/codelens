import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { repositoryIdParamSchema } from "@/lib/security/validation";

// GET /api/repositories/[id]/apis
// api_information is stored as JSONB on the analyses row (see /api/analyze),
// populated by the static route-handler scan in lib/analyzer/api-routes.ts.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const parsedParams = repositoryIdParamSchema.safeParse(params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid repository id." }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data: analysis, error } = await supabase
    .from("analyses")
    .select("api_information")
    .eq("repository_id", parsedParams.data.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to load API information." }, { status: 500 });
  }
  return NextResponse.json({ apiRoutes: analysis?.api_information ?? [] });
}
