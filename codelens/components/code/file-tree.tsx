"use client";

import { useState } from "react";
import { ChevronRight, File, Folder, Star } from "lucide-react";
import { cn } from "@/utils/cn";
import type { RepositoryFile } from "@/types";

interface TreeNode {
  name: string;
  path: string;
  isFile: boolean;
  file?: RepositoryFile;
  children: Record<string, TreeNode>;
}

function buildTree(files: RepositoryFile[]): TreeNode {
  const root: TreeNode = { name: "", path: "", isFile: false, children: {} };
  for (const file of files) {
    const parts = file.filePath.split("/");
    let node = root;
    parts.forEach((part, i) => {
      const isFile = i === parts.length - 1;
      const path = parts.slice(0, i + 1).join("/");
      if (!node.children[part]) {
        node.children[part] = { name: part, path, isFile, file: isFile ? file : undefined, children: {} };
      }
      node = node.children[part];
    });
  }
  return root;
}

export function FileTree({
  files,
  selectedPath,
  onSelect,
}: {
  files: RepositoryFile[];
  selectedPath?: string;
  onSelect: (file: RepositoryFile) => void;
}) {
  const tree = buildTree(files);
  return (
    <div className="font-mono text-xs">
      {Object.values(tree.children)
        .sort((a, b) => Number(a.isFile) - Number(b.isFile) || a.name.localeCompare(b.name))
        .map((node) => (
          <TreeItem key={node.path} node={node} depth={0} selectedPath={selectedPath} onSelect={onSelect} />
        ))}
    </div>
  );
}

function TreeItem({
  node,
  depth,
  selectedPath,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  selectedPath?: string;
  onSelect: (file: RepositoryFile) => void;
}) {
  const [open, setOpen] = useState(depth < 1);

  if (node.isFile && node.file) {
    const active = selectedPath === node.path;
    return (
      <button
        onClick={() => onSelect(node.file!)}
        style={{ paddingLeft: depth * 14 + 8 }}
        className={cn(
          "flex w-full items-center gap-1.5 rounded py-1 pr-2 text-left hover:bg-surface-hover",
          active && "bg-signal-soft text-signal"
        )}
      >
        <File className="h-3 w-3 shrink-0 text-text-dim" />
        <span className="truncate">{node.name}</span>
        {node.file.isImportant && <Star className="ml-auto h-3 w-3 shrink-0 text-amber" />}
      </button>
    );
  }

  const children = Object.values(node.children).sort(
    (a, b) => Number(a.isFile) - Number(b.isFile) || a.name.localeCompare(b.name)
  );

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ paddingLeft: depth * 14 + 8 }}
        className="flex w-full items-center gap-1.5 rounded py-1 pr-2 text-left text-text-muted hover:bg-surface-hover"
      >
        <ChevronRight className={cn("h-3 w-3 shrink-0 transition-transform", open && "rotate-90")} />
        <Folder className="h-3 w-3 shrink-0" />
        <span className="truncate">{node.name}</span>
      </button>
      {open && children.map((child) => (
        <TreeItem key={child.path} node={child} depth={depth + 1} selectedPath={selectedPath} onSelect={onSelect} />
      ))}
    </div>
  );
}
