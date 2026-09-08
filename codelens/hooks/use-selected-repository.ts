"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "codelens:selectedRepository";
const CHANGE_EVENT = "codelens:selected-repository-changed";

export interface SelectedRepository {
  id: string;
  name: string;
}

/**
 * Tracks which repository is "active" across dashboard pages (Overview,
 * Architecture, Files, APIs, Database, Dependencies, AI Chat, Analysis).
 * Backed by localStorage so it survives navigation/reloads, and broadcasts
 * a custom window event so every page using this hook stays in sync the
 * moment the user picks a different repository from the Repositories tab.
 */
export function useSelectedRepository() {
  const [repo, setRepoState] = useState<SelectedRepository | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setRepoState(JSON.parse(raw));
    } catch {
      // ignore malformed/blocked storage
    }
    setHydrated(true);

    function onChange(e: Event) {
      const custom = e as CustomEvent<SelectedRepository | null>;
      setRepoState(custom.detail ?? null);
    }
    window.addEventListener(CHANGE_EVENT, onChange as EventListener);
    return () => window.removeEventListener(CHANGE_EVENT, onChange as EventListener);
  }, []);

  const setRepo = useCallback((next: SelectedRepository | null) => {
    setRepoState(next);
    try {
      if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: next }));
  }, []);

  return {
    repositoryId: repo?.id ?? null,
    repositoryName: repo?.name ?? null,
    setRepo,
    hydrated,
  };
}