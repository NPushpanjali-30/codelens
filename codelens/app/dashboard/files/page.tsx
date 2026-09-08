"use client";

import { useEffect, useState } from "react";
import { Search, FolderTree } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { FileTree } from "@/components/code/file-tree";
import { CodeViewer } from "@/components/code/code-viewer";
import { useSelectedRepository } from "@/hooks/use-selected-repository";
import type { RepositoryFile } from "@/types";

export default function FilesPage() {
  const { repositoryId, repositoryName, hydrated } = useSelectedRepository();
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<RepositoryFile[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<RepositoryFile | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!repositoryId) {
      setLoading(false);
      return;
    }
    setLoading(true);
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
      })
      .finally(() => setLoading(false));
  }, [repositoryId, hydrated]);

  const filtered = files.filter((f) => f.filePath.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <Topbar title="Files" description="Browse the analyzed repository like a code editor" repoName={repositoryName} />

      <div className="p-6">
        {loading ? (
          <Skeleton className="h-64" />
        ) : files.length === 0 ? (
          <EmptyState
            icon={FolderTree}
            title={repositoryId ? "No files indexed yet" : "No repository selected"}
            description={
              repositoryId
                ? "This repository hasn't been analyzed yet, or the analysis found no files."
                : "Analyze a repository and click Open on it from the Repositories tab to see its folder tree, important files, and syntax-highlighted contents here. Secrets and .env files are always excluded."
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <Card className="lg:col-span-1">
              <div className="border-b border-border p-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-dim" />
                  <Input
                    className="h-8 pl-8 text-xs"
                    placeholder="Search files…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="max-h-[70vh] overflow-y-auto p-2">
                <FileTree files={filtered} selectedPath={selected?.filePath} onSelect={setSelected} />
              </div>
            </Card>

            <div className="lg:col-span-3">
              {selected ? (
                <div>
                  <p className="mb-2 font-mono text-xs text-text-muted">{selected.filePath}</p>
                  <CodeViewer content={selected.content ?? ""} language={selected.language} />
                </div>
              ) : (
                <Card className="flex h-64 items-center justify-center">
                  <p className="text-xs text-text-muted">Select a file to view its contents.</p>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}