"use client";

import { useEffect, useState, use, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

const PRESET_STACK = [
  "Next.js", "React", "TypeScript", "Tailwind CSS", "Node.js",
  "Python", "FastAPI", "Django", "PostgreSQL", "MySQL", "MongoDB",
  "DynamoDB", "Redis", "AWS Lambda", "S3", "EC2", "RDS",
  "Docker", "Kubernetes", "Terraform", "GitHub Actions", "Vercel",
];

const STATUS_OPTIONS = ["ACTIVE", "COMPLETED", "ARCHIVED"] as const;

interface Project {
  id: string;
  name: string;
  description: string;
  techStack: string[];
  metrics: string | null;
  status: string;
}

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [techStack, setTechStack] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [metrics, setMetrics] = useState("");

  useEffect(() => {
    api.get<Project>(`/api/projects/${id}`)
      .then((p) => {
        setProject(p);
        setName(p.name);
        setDescription(p.description);
        setMetrics(p.metrics ?? "");
        setTechStack(p.techStack);
        setStatus(p.status);
      })
      .catch(() => router.push("/projects"))
      .finally(() => setLoading(false));
  }, [id, router]);

  function toggleTech(tech: string) {
    setTechStack((prev) => prev.includes(tech) ? prev.filter((t) => t !== tech) : [...prev, tech]);
  }

  function addCustom() {
    const val = customInput.trim();
    if (val && !techStack.includes(val)) setTechStack((prev) => [...prev, val]);
    setCustomInput("");
  }

  function handleCustomKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); addCustom(); }
    if (e.key === "Backspace" && !customInput && techStack.length > 0) {
      setTechStack((prev) => prev.slice(0, -1));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.put(`/api/projects/${id}`, { name, description, metrics: metrics || null, techStack, status });
      router.push(`/projects/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="h-6 w-48 bg-neutral-900 animate-pulse mb-4" />
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-neutral-500 mb-1">
          <Link href="/projects" className="hover:text-neutral-300 transition-colors">Projects</Link>
          <span>/</span>
          <Link href={`/projects/${id}`} className="hover:text-neutral-300 transition-colors">{project.name}</Link>
          <span>/</span>
          <span className="text-neutral-300">Edit</span>
        </div>
        <h1 className="text-white text-xl font-semibold">Edit project</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm text-neutral-300 block">Project name</label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full bg-neutral-900 border border-neutral-800 text-white text-sm px-3 py-2 focus:outline-none focus:border-neutral-600 placeholder:text-neutral-600"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="description" className="text-sm text-neutral-300 block">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            required
            className="w-full bg-neutral-900 border border-neutral-800 text-white text-sm px-3 py-2 focus:outline-none focus:border-neutral-600 placeholder:text-neutral-600 resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="metrics" className="text-sm text-neutral-300 block">Key metrics (optional)</label>
          <input
            id="metrics"
            value={metrics}
            onChange={(e) => setMetrics(e.target.value)}
            placeholder="e.g. 98% uptime, 200ms avg response"
            className="w-full bg-neutral-900 border border-neutral-800 text-white text-sm px-3 py-2 focus:outline-none focus:border-neutral-600 placeholder:text-neutral-600"
          />
        </div>

        {/* Tech stack */}
        <div className="space-y-2">
          <label className="text-sm text-neutral-300 block">Tech stack</label>
          {techStack.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {techStack.map((t) => (
                <span key={t} className="flex items-center gap-1 text-xs text-white border border-neutral-600 bg-neutral-800 px-2 py-0.5">
                  {t}
                  <button type="button" onClick={() => toggleTech(t)} className="text-neutral-400 hover:text-white ml-0.5">×</button>
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {PRESET_STACK.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleTech(t)}
                className={`text-xs px-2 py-0.5 border transition-colors ${
                  techStack.includes(t)
                    ? "border-neutral-500 bg-neutral-700 text-white"
                    : "border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-neutral-300"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={handleCustomKeyDown}
            onBlur={addCustom}
            placeholder="Add custom technology…"
            className="w-full bg-neutral-900 border border-neutral-800 text-white text-sm px-3 py-2 focus:outline-none focus:border-neutral-600 placeholder:text-neutral-600 mt-1"
          />
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <label className="text-sm text-neutral-300 block">Status</label>
          <div className="flex gap-2">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`text-xs px-3 py-1.5 border transition-colors ${
                  status === s
                    ? "border-neutral-500 bg-neutral-700 text-white"
                    : "border-neutral-800 text-neutral-500 hover:text-neutral-300"
                }`}
              >
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
          <Button type="button" variant="outline" onClick={() => router.push(`/projects/${id}`)}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
