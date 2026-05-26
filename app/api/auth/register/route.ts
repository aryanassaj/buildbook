import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCompanyCode, hashPassphrase, signToken } from "@/lib/auth";
import { Role } from "@/lib/generated/prisma/client";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { companyName, adminEmail, passphrase, deviceName, fingerprint } = body;

  if (!companyName || !adminEmail || !passphrase || !deviceName || !fingerprint) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const existingCompany = await prisma.company.findFirst({ where: { adminEmail } });
  if (existingCompany) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const existingDevice = await prisma.device.findUnique({ where: { fingerprint } });
  if (existingDevice) {
    return NextResponse.json({ error: "Device already registered" }, { status: 409 });
  }

  let companyCode = generateCompanyCode();
  while (await prisma.company.findUnique({ where: { companyCode } })) {
    companyCode = generateCompanyCode();
  }

  const hashedPassphrase = await hashPassphrase(passphrase);

  const company = await prisma.company.create({
    data: {
      name: companyName,
      companyCode,
      adminEmail,
      passphrase: hashedPassphrase,
    },
  });

  const token = await signToken({ deviceId: "pending", companyId: company.id, role: Role.ADMIN });

  const device = await prisma.device.create({
    data: {
      companyId: company.id,
      deviceName,
      fingerprint,
      role: Role.ADMIN,
      status: "APPROVED",
      token,
      lastActive: new Date(),
    },
  });

  const finalToken = await signToken({ deviceId: device.id, companyId: company.id, role: Role.ADMIN });
  await prisma.device.update({ where: { id: device.id }, data: { token: finalToken } });

  return NextResponse.json({
    token: finalToken,
    companyCode,
    deviceId: device.id,
    role: Role.ADMIN,
  });
}
