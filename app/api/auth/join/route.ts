import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { companyCode, deviceName, fingerprint } = body;

  if (!companyCode || !deviceName || !fingerprint) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const company = await prisma.company.findUnique({ where: { companyCode } });
  if (!company) {
    return NextResponse.json({ error: "Invalid company code" }, { status: 404 });
  }

  const existingDevice = await prisma.device.findUnique({ where: { fingerprint } });
  if (existingDevice) {
    if (existingDevice.companyId !== company.id) {
      return NextResponse.json({ error: "Device already registered to a different company" }, { status: 409 });
    }
    // Let revoked devices re-request access
    if (existingDevice.status === "REVOKED") {
      const reset = await prisma.device.update({
        where: { id: existingDevice.id },
        data: { status: "PENDING", deviceName },
      });
      return NextResponse.json({ status: "PENDING", deviceId: reset.id, companyName: company.name });
    }
    await prisma.device.update({ where: { id: existingDevice.id }, data: { lastActive: new Date() } });
    return NextResponse.json({
      status: existingDevice.status,
      token: existingDevice.status === "APPROVED" ? existingDevice.token : undefined,
      role: existingDevice.role,
      deviceId: existingDevice.id,
      companyName: company.name,
    });
  }

  const device = await prisma.device.create({
    data: {
      companyId: company.id,
      deviceName,
      fingerprint,
      status: "PENDING",
    },
  });

  return NextResponse.json({
    status: "PENDING",
    deviceId: device.id,
    companyName: company.name,
  });
}

// Poll endpoint — device checks its own approval status
export async function GET(req: NextRequest) {
  const fingerprint = req.nextUrl.searchParams.get("fingerprint");
  if (!fingerprint) {
    return NextResponse.json({ error: "Missing fingerprint" }, { status: 400 });
  }

  const device = await prisma.device.findUnique({
    where: { fingerprint },
    include: { company: { select: { name: true } } },
  });

  if (!device) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }

  if (device.status === "APPROVED" && device.token) {
    await prisma.device.update({ where: { id: device.id }, data: { lastActive: new Date() } });
    return NextResponse.json({ status: "APPROVED", token: device.token, role: device.role });
  }

  if (device.status === "REVOKED") {
    return NextResponse.json({ status: "REVOKED" });
  }

  return NextResponse.json({ status: "PENDING", companyName: device.company.name });
}
