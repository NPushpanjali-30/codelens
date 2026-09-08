"use client";

import { useState, useRef, useEffect } from "react";
import { Send, MessageSquareCode, X } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ChatMessageBubble } from "@/components/chat/chat-message";
import { CodeViewer } from "@/components/code/code-viewer";
import { useSelectedRepository } from "@/hooks/use-selected-repository";
import type { ChatMessage, SourceReference, RepositoryFile } from "@/types";
import toast from "react-hot-toast";

const suggestedQuestions = [
  "Where is authentication handled?",
  "Where are the API routes defined?",
  "What database does this project use?",
  "How is the frontend structured?",
];

export default function ChatPage() {
  const { repositoryId, repositoryName, hydrated } = useSelectedRepository();
  const [analyzed, setAnalyzed] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [activeSource, setActiveSource] = useState<SourceReference | null>(null);
  const [activeFileContent, setActiveFileContent] = useState<string>("");
  const [files, setFiles] = useState<RepositoryFile[]>([]);
  const sessionIdRef = useRef<string | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Check the repository is actually analyzed, and preload its files so
  // "View Code" on a citation can show real file content without a second
  // round trip per click.
  useEffect(() => {
    if (!hydrated) return;
    sessionIdRef.current = undefined;
    setMessages([]);
    if (!repositoryId) {
      setAnalyzed(null);
      return;
    }
    fetch(`/api/repositories/${repositoryId}`)
      .then((res) => (res.ok ? res.json() : { repository: null }))
      .then((data) => setAnalyzed(Boolean(data.repository?.analyzed)));

    fetch(`/api/repositories/${repositoryId}/files`)
      .then((res) => (res.ok ? res.json() : { files: [] }))
      .then((data) => {
        const mapped: RepositoryFile[] = (data.files ?? []).map((f: any) => ({
          id: f.id,
          repositoryId: f.repository_id,
          filePath: f.file_path,
          fileName: f.file_name,
          extension: f.extension,
          language: f.language,
          fileSize: f.file_size,
          content: f.content,
          isImportant: f.is_important,
          createdAt: f.created_at,
        }));
        setFiles(mapped);
      });
  }, [repositoryId, hydrated]);

  function handleViewSource(source: SourceReference) {
    setActiveSource(source);
    const normalize = (p: string) => p.replace(/^\.\//, "").toLowerCase();
    const target = normalize(source.filePath);
    const match =
      files.find((f) => f.filePath === source.filePath) ??
      files.find((f) => {
        const fp = normalize(f.filePath);
        return fp.endsWith(target) || target.endsWith(fp);
      });
    setActiveFileContent(match?.content ?? "// File content not available.");
  }

  async function sendMessage(text: string) {
    if (!text.trim() || sending || !repositoryId) return;
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sessionId: sessionIdRef.current ?? "pending",
      role: "user",
      message: text,
      sources: [],
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repositoryId,
          sessionId: sessionIdRef.current,
          question: text,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "chat failed");

      sessionIdRef.current = data.sessionId;
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        sessionId: data.sessionId,
        role: "assistant",
        message: data.answer,
        sources: data.sources ?? [],
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      toast.error(err?.message ?? "Couldn't reach the AI service. Try again.");
    } finally {
      setSending(false);
    }
  }

  const repositorySelected = Boolean(repositoryId) && analyzed === true;

  return (
    <div className="flex h-screen flex-col">
      <Topbar
        title="AI Chat"
        description="Ask about the analyzed repository — every answer cites its sources"
        repoName={repositoryName}
      />

      {!repositoryId ? (
        <div className="p-6">
          <EmptyState
            icon={MessageSquareCode}
            title="No repository selected"
            description="Analyze a repository and click Open on it from the Repositories tab first."
          />
        </div>
      ) : analyzed === false ? (
        <div className="p-6">
          <EmptyState
            icon={MessageSquareCode}
            title="This repository hasn't been analyzed yet"
            description="Go to Repositories and click Analyze on it before chatting."
          />
        </div>
      ) : !repositorySelected ? (
        <div className="p-6">
          <EmptyState
            icon={MessageSquareCode}
            title="Loading repository status…"
            description="One moment."
          />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-1 flex-col">
            <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
              {messages.length === 0 && (
                <div className="mx-auto max-w-lg pt-10 text-center">
                  <p className="text-sm text-text-muted">Try asking:</p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {suggestedQuestions.map((q) => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text-muted hover:border-signal/40 hover:text-signal"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m) => (
                <ChatMessageBubble key={m.id} message={m} onViewSource={handleViewSource} />
              ))}

              {sending && (
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-signal" />
                  Retrieving relevant code…
                </div>
              )}
            </div>

            <div className="border-t border-border p-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage(input);
                }}
                className="flex items-center gap-2"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question about this repository…"
                  className="h-10 flex-1 rounded-md border border-border bg-surface-raised px-3 text-sm outline-none focus:border-signal/50"
                />
                <Button type="submit" size="md" disabled={sending}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>

          {activeSource && (
            <div className="hidden w-96 shrink-0 border-l border-border p-4 lg:block">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-mono text-xs text-text-muted">{activeSource.filePath}</p>
                <button onClick={() => setActiveSource(null)} className="text-text-dim hover:text-text-primary">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <CodeViewer
                content={activeFileContent}
                highlightRange={{ start: activeSource.startLine, end: activeSource.endLine }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}