import { Star, Lock, Globe, ExternalLink, ScanSearch, LayoutDashboard } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Repository } from "@/types";

export function RepoCard({
  repo,
  onAnalyze,
  onOpen,
}: {
  repo: Repository;
  onAnalyze?: (repo: Repository) => void;
  /** Marks this repository as the active one for Overview/Architecture/Files/Chat/etc. */
  onOpen?: (repo: Repository) => void;
}) {
  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-display text-sm font-semibold">{repo.name}</h3>
            {repo.private ? (
              <Lock className="h-3 w-3 shrink-0 text-text-dim" />
            ) : (
              <Globe className="h-3 w-3 shrink-0 text-text-dim" />
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-text-muted">{repo.owner}/{repo.name}</p>
        </div>
        <a
          href={repo.githubUrl}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-text-dim hover:text-text-primary"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <p className="mt-3 line-clamp-2 flex-1 text-xs leading-relaxed text-text-muted">
        {repo.description || "No description provided."}
      </p>

      <div className="mt-4 flex items-center gap-2">
        {repo.language && <Badge tone="signal">{repo.language}</Badge>}
        <span className="flex items-center gap-1 text-[11px] text-text-dim">
          <Star className="h-3 w-3" /> {repo.stars}
        </span>
        <span className="text-[11px] text-text-dim">
          Updated {new Date(repo.updatedAtGithub).toLocaleDateString()}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <StatusBadge status={repo.analysisStatus} />
        <div className="flex items-center gap-2">
          {repo.analyzed && (
            <Button size="sm" variant="secondary" onClick={() => onOpen?.(repo)}>
              <LayoutDashboard className="h-3.5 w-3.5" />
              Open
            </Button>
          )}
          <Button size="sm" variant={repo.analyzed ? "secondary" : "primary"} onClick={() => onAnalyze?.(repo)}>
            <ScanSearch className="h-3.5 w-3.5" />
            {repo.analyzed ? "Re-analyze" : "Analyze"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: Repository["analysisStatus"] }) {
  switch (status) {
    case "complete":
      return <Badge tone="signal">Analyzed</Badge>;
    case "analyzing":
      return <Badge tone="amber">Analyzing…</Badge>;
    case "pending":
      return <Badge tone="amber">Queued</Badge>;
    case "failed":
      return <Badge tone="danger">Failed</Badge>;
    default:
      return <Badge tone="neutral">Not analyzed</Badge>;
  }
}