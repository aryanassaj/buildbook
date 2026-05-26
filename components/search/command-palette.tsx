"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  device: { deviceName: string };
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Project[]>([]);
  const [selected, setSelected] = useState(0);
  const [searching, setSearching] = useState(false);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(() => {
      setSearching(true);
      api.get<Project[]>(`/api/projects?search=${encodeURIComponent(query)}`)
        .then((r) => { setResults(r); setSelected(0); })
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const navigate = useCallback((project: Project) => {
    router.push(`/projects/${project.id}`);
    onClose();
  }, [router, onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected((i) => Math.min(i + 1, results.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelected((i) => Math.max(i - 1, 0)); }
      if (e.key === "Enter" && results[selected]) { navigate(results[selected]); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, results, selected, navigate, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-700 shadow-2xl">
        {/* Input */}
        <div className="flex items-center gap-2 px-3 border-b border-neutral-800">
          <span className="text-neutral-600 text-sm shrink-0">⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects…"
            className="flex-1 bg-transparent text-white text-sm py-3.5 focus:outline-none placeholder:text-neutral-600"
          />
          {searching && (
            <span className="text-neutral-600 text-xs shrink-0">…</span>
          )}
          <kbd className="text-neutral-600 text-xs border border-neutral-700 px-1.5 py-0.5 shrink-0">esc</kbd>
        </div>

        {/* Results */}
        {results.length > 0 ? (
          <ul className="max-h-72 overflow-y-auto">
            {results.map((p, i) => (
              <li key={p.id}>
                <button
                  onClick={() => navigate(p)}
                  onMouseEnter={() => setSelected(i)}
                  className={`w-full text-left px-4 py-2.5 transition-colors flex items-start gap-3 ${
                    selected === i ? "bg-neutral-800" : "hover:bg-neutral-800/50"
                  }`}
                >
                  <span className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                    p.status === "ACTIVE" ? "bg-green-400" :
                    p.status === "COMPLETED" ? "bg-blue-400" : "bg-neutral-500"
                  }`} />
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{p.name}</p>
                    <p className="text-neutral-500 text-xs truncate">{p.description}</p>
                  </div>
                  <span className="text-neutral-600 text-xs ml-auto shrink-0 self-center">↵</span>
                </button>
              </li>
            ))}
          </ul>
        ) : query.trim() && !searching ? (
          <div className="px-4 py-6 text-center text-neutral-600 text-sm">
            No projects matching &ldquo;{query}&rdquo;
          </div>
        ) : !query.trim() ? (
          <div className="px-4 py-4 text-neutral-600 text-xs">
            Type to search across all projects
          </div>
        ) : null}

        {/* Footer */}
        {results.length > 0 && (
          <div className="border-t border-neutral-800 px-4 py-2 flex gap-4 text-neutral-600 text-xs">
            <span><kbd className="border border-neutral-700 px-1">↑↓</kbd> navigate</span>
            <span><kbd className="border border-neutral-700 px-1">↵</kbd> open</span>
            <span><kbd className="border border-neutral-700 px-1">esc</kbd> close</span>
          </div>
        )}
      </div>
    </div>
  );
}
