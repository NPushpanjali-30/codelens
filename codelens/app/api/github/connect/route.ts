import { NextRequest, NextResponse } from "next/server";
import { buildGitHubAuthorizeUrl, getCurrentUserId } from "@/lib/github/oauth";

// Starts the GitHub OAuth flow used specifically to grant CodeLens read
// access to repository contents (separate from Supabase's own auth).
export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const redirectUri = new URL("/api/github/callback", request.url).toString();
  // `state` binds the callback to this user so the token lands on the right profile.
  const state = Buffer.from(JSON.stringify({ userId, nonce: crypto.randomUUID() })).toString("base64url");

  const authorizeUrl = buildGitHubAuthorizeUrl(state, redirectUri);
  return NextResponse.redirect(authorizeUrl);
}
