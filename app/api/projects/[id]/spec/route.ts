import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { generateSpec } from "@/lib/ai-spec";

export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

// GET /api/projects/[id]/spec — all versions, latest first
export const GET = requireAuth(async (req, ctx) => {
  const { id } = await (ctx as Ctx).params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: { specs: { orderBy: { version: "desc" } } },
  });

  if (!project || project.companyId !== req.device.companyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(project.specs);
});

// POST /api/projects/[id]/spec — generate a new spec version
export const POST = requireAuth(async (req, ctx) => {
  const { id } = await (ctx as Ctx).params;
  const { draftText } = await req.json();

  if (!draftText?.trim()) {
    return NextResponse.json({ error: "draftText is required" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      specs: { select: { version: true }, orderBy: { version: "desc" }, take: 1 },
    },
  });

  if (!project || project.companyId !== req.device.companyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const nextVersion = (project.specs[0]?.version ?? 0) + 1;

  let markdownContent: string;
  try {
    markdownContent = await generateSpec({
      projectName: project.name,
      description: project.description,
      techStack: project.techStack as string[],
      draftText,
    });
  } catch (err) {
    console.error("[spec generation error]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  const spec = await prisma.spec.create({
    data: {
      projectId: id,
      deviceId: req.device.deviceId,
      version: nextVersion,
      inputText: draftText,
      markdownContent,
    },
  });

  return NextResponse.json(spec);
});
