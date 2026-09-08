import { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-16 text-center">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-raised">
        <Icon className="h-5 w-5 text-text-dim" />
      </div>
      <h3 className="font-display text-sm font-semibold text-text-primary">{title}</h3>
      <p className="mt-1.5 max-w-sm text-xs text-text-muted">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
