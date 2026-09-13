"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(searchParams.get("error"));
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  async function handleGitHubLogin() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
    if (error) setError(error.message);
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6">
      <h1 className="font-display text-lg font-semibold text-text-primary">Log in</h1>
      <p className="mt-1 text-xs text-text-muted">Welcome back. Your repositories are where you left them.</p>

      {error && (
        <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
          {error}
        </div>
      )}

      <button
        onClick={handleGitHubLogin}
        className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface-raised text-sm font-medium hover:bg-surface-hover"
      >
        Continue with GitHub
      </button>

      <div className="my-5 flex items-center gap-3 text-xs text-text-muted">
        <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleEmailLogin}>
        <label className="block text-xs text-text-muted">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="mt-1 h-10 w-full rounded-md border border-border bg-surface-raised px-3 text-sm outline-none focus:border-signal/50"
        />
        <label className="mt-4 block text-xs text-text-muted">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 h-10 w-full rounded-md border border-border bg-surface-raised px-3 text-sm outline-none focus:border-signal/50"
        />
        <button
          type="submit"
          disabled={loading}
          className="mt-5 h-10 w-full rounded-md bg-signal text-sm font-medium text-ink-900 hover:brightness-95"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-4">
      <Suspense fallback={<div className="text-sm text-text-muted">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}