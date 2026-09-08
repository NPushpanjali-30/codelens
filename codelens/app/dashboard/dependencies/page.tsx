"use client";

import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useSelectedRepository } from "@/hooks/use-selected-repository";
import type { Dependency } from "@/types";

export default function DependenciesPage() {
  const { repositoryId, repositoryName, hydrated } = useSelectedRepository();
  const [loading, setLoading] = useState(true);
  const [deps, setDeps] = useState<Dependency[]>([]);

  useEffect(() => {
    if (!hydrated) return;
    if (!repositoryId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/repositories/${repositoryId}/dependencies`)
      .then((res) => (res.ok ? res.json() : { dependencies: [] }))
      .then((data) => {
        const mapped: Dependency[] = (data.dependencies ?? []).map((d: any) => ({
          id: d.id,
          repositoryId: d.repository_id,
          name: d.name,
          version: d.version,
          dependencyType: d.dependency_type,
          sourceFile: d.source_file,
        }));
        setDeps(mapped);
      })
      .finally(() => setLoading(false));
  }, [repositoryId, hydrated]);

  const prod = deps.filter((d) => d.dependencyType === "production");
  const dev = deps.filter((d) => d.dependencyType === "development");

  return (
    <div>
      <Topbar title="Dependencies" description="Parsed from package.json and lockfiles" repoName={repositoryName} />

      <div className="p-6">
        {loading ? (
          <Skeleton className="h-64" />
        ) : deps.length === 0 ? (
          <EmptyState
            icon={Package}
            title={repositoryId ? "No dependencies parsed" : "No repository selected"}
            description={
              repositoryId
                ? "This repository doesn't have a recognizable package.json, or it has no dependencies listed."
                : "Analyze a repository and click Open on it from the Repositories tab to see its production and development dependencies."
            }
          />
        ) : (
          <Tabs defaultValue="production">
            <TabsList>
              <TabsTrigger value="production">Production ({prod.length})</TabsTrigger>
              <TabsTrigger value="development">Development ({dev.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="production">
              <DepTable deps={prod} />
            </TabsContent>
            <TabsContent value="development">
              <DepTable deps={dev} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

function DepTable({ deps }: { deps: Dependency[] }) {
  if (deps.length === 0) {
    return <p className="px-1 py-6 text-center text-xs text-text-muted">None in this category.</p>;
  }
  return (
    <Card>
      <div className="divide-y divide-border">
        {deps.map((dep) => (
          <div key={dep.id} className="flex items-center justify-between px-4 py-2.5">
            <span className="font-mono text-sm">{dep.name}</span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-text-muted">{dep.version}</span>
              <Badge tone="neutral">{dep.sourceFile}</Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}