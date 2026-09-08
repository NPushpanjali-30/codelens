import { HTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  title,
  subtitle,
  right,
  terminal = false,
}: {
  className?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  terminal?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b border-border px-4 py-3",
        className
      )}
    >
      <div className="min-w-0">
        {terminal && (
          <div className="term-dots mb-2 flex gap-1.5">
            <span className="bg-danger/60" />
            <span className="bg-amber/60" />
            <span className="bg-signal/60" />
          </div>
        )}
        <h3 className="truncate font-display text-sm font-semibold text-text-primary">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-0.5 truncate text-xs text-text-muted">{subtitle}</p>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...props} />;
}
