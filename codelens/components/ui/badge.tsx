import { cn } from "@/utils/cn";

type Tone = "neutral" | "signal" | "amber" | "danger";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-raised text-text-muted border-border",
  signal: "bg-signal-soft text-signal border-signal/30",
  amber: "bg-amber-soft text-amber border-amber/30",
  danger: "bg-danger-soft text-danger border-danger/30",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium font-mono",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
