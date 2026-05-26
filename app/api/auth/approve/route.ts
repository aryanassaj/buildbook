import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { signToken } from "@/lib/auth";
import { Role } from "@/lib/generated/prisma/client";

export const POST = requireAdmin(async (req, _ctx) => {
  const body = await req.json();
  const { deviceId, role, action } = body as {
    deviceId: string;
    role?: Role;
    action: "approve" | "revoke";
  };

  if (!deviceId || !action) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const device = await prisma.device.findUnique({ where: { id: deviceId } });
  if (!device) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }

  if (device.companyId !== req.device.companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (action === "revoke") {
    await prisma.device.update({
      where: { id: deviceId },
      data: { status: "REVOKED", token: null },
    });
    return NextResponse.json({ success: true });
  }

  const assignedRole = role ?? Role.ENGINEER;
  const token = await signToken({
    deviceId: device.id,
    companyId: device.companyId,
    role: assignedRole,
  });

  await prisma.device.update({
    where: { id: deviceId },
    data: { status: "APPROVED", role: assignedRole, token, lastActive: new Date() },
  });

  return NextResponse.json({ success: true });
});
