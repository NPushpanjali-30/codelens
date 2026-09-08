"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Network,
  FolderTree,
  Webhook,
  Database,
  Package,
  MessageSquareCode,
  ScanSearch,
  Settings,
  GitBranch,
} from "lucide-react";
import { cn } from "@/utils/cn";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid },
  { href: "/dashboard/repositories", label: "Repositories", icon: GitBranch },
  { href: "/dashboard/architecture", label: "Architecture", icon: Network },
  { href: "/dashboard/files", label: "Files", icon: FolderTree },
  { href: "/dashboard/apis", label: "APIs", icon: Webhook },
  { href: "/dashboard/database", label: "Database", icon: Database },
  { href: "/dashboard/dependencies", label: "Dependencies", icon: Package },
  { href: "/dashboard/chat", label: "AI Chat", icon: MessageSquareCode },
  { href: "/dashboard/analysis", label: "Analysis", icon: ScanSearch },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-56 flex-col border-r border-border bg-surface md:flex">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-signal text-ink-900">
          <GitBranch className="h-3.5 w-3.5" strokeWidth={2.5} />
        </div>
        <span className="font-display text-sm font-semibold">CodeLens</span>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-4">
        {nav.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-signal-soft text-signal"
                  : "text-text-muted hover:bg-surface-hover hover:text-text-primary"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-2">
        <Link
          href="/dashboard/settings"
          className={cn(
            "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
            pathname === "/dashboard/settings"
              ? "bg-signal-soft text-signal"
              : "text-text-muted hover:bg-surface-hover hover:text-text-primary"
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
