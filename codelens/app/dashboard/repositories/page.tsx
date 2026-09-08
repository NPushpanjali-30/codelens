"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Github, RefreshCw } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { RepoCard } from "@/components/repository/repo-card";
import { useSelectedRepository } from "@/hooks/use-selected-repository";
import type { Repository } from "@/types";
import toast from "react-hot-toast";

export default function RepositoriesPage() {
  const router = useRouter();
  const { setRepo } = useSelectedRepository();
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [repos, setRepos] = useState<Repository[]>([]);

  async function loadRepos() {
    setLoading(true);
    try {
      const res = await fetch("/api/github/repositories");
      if (res.status === 401) {
        setConnected(false);
        return;
      }
      if (!res.ok) throw new Error("Failed to load repositories");
      const data = await res.json();
      setConnected(true);
      setRepos(data.repositories ?? []);
    } catch (err) {
      toast.error("Could not load your GitHub repositories.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRepos();
  }, []);

  async function handleAnalyze(repo: Repository) {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repositoryId: repo.id }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Could not start analysis for this repository.");
      return;
    }
    toast.success(`${repo.name} analyzed.`);
    // Automatically make the freshly analyzed repo the active one so the
    // user lands somewhere useful instead of having to hunt for a selector.
    setRepo({ id: repo.id, name: repo.name });
    loadRepos();
  }

  function handleOpen(repo: Repository) {
    setRepo({ id: repo.id, name: repo.name });
    toast.success(`Now viewing ${repo.name}.`);
    router.push("/dashboard");
  }

  return (
    <div>
      <Topbar title="Repositories" description="Connect GitHub and choose a repository to analyze" />

      <div className="p-6">
        <div className="mb-5 flex items-center justify-between">
          <p className="text-xs text-text-muted">
            {connected ? `${repos.length} repositories` : "Not connected to GitHub"}
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={loadRepos} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <a href="/api/github/connect">
              <Button size="sm">
                <Github className="h-3.5 w-3.5" />
                {connected ? "Reconnect GitHub" : "Connect GitHub"}
              </Button>
            </a>
          </div>
        </div>

        {loading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-44" />
            ))}
          </div>
        )}

        {!loading && !connected && (
          <EmptyState
            icon={Github}
            title="GitHub isn't connected yet"
            description="Authorize CodeLens to read your repository list. Access tokens stay server-side and are never sent to the browser."
            action={
              <a href="/api/github/connect">
                <Button size="sm">Connect GitHub</Button>
              </a>
            }
          />
        )}

        {!loading && connected && repos.length === 0 && (
          <EmptyState
            icon={Github}
            title="No repositories found"
            description="We couldn't find any repositories on this GitHub account, or the app hasn't been granted access to any."
          />
        )}

        {!loading && connected && repos.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {repos.map((repo) => (
              <RepoCard key={repo.id} repo={repo} onAnalyze={handleAnalyze} onOpen={handleOpen} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}