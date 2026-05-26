"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { useAuth } from "@/components/providers/auth-provider";

interface Project {
  id: string;
  name: string;
  status: string;
  updatedAt: string;
  device: { deviceName: string };
  _count: { files: number; reports: number };
  techStack: string[];
}

interface Device {
  id: string;
  status: "PENDING" | "APPROVED" | "REVOKED";
  _count: { projects: number };
}

export default function DashboardPage() {
  const { role } = useAuth();
  const isManager = role === "ADMIN" || role === "MANAGER";

  const [projects, setProjects] = useState<Project[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const requests: Promise<unknown>[] = [
      api.get<Project[]>("/api/projects").then(setProjects),
    ];
    if (isManager) {
      requests.push(api.get<Device[]>("/api/devices").then(setDevices));
    }
    Promise.allSettled(requests).finally(() => setLoading(false));
  }, [isManager]);

  const total = projects.length;
  const active = projects.filter((p) => p.status === "ACTIVE").length;
  const completed = projects.filter((p) => p.status === "COMPLETED").length;
  const totalFiles = projects.reduce((sum, p) => sum + p._count.files, 0);
  const pendingDevices = devices.filter((d) => d.status === "PENDING").length;
  const approvedDevices = devices.filter((d) => d.status === "APPROVED").length;

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-white text-xl font-semibold">Dashboard</h1>
        <p className="text-neutral-500 text-sm mt-0.5">Overview of all your projects</p>
      </div>

      {/* Pending approval alert */}
      {!loading && isManager && pendingDevices > 0 && (
        <Link
          href="/devices"
          className="flex items-center gap-2 border border-yellow-800/50 bg-yellow-950/20 px-4 py-3 text-sm text-yellow-300 mb-6 hover:bg-yellow-950/30 transition-colors"
        >
          <span className="text-yellow-500">●</span>
          {pendingDevices} device{pendingDevices !== 1 ? "s" : ""} waiting for approval
          <span className="ml-auto text-yellow-600 text-xs">Review →</span>
        </Link>
      )}

      {/* Stats */}
      <div className={`grid gap-4 mb-8 ${isManager ? "grid-cols-5" : "grid-cols-3"}`}>
        <Stat label="Total projects" value={total} loading={loading} />
        <Stat label="Active" value={active} loading={loading} />
        <Stat label="Completed" value={completed} loading={loading} />
        {isManager && (
          <>
            <Stat label="Total files" value={totalFiles} loading={loading} />
            <Stat
              label="Team members"
              value={approvedDevices}
              loading={loading}
              href="/devices"
            />
          </>
        )}
      </div>

      {/* Recent projects */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white text-sm font-medium">Recent projects</h2>
          <Link href="/projects" className="text-neutral-400 text-sm hover:text-white transition-colors">
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 bg-neutral-900 border border-neutral-800 animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="border border-neutral-800 border-dashed p-8 text-center">
            <p className="text-neutral-500 text-sm">No projects yet.</p>
            <Link href="/projects/new" className="text-white text-sm underline underline-offset-2 mt-2 inline-block">
              Create your first project
            </Link>
          </div>
        ) : (
          <div className="border border-neutral-800 divide-y divide-neutral-800">
            {projects.slice(0, 5).map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-neutral-900 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <StatusDot status={p.status} />
                  <div>
                    <p className="text-white text-sm font-medium">{p.name}</p>
                    <p className="text-neutral-500 text-xs">{p.device.deviceName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-neutral-500">
                  <span>{p._count.files} files</span>
                  <span>{new Date(p.updatedAt).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  loading,
  href,
}: {
  label: string;
  value: number;
  loading: boolean;
  href?: string;
}) {
  const content = (
    <div className={`border border-neutral-800 bg-neutral-900 px-4 py-4 ${href ? "hover:bg-neutral-800 transition-colors cursor-pointer" : ""}`}>
      <p className="text-neutral-500 text-xs mb-1">{label}</p>
      {loading ? (
        <div className="h-7 w-8 bg-neutral-800 animate-pulse" />
      ) : (
        <p className="text-white text-2xl font-semibold tabular-nums">{value}</p>
      )}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "ACTIVE" ? "bg-green-400" :
    status === "COMPLETED" ? "bg-blue-400" :
    "bg-neutral-500";
  return <span className={`w-1.5 h-1.5 rounded-full ${color} shrink-0`} />;
}
