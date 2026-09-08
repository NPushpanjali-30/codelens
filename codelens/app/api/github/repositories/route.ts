import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getStoredGitHubToken } from "@/lib/github/oauth";
import { listUserRepositories, GitHubApiError } from "@/lib/github/client";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

// GET /api/github/repositories
// Lists the user's GitHub repos live from the GitHub API, and upserts each
// one into the `repositories` table so every repo has a real DB uuid to use
// with /api/analyze (GitHub's numeric repo id is never a valid uuid).
export async function GET() {
  const { user, response } = await requireUser();
  if (!user) return response;

  const token = await getStoredGitHubToken(user.id);
  if (!token) {
    return NextResponse.json({ error: "GitHub not connected" }, { status: 401 });
  }

  try {
    const githubRepos = await listUserRepositories(token);
    const admin = createSupabaseAdminClient();

    // Upsert every repo GitHub returns so each one has a stable Supabase uuid.
    // Existing analyzed/analysis_status flags are preserved because we only
    // set them on conflict for the metadata columns, not the status columns.
    const { data: upserted, error: upsertError } = await admin
      .from("repositories")
      .upsert(
        githubRepos.map((repo) => ({
          user_id: user.id,
          github_repo_id: repo.id,
          name: repo.name,
          full_name: repo.full_name,
          description: repo.description,
          owner: repo.owner.login,
          default_branch: repo.default_branch,
          language: repo.language,
          github_url: repo.html_url,
          is_private: repo.private,
          stars: repo.stargazers_count,
          updated_at_github: repo.updated_at,
        })),
        { onConflict: "user_id,github_repo_id", ignoreDuplicates: false }
      )
      .select("id, github_repo_id, analyzed, analysis_status");

    if (upsertError) throw upsertError;

    const byGithubId = new Map((upserted ?? []).map((r: any) => [r.github_repo_id, r]));

    const repositories = githubRepos.map((repo) => {
      const stored = byGithubId.get(repo.id);
      return {
        id: stored?.id ?? repo.id.toString(),
        githubRepoId: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        owner: repo.owner.login,
        defaultBranch: repo.default_branch,
        language: repo.language,
        githubUrl: repo.html_url,
        private: repo.private,
        stars: repo.stargazers_count,
        updatedAtGithub: repo.updated_at,
        analyzed: stored?.analyzed ?? false,
        analysisStatus: stored?.analysis_status ?? "idle",
      };
    });

    return NextResponse.json({ repositories });
  } catch (err) {
    if (err instanceof GitHubApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Failed to list GitHub repositories:", err);
    return NextResponse.json({ error: "Failed to load repositories from GitHub." }, { status: 500 });
  }
}