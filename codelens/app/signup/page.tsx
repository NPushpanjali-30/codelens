"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GitBranch, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name }, emailRedirectTo: `${window.location.origin}/api/auth/callback` },
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Check your inbox to confirm your email.");
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  async function handleGithub() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-signal text-ink-900">
            <GitBranch className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <span className="font-display text-sm font-semibold">CodeLens</span>
        </Link>

        <div className="rounded-lg border border-border bg-surface p-6">
          <h1 className="font-display text-lg font-semibold">Create an account</h1>
          <p className="mt-1 text-xs text-text-muted">Connect a repo and get a grounded map of it in minutes.</p>

          <Button variant="secondary" className="mt-5 w-full" onClick={handleGithub} type="button">
            <Github className="h-4 w-4" />
            Continue with GitHub
          </Button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] text-text-dim">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>
            <Button type="submit" className="w-full" loading={loading}>
              Create account
            </Button>
          </form>
        </div>

        <p className="mt-5 text-center text-xs text-text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-signal hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
