"use client";

import Link from "next/link";
import { ChevronDown, Bell } from "lucide-react";

export function Topbar({
  title,
  description,
  repoName,
}: {
  title: string;
  description?: string;
  /** Name of the currently selected repository, if any (see useSelectedRepository). */
  repoName?: string | null;
}) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-ink/80 px-6 backdrop-blur">
      <div>
        <h1 className="font-display text-sm font-semibold text-text-primary">{title}</h1>
        {description && <p className="text-xs text-text-muted">{description}</p>}
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/repositories"
          className="flex items-center gap-2 rounded-md border border-border bg-surface-raised px-3 py-1.5 text-xs text-text-muted hover:text-text-primary"
        >
          {repoName ? <span className="font-mono text-text-primary">{repoName}</span> : "No repository selected"}
          <ChevronDown className="h-3.5 w-3.5" />
        </Link>
        <button className="rounded-md border border-border bg-surface-raised p-1.5 text-text-muted hover:text-text-primary">
          <Bell className="h-4 w-4" />
        </button>
        <div className="h-7 w-7 rounded-full bg-surface-raised border border-border" />
      </div>
    </header>
  );
}