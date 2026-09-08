"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Circle, ScanSearch, XCircle } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useSelectedRepository } from "@/hooks/use-selected-repository";
import type { AnalysisStatus } from "@/types";

// Real status only — reflects repositories.analysis_status from the
// database, polled while a run is in progress. No simulated per-step
// checklist, since the backend doesn't stream granular sub-steps.
export default function AnalysisPage() {
  const { repositoryId, repositoryName, hydrated } = useSelectedRepository();
  const [status, setStatus] = useState<AnalysisStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated || !repositoryId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res = await fetch(`/api/repositories/${repositoryId}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        setStatus(data.repository?.analysis_status ?? null);
        setError(data.repository?.analysis_error ?? null);
        setUpdatedAt(data.repository?.updated_at ?? null);

        const stillRunning = data.repository?.analysis_status === "pending" || data.repository?.analysis_status === "analyzing";
        if (stillRunning && !cancelled) {
          timer = setTimeout(poll, 2500);
        }
      } catch {
        // ignore transient network errors while polling
      }
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [repositoryId, hydrated]);

  return (
    <div>
      <Topbar title="Analysis" description="Live status of the current repository analysis run" repoName={repositoryName} />

      <div className="p-6">
        {!repositoryId ? (
          <EmptyState
            icon={ScanSearch}
            title="No repository selected"
            description="Start an analysis from the Repositories tab, then click Open on it to track its status here."
          />
        ) : status === null ? (
          <EmptyState icon={ScanSearch} title="Loading…" description="Fetching this repository's analysis status." />
        ) : (
          <Card className="mx-auto max-w-md">
            <CardHeader
              terminal
              title={statusTitle(status)}
              subtitle={updatedAt ? `Last updated ${new Date(updatedAt).toLocaleString()}` : undefined}
            />
            <CardBody>
              <div className="flex items-center gap-3 text-sm">
                <StatusIcon status={status} />
                <span>{statusDescription(status)}</span>
              </div>
              {status === "failed" && error && (
                <p className="mt-4 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">
                  {error}
                </p>
              )}
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}

function statusTitle(status: AnalysisStatus) {
  switch (status) {
    case "analyzing":
      return "Analyzing repository…";
    case "pending":
      return "Queued for analysis";
    case "complete":
      return "Analysis complete";
    case "failed":
      return "Analysis failed";
    default:
      return "Not yet analyzed";
  }
}

function statusDescription(status: AnalysisStatus) {
  switch (status) {
    case "analyzing":
      return "Scanning files, detecting dependencies and API routes, and generating AI documentation. This can take a minute for larger repos.";
    case "pending":
      return "Waiting to start.";
    case "complete":
      return "Overview, architecture, files, APIs, dependencies, and AI Chat are ready for this repository.";
    case "failed":
      return "The last analysis run didn't complete. See the error below, then try Re-analyze from the Repositories tab.";
    default:
      return "Click Analyze on this repository from the Repositories tab to get started.";
  }
}

function StatusIcon({ status }: { status: AnalysisStatus }) {
  if (status === "complete") return <CheckCircle2 className="h-5 w-5 text-signal" />;
  if (status === "analyzing" || status === "pending") return <Loader2 className="h-5 w-5 animate-spin text-amber" />;
  if (status === "failed") return <XCircle className="h-5 w-5 text-danger" />;
  return <Circle className="h-5 w-5 text-text-dim" />;
}