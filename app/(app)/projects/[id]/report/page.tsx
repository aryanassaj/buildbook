"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Report {
  id: string;
  version: number;
  markdownContent: string;
  generatedAt: string;
  deviceId: string;
}

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [activeReport, setActiveReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [projectName, setProjectName] = useState("");

  useEffect(() => {
    Promise.all([
      api.get<Report[]>(`/api/projects/${id}/report`),
      api.get<{ name: string }>(`/api/projects/${id}`),
    ])
      .then(([reps, proj]) => {
        setReports(reps);
        setActiveReport(reps[0] ?? null);
        setProjectName(proj.name);
      })
      .catch(() => router.push(`/projects/${id}`))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const newReport = await api.post<Report>(`/api/projects/${id}/report`, {});
      setReports((prev) => [newReport, ...prev]);
      setActiveReport(newReport);
    } catch (err) {
      console.error("Report generation failed:", err);
    } finally {
      setGenerating(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="h-6 w-48 bg-neutral-900 animate-pulse mb-4" />
        <div className="h-4 w-96 bg-neutral-900 animate-pulse" />
      </div>
    );
  }

  return (
    <>
      {/* Print-only styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-content { max-width: 100% !important; padding: 0 !important; }
          body { background: white !important; color: black !important; }
          .prose { color: black !important; }
          .prose h1, .prose h2, .prose h3 { color: black !important; }
          .prose p, .prose li, .prose td, .prose th { color: #1a1a1a !important; }
          .prose table { border-collapse: collapse !important; }
          .prose th, .prose td { border: 1px solid #ccc !important; padding: 4px 8px !important; }
          .prose code { background: #f5f5f5 !important; color: #333 !important; }
          .prose pre { background: #f5f5f5 !important; color: #333 !important; }
          .prose hr { border-color: #ccc !important; }
          .prose blockquote { border-left-color: #ccc !important; }
        }
      `}</style>

      <div className="p-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 no-print">
          <div>
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-1">
              <Link href="/projects" className="hover:text-neutral-300 transition-colors">Projects</Link>
              <span>/</span>
              <Link href={`/projects/${id}`} className="hover:text-neutral-300 transition-colors">{projectName}</Link>
              <span>/</span>
              <span className="text-neutral-300">Report</span>
            </div>
            <h1 className="text-white text-xl font-semibold">Documentation report</h1>
            {activeReport && (
              <p className="text-neutral-500 text-sm mt-0.5">
                Version {activeReport.version} · {new Date(activeReport.generatedAt).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {activeReport && (
              <button
                onClick={handlePrint}
                className="text-sm text-neutral-300 border border-neutral-700 px-3 py-1.5 hover:bg-neutral-800 transition-colors"
              >
                Export PDF
              </button>
            )}
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="text-sm bg-white text-black px-3 py-1.5 font-medium hover:bg-neutral-200 transition-colors disabled:opacity-50"
            >
              {generating ? "Generating…" : reports.length > 0 ? "Regenerate" : "Generate report"}
            </button>
          </div>
        </div>

        {/* Generating state */}
        {generating && (
          <div className="border border-neutral-800 border-dashed p-12 text-center no-print">
            <div className="flex items-center justify-center gap-3 mb-3">
              <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
            <p className="text-neutral-400 text-sm">Claude is generating your report…</p>
            <p className="text-neutral-600 text-xs mt-1">This typically takes 20–40 seconds</p>
          </div>
        )}

        {/* Empty state */}
        {!generating && reports.length === 0 && (
          <div className="border border-neutral-800 border-dashed p-16 text-center no-print">
            <p className="text-neutral-400 text-sm font-medium mb-1">No report yet</p>
            <p className="text-neutral-600 text-xs mb-6">
              Generate a documentation report from your project files and metadata
            </p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-white text-black text-sm px-4 py-2 font-medium hover:bg-neutral-200 transition-colors disabled:opacity-50"
            >
              Generate report
            </button>
          </div>
        )}

        {/* Report content */}
        {!generating && activeReport && (
          <div className="flex gap-6">
            {/* Version history sidebar */}
            {reports.length > 1 && (
              <div className="w-44 shrink-0 no-print">
                <p className="text-neutral-500 text-xs uppercase tracking-wider font-medium mb-2 px-2">Versions</p>
                <div className="space-y-0.5">
                  {reports.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setActiveReport(r)}
                      className={`w-full text-left px-2 py-1.5 text-sm transition-colors ${
                        activeReport.id === r.id
                          ? "bg-neutral-800 text-white"
                          : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
                      }`}
                    >
                      <span className="block">v{r.version}</span>
                      <span className="text-xs text-neutral-600">
                        {new Date(r.generatedAt).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Markdown content */}
            <div className="flex-1 min-w-0 print-content">
              <div className="prose prose-invert prose-sm max-w-none
                prose-headings:font-semibold prose-headings:text-white
                prose-h1:text-xl prose-h2:text-base prose-h2:border-b prose-h2:border-neutral-800 prose-h2:pb-1.5 prose-h2:mb-3
                prose-h3:text-sm prose-h3:text-neutral-200
                prose-p:text-neutral-300 prose-p:leading-relaxed
                prose-li:text-neutral-300
                prose-strong:text-white prose-strong:font-semibold
                prose-code:text-neutral-300 prose-code:bg-neutral-900 prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-code:before:content-none prose-code:after:content-none
                prose-pre:bg-neutral-900 prose-pre:border prose-pre:border-neutral-800 prose-pre:text-xs
                prose-table:text-sm prose-table:border prose-table:border-neutral-800
                prose-th:bg-neutral-900 prose-th:text-neutral-300 prose-th:font-medium prose-th:px-3 prose-th:py-2 prose-th:border prose-th:border-neutral-800
                prose-td:text-neutral-400 prose-td:px-3 prose-td:py-2 prose-td:border prose-td:border-neutral-800
                prose-hr:border-neutral-800
                prose-blockquote:border-l-neutral-700 prose-blockquote:text-neutral-400
                prose-a:text-neutral-300 prose-a:no-underline hover:prose-a:underline">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {activeReport.markdownContent}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
