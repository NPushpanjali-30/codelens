"use client";

import { FileCode2, Sparkles, User, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ChatMessage } from "@/types";

export function ChatMessageBubble({
  message,
  onViewSource,
}: {
  message: ChatMessage;
  onViewSource: (source: ChatMessage["sources"][number]) => void;
}) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
          isUser ? "border-border bg-surface-raised" : "border-signal/30 bg-signal-soft"
        }`}
      >
        {isUser ? <User className="h-3.5 w-3.5 text-text-muted" /> : <Sparkles className="h-3.5 w-3.5 text-signal" />}
      </div>

      <div className={`max-w-2xl ${isUser ? "text-right" : ""}`}>
        <div
          className={`inline-block rounded-lg border px-4 py-3 text-left text-sm leading-relaxed ${
            isUser
              ? "border-border bg-surface-raised text-text-primary"
              : "border-border bg-surface text-text-primary"
          }`}
        >
          <p className="whitespace-pre-wrap">{message.message}</p>
        </div>

        {!isUser && message.sources.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.sources.map((source, i) => (
              <button
                key={i}
                onClick={() => onViewSource(source)}
                className="flex items-center gap-1.5 rounded-md border border-border bg-surface-raised px-2 py-1 text-[11px] font-mono text-text-muted hover:border-signal/40 hover:text-signal"
              >
                <FileCode2 className="h-3 w-3" />
                {source.filePath}
                <span className="text-text-dim">
                  L{source.startLine}–{source.endLine}
                </span>
                <ArrowRight className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}

        {!isUser && message.sources.length === 0 && (
          <div className="mt-2">
            <Badge tone="amber">Insufficient repository evidence</Badge>
          </div>
        )}
      </div>
    </div>
  );
}
