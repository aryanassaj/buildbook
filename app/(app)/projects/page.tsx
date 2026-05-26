"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api-client";

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  techStack: string[];
  updatedAt: string;
  device: { deviceName: string };
  _count: { files: number; reports: number };
}

const STATUS_OPTIONS = ["", "ACTIVE", "COMPLETED", "ARCHIVED"] as const;

export default function ProjectsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);

    api.get<Project[]>(`/api/projects?${params}`)
      .then(setProjects)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, status]);

  return (
    <div className="p-4 sm:p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-xl font-semibold">Projects</h1>
          <p className="text-neutral-500 text-sm mt-0.5">
            {loading ? "—" : `${projects.length} project${projects.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link
          href="/projects/new"
          className="bg-white text-black text-sm px-3 py-1.5 font-medium hover:bg-neutral-200 transition-colors"
        >
          + New project
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search projects…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-neutral-900 border border-neutral-800 text-white text-sm px-3 py-1.5 w-64 focus:outline-none focus:border-neutral-600 placeholder:text-neutral-600"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-neutral-900 border border-neutral-800 text-sm px-3 py-1.5 text-neutral-300 focus:outline-none focus:border-neutral-600"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-px">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-neutral-900 border border-neutral-800 animate-pulse" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="border border-neutral-800 border-dashed p-12 text-center">
          <p className="text-neutral-500 text-sm">No projects found.</p>
          <Link href="/projects/new" className="text-white text-sm underline underline-offset-2 mt-2 inline-block">
            Create your first project
          </Link>
        </div>
      ) : (
        <div className="border border-neutral-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900">
                <th className="text-left text-neutral-500 font-medium px-4 py-2.5">Project</th>
                <th className="text-left text-neutral-500 font-medium px-4 py-2.5">Owner</th>
                <th className="text-left text-neutral-500 font-medium px-4 py-2.5">Status</th>
                <th className="text-left text-neutral-500 font-medium px-4 py-2.5">Stack</th>
                <th className="text-right text-neutral-500 font-medium px-4 py-2.5">Files</th>
                <th className="text-right text-neutral-500 font-medium px-4 py-2.5">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {projects.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/projects/${p.id}`)}
                  className="hover:bg-neutral-900/60 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="text-white font-medium">{p.name}</span>
                    <p className="text-neutral-500 text-xs truncate max-w-xs mt-0.5">{p.description}</p>
                  </td>
                  <td className="px-4 py-3 text-neutral-400">{p.device.deviceName}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {(p.techStack as string[]).slice(0, 3).map((t) => (
                        <span key={t} className="text-xs text-neutral-400 border border-neutral-700 px-1.5 py-0.5">
                          {t}
                        </span>
                      ))}
                      {(p.techStack as string[]).length > 3 && (
                        <span className="text-xs text-neutral-600">+{(p.techStack as string[]).length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-400 tabular-nums">{p._count.files}</td>
                  <td className="px-4 py-3 text-right text-neutral-500 tabular-nums text-xs">
                    {new Date(p.updatedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: "text-green-400",
    COMPLETED: "text-blue-400",
    ARCHIVED: "text-neutral-500",
  };
  return (
    <span className={`text-xs font-medium ${map[status] ?? "text-neutral-400"}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
