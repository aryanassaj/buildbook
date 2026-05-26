"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./sidebar";
import { CommandPalette } from "@/components/search/command-palette";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Cmd+K / Ctrl+K global shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-neutral-950">
      {/* Mobile top bar */}
      <div className="lg:hidden shrink-0 flex items-center justify-between px-4 h-12 border-b border-neutral-800 bg-neutral-900 sticky top-0 z-30">
        <button
          onClick={() => setSidebarOpen(true)}
          className="text-neutral-400 hover:text-white text-xl leading-none w-8"
          aria-label="Open navigation"
        >
          ≡
        </button>
        <span className="text-white font-semibold text-sm tracking-tight">BuildBook</span>
        <button
          onClick={() => setSearchOpen(true)}
          className="text-neutral-500 text-xs border border-neutral-700 px-2 py-1 hover:text-neutral-300 hover:border-neutral-600 transition-colors"
        >
          ⌘K
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar: static on lg, slide-in drawer on mobile */}
        <div
          className={`
            fixed top-0 left-0 h-full z-50
            lg:static lg:z-auto lg:h-auto
            transition-transform duration-200 ease-in-out
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}
        >
          <Sidebar
            onClose={() => setSidebarOpen(false)}
            onSearchOpen={() => setSearchOpen(true)}
          />
        </div>

        <main className="flex-1 overflow-auto min-w-0">
          {children}
        </main>
      </div>

      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
