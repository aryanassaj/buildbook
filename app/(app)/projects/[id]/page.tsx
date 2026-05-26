"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

const BUCKETS = [
  "INFRASTRUCTURE", "FRONTEND", "BACKEND_API", "DATABASE",
  "DEPLOYMENT", "MONITORING", "TESTING", "DESIGN", "OTHER",
] as const;

type BucketName = typeof BUCKETS[number];

interface FileRecord {
  id: string;
  filename: string;
  storageUrl: string;
  bucket: BucketName;
  sizeBytes: number;
  contentType: string;
  uploadedAt: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  techStack: string[];
  metrics: string | null;
  status: string;
  updatedAt: string;
  device: { deviceName: string };
  files: FileRecord[];
  reports: { id: string; version: number }[];
}

const BUCKET_LABELS: Record<BucketName, string> = {
  INFRASTRUCTURE: "Infrastructure",
  FRONTEND: "Frontend",
  BACKEND_API: "Backend / API",
  DATABASE: "Database",
  DEPLOYMENT: "Deployment",
  MONITORING: "Monitoring",
  TESTING: "Testing",
  DESIGN: "Design",
  OTHER: "Other",
};

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeBucket, setActiveBucket] = useState<BucketName>("INFRASTRUCTURE");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    api.get<Project>(`/api/projects/${id}`)
      .then(setProject)
      .catch(() => router.push("/projects"))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function handleFiles(files: FileList) {
    if (!project || uploading) return;
    setUploading(true);

    for (const file of Array.from(files)) {
      try {
        // Get presigned URL
        const { presignedUrl, storageUrl, bucket } = await api.post<{
          presignedUrl: string;
          storageUrl: string;
          bucket: BucketName;
        }>("/api/files/presign", {
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          projectId: project.id,
        });

        // Upload to S3
        await fetch(presignedUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type || "application/octet-stream" },
        });

        // Save metadata
        const saved = await api.post<FileRecord>("/api/files", {
          projectId: project.id,
          filename: file.name,
          storageUrl,
          sizeBytes: file.size,
          contentType: file.type || "application/octet-stream",
          bucket,
        });

        setProject((prev) =>
          prev ? { ...prev, files: [saved, ...prev.files] } : prev
        );
        setActiveBucket(bucket);
      } catch (err) {
        console.error(`Failed to upload ${file.name}:`, err);
      }
    }

    setUploading(false);
  }

  async function deleteFile(fileId: string) {
    await api.delete(`/api/files/${fileId}`);
    setProject((prev) =>
      prev ? { ...prev, files: prev.files.filter((f) => f.id !== fileId) } : prev
    );
  }

  async function moveBucket(fileId: string, bucket: BucketName) {
    await api.put(`/api/files/${fileId}`, { bucket });
    setProject((prev) =>
      prev
        ? { ...prev, files: prev.files.map((f) => (f.id === fileId ? { ...f, bucket } : f)) }
        : prev
    );
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="h-6 w-48 bg-neutral-900 animate-pulse mb-4" />
        <div className="h-4 w-96 bg-neutral-900 animate-pulse" />
      </div>
    );
  }

  if (!project) return null;

  const bucketFiles = project.files.filter((f) => f.bucket === activeBucket);
  const bucketCounts = Object.fromEntries(
    BUCKETS.map((b) => [b, project.files.filter((f) => f.bucket === b).length])
  );

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-neutral-500 mb-1">
            <Link href="/projects" className="hover:text-neutral-300 transition-colors">Projects</Link>
            <span>/</span>
            <span className="text-neutral-300">{project.name}</span>
          </div>
          <h1 className="text-white text-xl font-semibold">{project.name}</h1>
          <p className="text-neutral-400 text-sm mt-1 max-w-xl">{project.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/projects/${id}/report`}
            className="text-sm text-neutral-300 border border-neutral-700 px-3 py-1.5 hover:bg-neutral-800 transition-colors"
          >
            View report
          </Link>
          <Link
            href={`/projects/${id}/edit`}
            className="text-sm text-neutral-300 border border-neutral-700 px-3 py-1.5 hover:bg-neutral-800 transition-colors"
          >
            Edit
          </Link>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-6 text-xs text-neutral-500 mb-8 border-b border-neutral-800 pb-5">
        <span>Owner: <span className="text-neutral-300">{project.device.deviceName}</span></span>
        <span>Status: <span className="text-neutral-300">{project.status.charAt(0) + project.status.slice(1).toLowerCase()}</span></span>
        {project.metrics && <span>Metrics: <span className="text-neutral-300">{project.metrics}</span></span>}
        <span>Updated: <span className="text-neutral-300">{new Date(project.updatedAt).toLocaleDateString()}</span></span>
        <span>Files: <span className="text-neutral-300 tabular-nums">{project.files.length}</span></span>
      </div>

      {/* Tech stack */}
      {(project.techStack as string[]).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-8">
          {(project.techStack as string[]).map((t) => (
            <span key={t} className="text-xs text-neutral-400 border border-neutral-700 px-2 py-0.5">
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Buckets */}
      <div className="flex gap-6">
        {/* Bucket sidebar */}
        <div className="w-44 shrink-0">
          <p className="text-neutral-500 text-xs uppercase tracking-wider font-medium mb-2 px-2">Buckets</p>
          <div className="space-y-0.5">
            {BUCKETS.map((b) => (
              <button
                key={b}
                onClick={() => setActiveBucket(b)}
                className={`w-full text-left px-2 py-1.5 text-sm flex items-center justify-between transition-colors ${
                  activeBucket === b
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
                }`}
              >
                <span>{BUCKET_LABELS[b]}</span>
                {bucketCounts[b] > 0 && (
                  <span className="text-xs text-neutral-500 tabular-nums">{bucketCounts[b]}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Files panel */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white text-sm font-medium">
              {BUCKET_LABELS[activeBucket]}
              <span className="text-neutral-500 font-normal ml-1.5">({bucketFiles.length})</span>
            </h2>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-xs text-neutral-400 border border-neutral-700 px-2.5 py-1 hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "+ Upload files"}
            </button>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
            }}
            className={`min-h-48 border transition-colors ${
              dragOver
                ? "border-neutral-500 bg-neutral-800/40"
                : "border-neutral-800 border-dashed"
            }`}
          >
            {bucketFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <p className="text-neutral-600 text-sm">
                  {dragOver ? "Drop files here" : "No files in this bucket"}
                </p>
                <p className="text-neutral-700 text-xs mt-1">Drag and drop or click Upload files</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-neutral-800">
                {bucketFiles.map((file) => (
                  <FileCard
                    key={file.id}
                    file={file}
                    onDelete={() => deleteFile(file.id)}
                    onMoveBucket={(bucket) => moveBucket(file.id, bucket)}
                  />
                ))}
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
        </div>
      </div>
    </div>
  );
}

function FileCard({
  file,
  onDelete,
  onMoveBucket,
}: {
  file: FileRecord;
  onDelete: () => void;
  onMoveBucket: (bucket: BucketName) => void;
}) {
  const isImage = file.contentType.startsWith("image/");
  const [showMove, setShowMove] = useState(false);

  return (
    <div className="bg-neutral-950 p-3 group relative">
      {isImage ? (
        <img
          src={file.storageUrl}
          alt={file.filename}
          className="w-full h-24 object-cover mb-2 bg-neutral-900"
        />
      ) : (
        <div className="w-full h-24 bg-neutral-900 flex items-center justify-center mb-2">
          <span className="text-neutral-600 text-xs uppercase">{file.filename.split(".").pop()}</span>
        </div>
      )}

      <p className="text-white text-xs font-medium truncate">{file.filename}</p>
      <p className="text-neutral-600 text-xs">{formatBytes(file.sizeBytes)}</p>

      {/* Actions */}
      <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
        <button
          onClick={() => setShowMove(!showMove)}
          className="text-xs text-neutral-400 bg-neutral-800 border border-neutral-700 px-1.5 py-0.5 hover:text-white"
        >
          Move
        </button>
        <button
          onClick={onDelete}
          className="text-xs text-red-400 bg-neutral-800 border border-neutral-700 px-1.5 py-0.5 hover:text-red-300"
        >
          ×
        </button>
      </div>

      {showMove && (
        <div className="absolute top-8 right-2 z-10 bg-neutral-900 border border-neutral-700 shadow-lg py-1 min-w-36">
          {BUCKETS.map((b) => (
            <button
              key={b}
              onClick={() => { onMoveBucket(b); setShowMove(false); }}
              className="w-full text-left text-xs text-neutral-300 px-3 py-1.5 hover:bg-neutral-800 hover:text-white"
            >
              {BUCKET_LABELS[b]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
