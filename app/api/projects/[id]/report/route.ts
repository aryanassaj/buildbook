import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { generateProjectReport } from "@/lib/ai-report";

export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

// GET /api/projects/[id]/report — all versions, latest first
export const GET = requireAuth(async (req, ctx) => {
  const { id } = await (ctx as Ctx).params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      reports: { orderBy: { version: "desc" } },
    },
  });

  if (!project || project.companyId !== req.device.companyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(project.reports);
});

// POST /api/projects/[id]/report — generate a new report version
export const POST = requireAuth(async (req, ctx) => {
  const { id } = await (ctx as Ctx).params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      files: { select: { filename: true, bucket: true, sizeBytes: true } },
      reports: {
        select: { version: true },
        orderBy: { version: "desc" },
        take: 1,
      },
    },
  });

  if (!project || project.companyId !== req.device.companyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const nextVersion = (project.reports[0]?.version ?? 0) + 1;

  const markdownContent = await generateProjectReport({
    projectName: project.name,
    description: project.description,
    techStack: project.techStack as string[],
    metrics: project.metrics,
    status: project.status,
    files: project.files.map((f) => ({
      filename: f.filename,
      bucket: f.bucket as string,
      sizeBytes: f.sizeBytes,
    })),
  });

  const report = await prisma.report.create({
    data: {
      projectId: id,
      deviceId: req.device.deviceId,
      version: nextVersion,
      markdownContent,
    },
  });

  return NextResponse.json(report);
});
