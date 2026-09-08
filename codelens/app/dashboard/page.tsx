"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GitBranch, FileCode2, Webhook, Package, ArrowRight } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSelectedRepository } from "@/hooks/use-selected-repository";

export default function DashboardOverviewPage() {
  const { repositoryId, repositoryName, hydrated } = useSelectedRepository();
  const [loading, setLoading] = useState(true);
  const [repository, setRepository] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [fileCount, setFileCount] = useState<number | null>(null);
  const [depCount, setDepCount] = useState<number | null>(null);
  const [apiCount, setApiCount] = useState<number | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!repositoryId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const [repoRes, filesRes, depsRes, apisRes] = await Promise.all([
          fetch(`/api/repositories/${repositoryId}`),
          fetch(`/api/repositories/${repositoryId}/files`),
          fetch(`/api/repositories/${repositoryId}/dependencies`),
          fetch(`/api/repositories/${repositoryId}/apis`),
        ]);
        if (cancelled) return;

        if (repoRes.ok) {
          const data = await repoRes.json();
          setRepository(data.repository ?? null);
          setAnalysis(data.analysis ?? null);
        }
        if (filesRes.ok) {
          const data = await filesRes.json();
          setFileCount((data.files ?? []).length);
        }
        if (depsRes.ok) {
          const data = await depsRes.json();
          setDepCount((data.dependencies ?? []).length);
        }
        if (apisRes.ok) {
          const data = await apisRes.json();
          setApiCount((data.apiRoutes ?? []).length);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [repositoryId, hydrated]);

  const stats = [
    { label: "Files indexed", value: fileCount ?? "—", icon: FileCode2 },
    { label: "Dependencies", value: depCount ?? "—", icon: Package },
    { label: "API routes", value: apiCount ?? "—", icon: Webhook },
    { label: "Repository", value: repository ? "Connected" : "0", icon: GitBranch },
  ];

  return (
    <div>
      <Topbar
        title="Overview"
        description="Repository status, analysis health, and recent activity"
        repoName={repositoryName}
      />

      <div className="p-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">{s.label}</span>
                <s.icon className="h-3.5 w-3.5 text-text-dim" />
              </div>
              <p className="mt-2 font-display text-2xl font-semibold font-mono-nums">{s.value}</p>
            </Card>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader
              terminal
              title="Analysis status"
              subtitle={repository ? `${repository.full_name} — ${repository.analysis_status}` : "Nothing analyzed yet"}
              right={
                repository && (
                  <Badge tone={repository.analyzed ? "signal" : "neutral"}>{repository.analysis_status}</Badge>
                )
              }
            />
            <CardBody>
              {loading ? (
                <Skeleton className="h-24" />
              ) : !repository ? (
                <EmptyState
                  icon={GitBranch}
                  title="No repository selected"
                  description="Connect your GitHub account, analyze a repository, then click Open on it from the Repositories tab to make it active here."
                  action={
                    <Link href="/dashboard/repositories">
                      <Button size="sm">
                        Go to Repositories
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  }
                />
              ) : !analysis ? (
                <EmptyState
                  icon={GitBranch}
                  title="Repository connected, not analyzed yet"
                  description="Run analysis from the Repositories tab to generate the project overview, architecture, and dependency data."
                  action={
                    <Link href="/dashboard/repositories">
                      <Button size="sm">
                        Go to Repositories
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  }
                />
              ) : (
                <div className="space-y-3 text-sm leading-relaxed text-text-muted">
                  <p>{analysis.project_overview}</p>
                  <Link
                    href="/dashboard/architecture"
                    className="inline-flex items-center gap-1 text-xs text-signal hover:underline"
                  >
                    View full architecture
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader terminal title="Recent activity" />
            <CardBody>
              <p className="text-xs text-text-muted">
                {repository
                  ? `Last updated ${new Date(repository.updated_at).toLocaleString()}.`
                  : "Activity such as analysis runs and chat sessions will show up here once you select a repository."}
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}