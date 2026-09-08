import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken, storeGitHubToken } from "@/lib/github/oauth";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    return NextResponse.redirect(`${origin}/dashboard/repositories?error=github_denied`);
  }
  if (!code || !state) {
    return NextResponse.redirect(`${origin}/dashboard/repositories?error=missing_code`);
  }

  let userId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
    userId = decoded.userId;
    if (!userId) throw new Error("no userId in state");
  } catch {
    return NextResponse.redirect(`${origin}/dashboard/repositories?error=invalid_state`);
  }

  try {
    const redirectUri = new URL("/api/github/callback", request.url).toString();
    const token = await exchangeCodeForToken(code, redirectUri);

    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    });
    const githubUser = await userRes.json();

    await storeGitHubToken(userId, token, githubUser.login ?? "unknown");
  } catch (err) {
    console.error("GitHub OAuth callback failed:", err);
    return NextResponse.redirect(`${origin}/dashboard/repositories?error=connection_failed`);
  }

  return NextResponse.redirect(`${origin}/dashboard/repositories?connected=1`);
}
