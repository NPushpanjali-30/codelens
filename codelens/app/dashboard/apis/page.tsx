"use client";

import { useEffect, useState } from "react";
import { Webhook, Lock, Unlock } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useSelectedRepository } from "@/hooks/use-selected-repository";
import type { ApiRoute } from "@/types";
import { cn } from "@/utils/cn";

const methodTone: Record<ApiRoute["method"], "signal" | "amber" | "danger" | "neutral"> = {
  GET: "signal",
  POST: "amber",
  PUT: "amber",
  PATCH: "amber",
  DELETE: "danger",
};

export default function ApisPage() {
  const { repositoryId, repositoryName, hydrated } = useSelectedRepository();
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<ApiRoute[]>([]);

  useEffect(() => {
    if (!hydrated) return;
    if (!repositoryId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/repositories/${repositoryId}/apis`)
      .then((res) => (res.ok ? res.json() : { apiRoutes: [] }))
      .then((data) => setRoutes(data.apiRoutes ?? []))
      .finally(() => setLoading(false));
  }, [repositoryId, hydrated]);

  return (
    <div>
      <Topbar title="APIs" description="Endpoints detected from the repository's route handlers" repoName={repositoryName} />

      <div className="p-6">
        {loading ? (
          <Skeleton className="h-64" />
        ) : routes.length === 0 ? (
          <EmptyState
            icon={Webhook}
            title={repositoryId ? "No API routes detected" : "No repository selected"}
            description={
              repositoryId
                ? "CodeLens didn't find any Next.js route handlers (app/**/route.ts) in this repository."
                : "Analyze a repository and click Open on it from the Repositories tab. CodeLens lists its HTTP endpoints with method, source file, and whether it looks auth-protected."
            }
          />
        ) : (
          <Card>
            <div className="divide-y divide-border">
              {routes.map((route) => (
                <div key={route.endpoint + route.method} className="flex items-center gap-4 px-4 py-3">
                  <Badge tone={methodTone[route.method]} className="w-16 justify-center">
                    {route.method}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-sm">{route.endpoint}</p>
                    <p className="truncate text-xs text-text-muted">{route.description}</p>
                  </div>
                  <span className="hidden shrink-0 font-mono text-[11px] text-text-dim sm:block">{route.file}</span>
                  <span
                    className={cn(
                      "flex shrink-0 items-center gap-1 text-[11px]",
                      route.requiresAuth ? "text-amber" : "text-text-dim"
                    )}
                  >
                    {route.requiresAuth ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                    {route.requiresAuth ? "Auth" : "Public"}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}