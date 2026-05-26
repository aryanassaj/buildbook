"use client";

import { useState, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

const PRESET_STACK = [
  "Next.js", "React", "TypeScript", "Tailwind CSS", "Node.js",
  "Python", "FastAPI", "Django", "PostgreSQL", "MySQL", "MongoDB",
  "DynamoDB", "Redis", "AWS Lambda", "S3", "EC2", "RDS",
  "Docker", "Kubernetes", "Terraform", "GitHub Actions", "Vercel",
];

const STATUS_OPTIONS = ["ACTIVE", "COMPLETED", "ARCHIVED"] as const;

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [techStack, setTechStack] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState("");
  const [status, setStatus] = useState<string>("ACTIVE");

  function toggleTech(tech: string) {
    setTechStack((prev) =>
      prev.includes(tech) ? prev.filter((t) => t !== tech) : [...prev, tech]
    );
  }

  function addCustom() {
    const val = customInput.trim();
    if (val && !techStack.includes(val)) {
      setTechStack((prev) => [...prev, val]);
    }
    setCustomInput("");
  }

  function handleCustomKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); addCustom(); }
    if (e.key === "Backspace" && !customInput && techStack.length > 0) {
      setTechStack((prev) => prev.slice(0, -1));
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = e.currentTarget;

    try {
      const project = await api.post<{ id: string }>("/api/projects", {
        name: (form.elements.namedItem("name") as HTMLInputElement).value,
        description: (form.elements.namedItem("description") as HTMLTextAreaElement).value,
        metrics: (form.elements.namedItem("metrics") as HTMLInputElement).value || null,
        techStack,
        status,
      });
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-white text-xl font-semibold">New project</h1>
        <p className="text-neutral-500 text-sm mt-0.5">Document a new engineering project</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Project name" name="name" placeholder="YAS Nexus SMS Agent" required />

        <div className="space-y-1.5">
          <label htmlFor="description" className="text-sm text-neutral-300 block">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            placeholder="One paragraph describing the project, its purpose, and what was built…"
            required
            className="w-full bg-neutral-900 border border-neutral-800 text-white text-sm px-3 py-2 focus:outline-none focus:border-neutral-600 placeholder:text-neutral-600 resize-none"
          />
        </div>

        <Field label="Key metrics (optional)" name="metrics" placeholder="e.g. 98% uptime, 200ms avg response, 3k SMS/day" />

        {/* Tech stack */}
        <div className="space-y-2">
          <label className="text-sm text-neutral-300 block">Tech stack</label>

          {/* Selected tags */}
          {techStack.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {techStack.map((t) => (
                <span
                  key={t}
                  className="flex items-center gap-1 text-xs text-white border border-neutral-600 bg-neutral-800 px-2 py-0.5"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => toggleTech(t)}
                    className="text-neutral-400 hover:text-white ml-0.5"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Preset chips */}
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

          {/* Custom input */}
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
          <Button type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create project"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, name, placeholder, required }: {
  label: string; name: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="text-sm text-neutral-300 block">{label}</label>
      <input
        id={name}
        name={name}
        placeholder={placeholder}
        required={required}
        className="w-full bg-neutral-900 border border-neutral-800 text-white text-sm px-3 py-2 focus:outline-none focus:border-neutral-600 placeholder:text-neutral-600"
      />
    </div>
  );
}
