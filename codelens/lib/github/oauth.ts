import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";

/**
 * Builds the GitHub authorization URL. This is a separate GitHub OAuth App
 * (repo-read scope) from Supabase's own "Sign in with GitHub" provider —
 * this one is specifically for reading repository contents, and its token
 * is stored server-side against the user's profile, never in a client cookie.
 */
export function buildGitHubAuthorizeUrl(state: string, redirectUri: string) {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    redirect_uri: redirectUri,
    scope: "repo read:user",
    state,
  });
  return `${GITHUB_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string, redirectUri: string) {
  const res = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error_description ?? "Failed to exchange GitHub OAuth code.");
  }
  return data.access_token as string;
}

/** Persists the GitHub token against the signed-in user's profile row. */
export async function storeGitHubToken(userId: string, token: string, username: string) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ github_access_token: token, github_username: username })
    .eq("user_id", userId);
  if (error) throw error;
}

/**
 * Reads back the signed-in user's stored GitHub token. Uses the admin
 * client because github_access_token is intentionally not selectable
 * under RLS from the browser — only server code should ever read it.
 */
export async function getStoredGitHubToken(userId: string): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("github_access_token")
    .eq("user_id", userId)
    .single();
  if (error || !data?.github_access_token) return null;
  return data.github_access_token as string;
}

export async function getCurrentUserId(): Promise<string | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
