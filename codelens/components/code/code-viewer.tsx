"use client";

import { cn } from "@/utils/cn";

export function CodeViewer({
  content,
  language,
  highlightRange,
}: {
  content: string;
  language?: string | null;
  highlightRange?: { start: number; end: number };
}) {
  const lines = content.split("\n");

  return (
    <div className="overflow-auto rounded-md border border-border bg-ink">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="term-dots flex gap-1.5">
          <span className="bg-danger/60" />
          <span className="bg-amber/60" />
          <span className="bg-signal/60" />
        </div>
        {language && <span className="font-mono text-[11px] text-text-dim">{language}</span>}
      </div>
      <pre className="min-w-full text-xs leading-relaxed">
        <code>
          {lines.map((line, i) => {
            const lineNo = i + 1;
            const highlighted =
              highlightRange && lineNo >= highlightRange.start && lineNo <= highlightRange.end;
            return (
              <div
                key={i}
                className={cn(
                  "flex px-3",
                  highlighted && "bg-signal-soft border-l-2 border-signal"
                )}
              >
                <span className="mr-4 select-none text-text-dim w-8 text-right font-mono-nums">
                  {lineNo}
                </span>
                <span className="font-mono text-text-primary whitespace-pre">{line || " "}</span>
              </div>
            );
          })}
        </code>
      </pre>
    </div>
  );
}
