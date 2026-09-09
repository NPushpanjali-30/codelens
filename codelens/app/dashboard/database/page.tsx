"use client";

import { useEffect, useState } from "react";
import { Database } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useSelectedRepository } from "@/hooks/use-selected-repository";

export default function DatabasePage() {
  const { repositoryId, repositoryName, hydrated } = useSelectedRepository();
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<any>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!repositoryId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/repositories/${repositoryId}`)
      .then((res) => (res.ok ? res.json() : { analysis: null }))
      .then((data) => setAnalysis(data.analysis ?? null))
      .finally(() => setLoading(false));
  }, [repositoryId, hydrated]);

  const importantFiles: { path: string; reason: string }[] = analysis?.important_files ?? [];
  const dbFiles = importantFiles.filter((f) =>
    /prisma|schema|migration|supabase|database|db\.|models?\//i.test(f.path)
  );

  return (
    <div>
      <Topbar
        title="Database"
        description="Database technology and access patterns found in the repository"
        repoName={repositoryName}
      />

      <div className="p-6">
        {loading ? (
          <Skeleton className="h-64" />
        ) : !analysis ? (
          <EmptyState
            icon={Database}
            title={repositoryId ? "No database information yet" : "No repository selected"}
            description={
              repositoryId
                ? "This repository hasn't been analyzed yet."
                : "Analyze a repository and click Open on it from the Repositories tab. CodeLens reads configuration files, ORM models, and connection code to summarize what it can verify — it never invents tables or relationships that aren't in the repository."
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader terminal title="Detected technology & access patterns" />
              <CardBody className="whitespace-pre-wrap text-xs leading-relaxed text-text-muted">
                {analysis.database_information || "The AI analysis did not report any database usage for this repository."}
              </CardBody>
            </Card>
            <Card>
              <CardHeader terminal title="Likely database-related files" />
              <CardBody>
                {dbFiles.length === 0 ? (
                  <p className="text-xs text-text-muted">No files matched common database/ORM naming patterns.</p>
                ) : (
                  <ul className="space-y-2">
                    {dbFiles.map((f) => (
                      <li key={f.path} className="text-xs">
                        <span className="font-mono text-text-primary">{f.path}</span>
                        <p className="mt-0.5 text-text-muted">{f.reason}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}