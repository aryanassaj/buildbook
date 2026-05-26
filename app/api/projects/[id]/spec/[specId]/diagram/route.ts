import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { generateDiagram } from "@/lib/ai-diagram";

export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string; specId: string }> };

export const POST = requireAuth(async (req, ctx) => {
  const { id, specId } = await (ctx as Ctx).params;
  const { companyId } = req.device;

  const spec = await prisma.spec.findUnique({
    where: { id: specId },
    include: { project: true },
  });

  if (!spec || spec.project.companyId !== companyId || spec.projectId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const diagramCode = await generateDiagram(spec.markdownContent);

  const updated = await prisma.spec.update({
    where: { id: specId },
    data: { diagramCode },
  });

  return NextResponse.json({ diagramCode: updated.diagramCode });
});
