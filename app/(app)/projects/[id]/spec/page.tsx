"use client";

import { useEffect, useState, use, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { useAuth } from "@/components/providers/auth-provider";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import MermaidDiagram from "@/components/mermaid-diagram";

interface Spec {
  id: string;
  version: number;
  inputText: string;
  markdownContent: string;
  diagramCode: string | null;
  status: "DRAFT" | "IN_REVIEW" | "APPROVED";
  generatedAt: string;
}

const STATUS_COLORS = {
  DRAFT: "text-neutral-400 border-neutral-700",
  IN_REVIEW: "text-yellow-400 border-yellow-800",
  APPROVED: "text-green-400 border-green-900",
};

const STATUS_LABELS = { DRAFT: "Draft", IN_REVIEW: "In Review", APPROVED: "Approved" };

export default function SpecPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { role } = useAuth();
  const isManager = role === "ADMIN" || role === "MANAGER";

  const [specs, setSpecs] = useState<Spec[]>([]);
  const [activeSpec, setActiveSpec] = useState<Spec | null>(null);
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingDiagram, setGeneratingDiagram] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [mode, setMode] = useState<"view" | "new">("view");
  const [activeTab, setActiveTab] = useState<"spec" | "diagram">("spec");
  const exportZoneRef = useRef<HTMLDivElement>(null);

  // Input state
  const [draftText, setDraftText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      api.get<Spec[]>(`/api/projects/${id}/spec`),
      api.get<{ name: string }>(`/api/projects/${id}`),
    ])
      .then(([s, proj]) => {
        setSpecs(s);
        setActiveSpec(s[0] ?? null);
        setProjectName(proj.name);
        setMode(s.length === 0 ? "new" : "view");
      })
      .catch(() => router.push(`/projects/${id}`))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function handleFileUpload(file: File) {
    const text = await file.text();
    setDraftText((prev) => prev ? `${prev}\n\n---\n\n${text}` : text);
  }

  async function handleGenerate() {
    if (!draftText.trim()) return;
    setGenerating(true);
    try {
      const newSpec = await api.post<Spec>(`/api/projects/${id}/spec`, { draftText });
      setSpecs((prev) => [newSpec, ...prev]);
      setActiveSpec(newSpec);
      setMode("view");
      setDraftText("");
    } catch (err) {
      console.error("Spec generation failed:", err);
    } finally {
      setGenerating(false);
    }
  }

  async function handleStatusChange(status: Spec["status"]) {
    if (!activeSpec) return;
    const updated = await api.patch<Spec>(`/api/projects/${id}/spec/${activeSpec.id}`, { status });
    setActiveSpec(updated);
    setSpecs((prev) => prev.map((s) => s.id === updated.id ? updated : s));
  }

  async function handleGenerateDiagram() {
    if (!activeSpec) return;
    setGeneratingDiagram(true);
    try {
      const { diagramCode } = await api.post<{ diagramCode: string }>(
        `/api/projects/${id}/spec/${activeSpec.id}/diagram`,
        {}
      );
      const updated = { ...activeSpec, diagramCode };
      setActiveSpec(updated);
      setSpecs((prev) => prev.map((s) => s.id === updated.id ? updated : s));
      setActiveTab("diagram");
    } catch (err) {
      console.error("Diagram generation failed:", err);
    } finally {
      setGeneratingDiagram(false);
    }
  }

  async function handleExportPDF() {
    if (!activeSpec || !exportZoneRef.current) return;
    setExporting(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);

      const canvas = await html2canvas(exportZoneRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height / canvas.width) * pageW;

      let remaining = imgH;
      let offset = 0;
      while (remaining > 0) {
        if (offset > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, -offset, pageW, imgH);
        offset += pageH;
        remaining -= pageH;
      }

      pdf.save(`${projectName.replace(/\s+/g, "-").toLowerCase()}-spec-v${activeSpec.version}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-8">
        <div className="h-6 w-48 bg-neutral-900 animate-pulse mb-4" />
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .prose { color: black !important; }
          .prose h1, .prose h2, .prose h3 { color: black !important; }
          .prose p, .prose li, .prose td, .prose th { color: #1a1a1a !important; }
          .prose table { border-collapse: collapse !important; }
          .prose th, .prose td { border: 1px solid #ccc !important; padding: 4px 8px !important; }
        }
      `}</style>

      <div className="p-4 sm:p-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 no-print">
          <div>
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-1">
              <Link href="/projects" className="hover:text-neutral-300 transition-colors">Projects</Link>
              <span>/</span>
              <Link href={`/projects/${id}`} className="hover:text-neutral-300 transition-colors">{projectName}</Link>
              <span>/</span>
              <span className="text-neutral-300">Spec</span>
            </div>
            <h1 className="text-white text-xl font-semibold">Implementation spec</h1>
            {activeSpec && mode === "view" && (
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-neutral-500 text-sm">
                  v{activeSpec.version} · {new Date(activeSpec.generatedAt).toLocaleDateString()}
                </p>
                <span className={`text-xs border px-2 py-0.5 ${STATUS_COLORS[activeSpec.status]}`}>
                  {STATUS_LABELS[activeSpec.status]}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {mode === "view" && activeSpec && (
              <>
                {isManager && activeSpec.status !== "APPROVED" && (
                  <button
                    onClick={() => handleStatusChange(activeSpec.status === "DRAFT" ? "IN_REVIEW" : "APPROVED")}
                    className="text-sm text-green-400 border border-green-900 px-3 py-1.5 hover:bg-green-950 transition-colors"
                  >
                    {activeSpec.status === "DRAFT" ? "Mark in review" : "Approve"}
                  </button>
                )}
                {isManager && activeSpec.status === "APPROVED" && (
                  <button
                    onClick={() => handleStatusChange("DRAFT")}
                    className="text-sm text-neutral-400 border border-neutral-700 px-3 py-1.5 hover:bg-neutral-800 transition-colors"
                  >
                    Revert to draft
                  </button>
                )}
                <button
                  onClick={handleGenerateDiagram}
                  disabled={generatingDiagram}
                  className="text-sm text-neutral-300 border border-neutral-700 px-3 py-1.5 hover:bg-neutral-800 transition-colors disabled:opacity-50"
                >
                  {generatingDiagram ? "Generating…" : activeSpec.diagramCode ? "Regenerate diagram" : "Generate diagram"}
                </button>
                <button
                  onClick={handleExportPDF}
                  disabled={exporting}
                  className="text-sm text-neutral-300 border border-neutral-700 px-3 py-1.5 hover:bg-neutral-800 transition-colors disabled:opacity-50"
                >
                  {exporting ? "Exporting…" : "Export PDF"}
                </button>
                <button
                  onClick={() => { setMode("new"); setDraftText(""); }}
                  className="text-sm bg-white text-black px-3 py-1.5 font-medium hover:bg-neutral-200 transition-colors"
                >
                  New version
                </button>
              </>
            )}
          </div>
        </div>

        {/* Input mode */}
        {mode === "new" && (
          <div className="space-y-4 no-print">
            <div className="border border-neutral-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-white text-sm font-medium">Your draft ideas</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-neutral-400 border border-neutral-700 px-2.5 py-1 hover:bg-neutral-800 transition-colors"
                  >
                    Upload file (.txt, .md)
                  </button>
                  {specs.length > 0 && (
                    <button
                      onClick={() => setMode("view")}
                      className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
              <textarea
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                placeholder={`Paste your rough ideas, notes, or draft here…\n\nExample:\n- Build a Twilio SMS bot that handles customer queries\n- Need to integrate with our existing CRM\n- Should handle 500 messages/day\n- Use AWS Lambda for serverless execution`}
                rows={14}
                className="w-full bg-neutral-900 border border-neutral-800 text-white text-sm px-3 py-2.5 focus:outline-none focus:border-neutral-600 placeholder:text-neutral-600 resize-none font-mono"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.markdown"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              />
              <div className="flex items-center justify-between">
                <p className="text-neutral-600 text-xs">
                  {draftText.length > 0 ? `${draftText.length} characters` : "Paste text or upload a .txt / .md file"}
                </p>
                <button
                  onClick={handleGenerate}
                  disabled={generating || !draftText.trim()}
                  className="text-sm bg-white text-black px-4 py-2 font-medium hover:bg-neutral-200 transition-colors disabled:opacity-50"
                >
                  {generating ? "Generating…" : "Generate spec"}
                </button>
              </div>
            </div>

            {generating && (
              <div className="border border-neutral-800 border-dashed p-10 text-center">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
                <p className="text-neutral-400 text-sm">Gemini is generating your spec…</p>
                <p className="text-neutral-600 text-xs mt-1">Typically 15–30 seconds</p>
              </div>
            )}
          </div>
        )}

        {/* Spec view */}
        {mode === "view" && activeSpec && (
          <div className="flex gap-6">
            {/* Version sidebar */}
            {specs.length > 1 && (
              <div className="w-44 shrink-0 no-print">
                <p className="text-neutral-500 text-xs uppercase tracking-wider font-medium mb-2 px-2">Versions</p>
                <div className="space-y-0.5">
                  {specs.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setActiveSpec(s)}
                      className={`w-full text-left px-2 py-1.5 text-sm transition-colors ${
                        activeSpec.id === s.id
                          ? "bg-neutral-800 text-white"
                          : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
                      }`}
                    >
                      <span className="block">v{s.version}</span>
                      <span className={`text-xs ${STATUS_COLORS[s.status].split(" ")[0]}`}>
                        {STATUS_LABELS[s.status]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Rendered spec */}
            <div className="flex-1 min-w-0">
              {/* Tabs */}
              <div className="flex gap-4 border-b border-neutral-800 mb-6 no-print">
                <button
                  onClick={() => setActiveTab("spec")}
                  className={`text-sm pb-2 border-b-2 transition-colors ${activeTab === "spec" ? "border-white text-white" : "border-transparent text-neutral-500 hover:text-neutral-300"}`}
                >
                  Spec
                </button>
                <button
                  onClick={() => setActiveTab("diagram")}
                  className={`text-sm pb-2 border-b-2 transition-colors ${activeTab === "diagram" ? "border-white text-white" : "border-transparent text-neutral-500 hover:text-neutral-300"}`}
                >
                  Diagram
                  {!activeSpec.diagramCode && <span className="ml-1.5 text-xs text-neutral-600">not generated</span>}
                </button>
              </div>

              {activeTab === "diagram" && (
                <div className="no-print">
                  {activeSpec.diagramCode ? (
                    <MermaidDiagram code={activeSpec.diagramCode} />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 border border-neutral-800 border-dashed">
                      <p className="text-neutral-500 text-sm mb-3">No diagram generated yet</p>
                      <button
                        onClick={handleGenerateDiagram}
                        disabled={generatingDiagram}
                        className="text-sm bg-white text-black px-4 py-2 font-medium hover:bg-neutral-200 transition-colors disabled:opacity-50"
                      >
                        {generatingDiagram ? "Generating…" : "Generate diagram"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "spec" && (
                <>
                  <div className="prose prose-invert prose-sm max-w-none
                    prose-headings:font-semibold prose-headings:text-white
                    prose-h1:text-xl prose-h2:text-base prose-h2:border-b prose-h2:border-neutral-800 prose-h2:pb-1.5 prose-h2:mb-3
                    prose-h3:text-sm prose-h3:text-neutral-200
                    prose-p:text-neutral-300 prose-p:leading-relaxed
                    prose-li:text-neutral-300
                    prose-strong:text-white prose-strong:font-semibold
                    prose-code:text-neutral-300 prose-code:bg-neutral-900 prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-code:before:content-none prose-code:after:content-none
                    prose-pre:bg-neutral-900 prose-pre:border prose-pre:border-neutral-800
                    prose-table:text-sm prose-table:border prose-table:border-neutral-800
                    prose-th:bg-neutral-900 prose-th:text-neutral-300 prose-th:font-medium prose-th:px-3 prose-th:py-2 prose-th:border prose-th:border-neutral-800
                    prose-td:text-neutral-400 prose-td:px-3 prose-td:py-2 prose-td:border prose-td:border-neutral-800
                    prose-hr:border-neutral-800
                    prose-blockquote:border-l-neutral-700 prose-blockquote:text-neutral-400
                    prose-a:text-neutral-300 prose-a:no-underline hover:prose-a:underline
                    [&_input[type=checkbox]]:mr-2">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {activeSpec.markdownContent}
                    </ReactMarkdown>
                  </div>
                  <details className="mt-8 no-print">
                    <summary className="text-neutral-600 text-xs cursor-pointer hover:text-neutral-400 transition-colors">
                      View original draft input
                    </summary>
                    <pre className="mt-2 text-neutral-600 text-xs bg-neutral-900 border border-neutral-800 p-3 whitespace-pre-wrap font-mono">
                      {activeSpec.inputText}
                    </pre>
                  </details>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Off-screen export zone — html2canvas captures this for PDF, never visible to user */}
      {activeSpec && mode === "view" && (
        <div
          ref={exportZoneRef}
          aria-hidden="true"
          style={{
            position: "fixed",
            left: "-9999px",
            top: 0,
            width: "794px",
            backgroundColor: "#ffffff",
            padding: "56px 64px",
            boxSizing: "border-box",
            color: "#111111",
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0f0f0f", margin: "0 0 6px 0" }}>
            {projectName}
          </h1>
          <p style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 24px 0" }}>
            Implementation Spec · v{activeSpec.version} · {new Date(activeSpec.generatedAt).toLocaleDateString()} · {STATUS_LABELS[activeSpec.status]}
          </p>
          <hr style={{ border: "none", borderTop: "1px solid #e5e5e5", margin: "0 0 32px 0" }} />
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {activeSpec.markdownContent}
            </ReactMarkdown>
          </div>
          {activeSpec.diagramCode && (
            <div style={{ marginTop: "48px", borderTop: "1px solid #e5e5e5", paddingTop: "32px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#0f0f0f", margin: "0 0 24px 0" }}>
                Architecture Diagram
              </h2>
              <MermaidDiagram code={activeSpec.diagramCode} theme="light" />
            </div>
          )}
        </div>
      )}
    </>
  );
}
