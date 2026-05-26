"use client";

import { useEffect, useRef, useState } from "react";

export default function MermaidDiagram({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code || !containerRef.current) return;
    setError(null);

    import("mermaid").then((m) => {
      m.default.initialize({
        startOnLoad: false,
        theme: "dark",
        darkMode: true,
        fontFamily: "ui-monospace, monospace",
        flowchart: { curve: "basis", padding: 20 },
        themeVariables: {
          background: "#0a0a0a",
          mainBkg: "#171717",
          nodeBorder: "#404040",
          clusterBkg: "#111111",
          titleColor: "#ffffff",
          edgeLabelBackground: "#171717",
          lineColor: "#525252",
          primaryColor: "#1f1f1f",
          primaryTextColor: "#e5e5e5",
          primaryBorderColor: "#404040",
          secondaryColor: "#141414",
          tertiaryColor: "#0f0f0f",
        },
      });

      const id = `mermaid-${Date.now()}`;
      m.default
        .render(id, code)
        .then(({ svg }) => {
          if (containerRef.current) {
            containerRef.current.innerHTML = svg;
            // Make SVG responsive
            const svgEl = containerRef.current.querySelector("svg");
            if (svgEl) {
              svgEl.style.width = "100%";
              svgEl.style.height = "auto";
              svgEl.style.maxWidth = "100%";
            }
          }
        })
        .catch((err) => {
          setError("Could not render diagram. Try regenerating it.");
          console.error("Mermaid render error:", err);
        });
    });
  }, [code]);

  if (error) {
    return (
      <div className="border border-neutral-800 p-6 text-center">
        <p className="text-neutral-500 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="border border-neutral-800 bg-neutral-950 p-6 overflow-x-auto">
      <div ref={containerRef} className="min-h-48 flex items-center justify-center">
        <span className="text-neutral-600 text-sm animate-pulse">Rendering diagram…</span>
      </div>
    </div>
  );
}
