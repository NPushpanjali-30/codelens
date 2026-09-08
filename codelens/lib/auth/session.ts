import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Resolves the authenticated user for a Route Handler, or returns null.
 * Never trust a userId passed in the request body — always derive it
 * from the session.
 */
export async function getAuthedUser() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

/**
 * Shorthand for Route Handlers that require auth. Returns a 401
 * NextResponse if there's no session, otherwise the user object.
 */
export async function requireUser() {
  const user = await getAuthedUser();
  if (!user) {
    return {
      user: null as null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { user, response: null as null };
}
