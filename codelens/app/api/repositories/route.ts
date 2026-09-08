import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/security/validation";

// GET /api/repositories — repositories the user has previously selected/saved,
// as opposed to /api/github/repositories which lists everything on GitHub.
export async function GET() {
  const { user, response } = await requireUser();
  if (!user) return response;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("repositories")
    .select("*")
    .eq("user_id", user.id) // redundant with RLS, kept explicit for clarity
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to load repositories." }, { status: 500 });
  }
  return NextResponse.json({ repositories: data });
}

const createRepositorySchema = z.object({
  githubRepoId: z.number(),
  name: z.string(),
  fullName: z.string(),
  description: z.string().nullable().optional(),
  owner: z.string(),
  defaultBranch: z.string(),
  language: z.string().nullable().optional(),
  githubUrl: z.string().url(),
  isPrivate: z.boolean(),
  stars: z.number().optional(),
  updatedAtGithub: z.string().optional(),
});

// POST /api/repositories — saves a repository the user picked from their
// GitHub list, so it can be analyzed and tracked.
export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const { data, error } = await parseJsonBody(request, createRepositorySchema);
  if (!data) return NextResponse.json({ error }, { status: 400 });

  const supabase = createSupabaseServerClient();
  const { data: repo, error: dbError } = await supabase
    .from("repositories")
    .upsert(
      {
        user_id: user.id,
        github_repo_id: data.githubRepoId,
        name: data.name,
        full_name: data.fullName,
        description: data.description ?? null,
        owner: data.owner,
        default_branch: data.defaultBranch,
        language: data.language ?? null,
        github_url: data.githubUrl,
        is_private: data.isPrivate,
        stars: data.stars ?? 0,
        updated_at_github: data.updatedAtGithub ?? null,
      },
      { onConflict: "user_id,github_repo_id" }
    )
    .select()
    .single();

  if (dbError) {
    return NextResponse.json({ error: "Failed to save repository." }, { status: 500 });
  }
  return NextResponse.json({ repository: repo }, { status: 201 });
}
