"use client";

import { useEffect, useState } from "react";
import { Network } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useSelectedRepository } from "@/hooks/use-selected-repository";
import type { ArchitectureComponent } from "@/types";

export default function ArchitecturePage() {
  const { repositoryId, repositoryName, hydrated } = useSelectedRepository();
  const [loading, setLoading] = useState(true);
  const [components, setComponents] = useState<ArchitectureComponent[]>([]);
  const [selected, setSelected] = useState<ArchitectureComponent | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!repositoryId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/repositories/${repositoryId}/architecture`)
      .then((res) => (res.ok ? res.json() : { components: [] }))
      .then((data) => {
        const mapped: ArchitectureComponent[] = (data.components ?? []).map((c: any) => ({
          id: c.id,
          repositoryId: c.repository_id,
          componentName: c.component_name,
          componentType: c.component_type,
          description: c.description,
          relatedFiles: c.related_files ?? [],
        }));
        setComponents(mapped);
      })
      .finally(() => setLoading(false));
  }, [repositoryId, hydrated]);

  return (
    <div>
      <Topbar
        title="Architecture"
        description="Generated from the analyzed repository — nothing here is hardcoded"
        repoName={repositoryName}
      />

      <div className="p-6">
        {loading ? (
          <Skeleton className="h-64" />
        ) : components.length === 0 ? (
          <EmptyState
            icon={Network}
            title={repositoryId ? "No architecture generated yet" : "No repository selected"}
            description={
              repositoryId
                ? "This repository hasn't produced architecture components yet — try re-analyzing it."
                : "Analyze a repository from the Repositories tab, then click Open to make it active. CodeLens will map real components — frontend, API layer, database, auth, external services — from what it finds in the code."
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardBody>
                <div className="flex flex-wrap items-center justify-center gap-8 py-10">
                  {components.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelected(c)}
                      className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface-raised px-5 py-4 text-center transition-colors hover:border-signal/50"
                    >
                      <span className="font-mono text-[11px] text-signal">{c.componentType}</span>
                      <span className="font-display text-sm font-semibold">{c.componentName}</span>
                    </button>
                  ))}
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                {selected ? (
                  <div>
                    <h3 className="font-display text-sm font-semibold">{selected.componentName}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-text-muted">{selected.description}</p>
                    {selected.relatedFiles.length > 0 && (
                      <>
                        <p className="mt-4 text-[11px] font-medium uppercase tracking-wide text-text-dim">
                          Related files
                        </p>
                        <ul className="mt-2 space-y-1 font-mono text-[11px] text-text-muted">
                          {selected.relatedFiles.map((f) => (
                            <li key={f}>{f}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-text-muted">
                    Select a component to see its description and related files.
                  </p>
                )}
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}