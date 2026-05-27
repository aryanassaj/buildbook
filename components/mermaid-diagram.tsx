"use client";

import { useEffect, useRef, useState } from "react";

let diagramCounter = 0;

export default function MermaidDiagram({
  code,
  theme = "dark",
  onReady,
}: {
  code: string;
  theme?: "dark" | "light";
  onReady?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code || !containerRef.current) return;
    setRendered(false);
    setError(null);

    // Strip parentheses from edge labels — Mermaid parses ( as a node shape token
    // even inside |...| delimiters, causing syntax errors on labels like "(Phase 2)"
    const sanitized = code.replace(/\|([^|]*)\|/g, (_, label) =>
      `|${label.replace(/[()]/g, "")}|`
    );

    const themeInit =
      theme === "dark"
        ? `%%{init: {'theme': 'dark', 'themeVariables': {'background': '#0a0a0a', 'mainBkg': '#171717', 'nodeBorder': '#404040', 'clusterBkg': '#0f0f0f', 'lineColor': '#525252', 'primaryColor': '#1f1f1f', 'primaryTextColor': '#e5e5e5', 'primaryBorderColor': '#404040', 'edgeLabelBackground': '#171717'}}}%%`
        : `%%{init: {'theme': 'default'}}%%`;

    const themedCode = `${themeInit}\n${sanitized}`;
    const id = `mermaid-diagram-${++diagramCounter}`;

    import("mermaid").then(async (m) => {
      m.default.initialize({ startOnLoad: false });

      try {
        await m.default.parse(themedCode);
        const { svg } = await m.default.render(id, themedCode);

        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
          const svgEl = containerRef.current.querySelector("svg");
          if (svgEl) {
            svgEl.removeAttribute("height");
            svgEl.style.width = "100%";
            svgEl.style.height = "auto";
            svgEl.style.maxWidth = "100%";
          }
          setRendered(true);
          onReady?.();
        }
      } catch (err) {
        console.error("Mermaid error:", err);
        setError(err instanceof Error ? err.message : "Render failed");
      }
    });
  }, [code, theme]);

  if (error) {
    return (
      <div className="border border-red-900/40 bg-neutral-950 p-6">
        <p className="text-neutral-400 text-xs font-mono mb-3">Diagram syntax error — regenerate to fix</p>
        <pre className="text-red-400 text-xs font-mono whitespace-pre-wrap">{error}</pre>
      </div>
    );
  }

  return (
    <div className={theme === "dark" ? "border border-neutral-800 bg-neutral-950 p-6 overflow-x-auto" : "overflow-x-auto"}>
      {!rendered && theme === "dark" && (
        <div className="min-h-48 flex items-center justify-center">
          <span className="text-neutral-600 text-sm animate-pulse">Rendering diagram…</span>
        </div>
      )}
      <div ref={containerRef} className={rendered ? "" : "hidden"} />
    </div>
  );
}
