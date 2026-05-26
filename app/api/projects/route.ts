import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { Role } from "@/lib/generated/prisma/client";

// GET /api/projects — Engineers see own projects, Managers/Admins see all
export const GET = requireAuth(async (req) => {
  const { deviceId, companyId, role } = req.device;

  const where =
    role === Role.ENGINEER
      ? { companyId, deviceId }
      : { companyId };

  const status = req.nextUrl.searchParams.get("status");
  const search = req.nextUrl.searchParams.get("search");
  const owner = req.nextUrl.searchParams.get("owner");

  const projects = await prisma.project.findMany({
    where: {
      ...where,
      ...(status ? { status: status as never } : {}),
      ...(owner && role !== Role.ENGINEER ? { deviceId: owner } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      device: { select: { deviceName: true } },
      _count: { select: { files: true, reports: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(projects);
});

// POST /api/projects — create a new project
export const POST = requireAuth(async (req) => {
  const { deviceId, companyId } = req.device;
  const body = await req.json();
  const { name, description, techStack, metrics, status } = body;

  if (!name || !description) {
    return NextResponse.json({ error: "Name and description are required" }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: {
      companyId,
      deviceId,
      name,
      description,
      techStack: techStack ?? [],
      metrics: metrics ?? null,
      status: status ?? "ACTIVE",
    },
  });

  return NextResponse.json(project, { status: 201 });
});
