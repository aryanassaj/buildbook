import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/rbac";

type Ctx = { params: Promise<{ id: string; specId: string }> };

// PATCH /api/projects/[id]/spec/[specId] — update status (manager+)
export const PATCH = requireManager(async (req, ctx) => {
  const { id, specId } = await (ctx as Ctx).params;
  const { status } = await req.json();

  const spec = await prisma.spec.findUnique({
    where: { id: specId },
    include: { project: true },
  });

  if (!spec || spec.project.companyId !== req.device.companyId || spec.projectId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.spec.update({
    where: { id: specId },
    data: { status },
  });

  return NextResponse.json(updated);
});
