import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/rbac";

export const GET = requireManager(async (req) => {
  const devices = await prisma.device.findMany({
    where: { companyId: req.device.companyId },
    select: {
      id: true,
      deviceName: true,
      fingerprint: true,
      role: true,
      status: true,
      lastActive: true,
      createdAt: true,
      _count: { select: { projects: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(devices);
});
