import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassphrase } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { fingerprint, passphrase } = await req.json();

  if (!fingerprint || !passphrase) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const device = await prisma.device.findUnique({
    where: { fingerprint },
    include: { company: true },
  });

  if (!device) {
    return NextResponse.json({ error: "Device not recognized. Use Join to register this device." }, { status: 404 });
  }

  if (device.status !== "APPROVED") {
    return NextResponse.json({ error: "Device is pending approval." }, { status: 403 });
  }

  if (!device.company.passphrase) {
    return NextResponse.json({ error: "No passphrase set for this company." }, { status: 400 });
  }

  const valid = await verifyPassphrase(passphrase, device.company.passphrase);
  if (!valid) {
    return NextResponse.json({ error: "Incorrect passphrase." }, { status: 401 });
  }

  await prisma.device.update({ where: { id: device.id }, data: { lastActive: new Date() } });

  return NextResponse.json({
    token: device.token,
    role: device.role,
    deviceId: device.id,
    companyCode: device.company.companyCode,
  });
}
