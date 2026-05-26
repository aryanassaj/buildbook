import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { Role } from "@/lib/generated/prisma/client";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/projects/[id]
export const GET = requireAuth(async (req, ctx) => {
  const { id } = await (ctx as Ctx).params;
  const { deviceId, companyId, role } = req.device;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      device: { select: { deviceName: true } },
      files: { orderBy: { uploadedAt: "desc" } },
      reports: { orderBy: { version: "desc" }, take: 1 },
    },
  });

  if (!project || project.companyId !== companyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (role === Role.ENGINEER && project.deviceId !== deviceId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(project);
});

// PUT /api/projects/[id]
export const PUT = requireAuth(async (req, ctx) => {
  const { id } = await (ctx as Ctx).params;
  const { deviceId, companyId, role } = req.device;
  const body = await req.json();

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.companyId !== companyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (role === Role.ENGINEER && project.deviceId !== deviceId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.project.update({
    where: { id },
    data: {
      name: body.name ?? project.name,
      description: body.description ?? project.description,
      techStack: body.techStack ?? project.techStack,
      metrics: body.metrics ?? project.metrics,
      status: body.status ?? project.status,
    },
  });

  return NextResponse.json(updated);
});

// DELETE /api/projects/[id]
export const DELETE = requireAuth(async (req, ctx) => {
  const { id } = await (ctx as Ctx).params;
  const { deviceId, companyId, role } = req.device;

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.companyId !== companyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (role === Role.ENGINEER && project.deviceId !== deviceId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
