import { NextResponse } from "next/server";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { Role } from "@/lib/generated/prisma/client";

type Ctx = { params: Promise<{ id: string }> };

const s3 = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  },
});

// PATCH /api/files/[id] — change bucket
export const PATCH = requireAuth(async (req, ctx) => {
  const { id } = await (ctx as Ctx).params;
  const { bucket } = await req.json();

  const file = await prisma.file.findUnique({ where: { id }, include: { project: true } });
  if (!file || file.project.companyId !== req.device.companyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.file.update({ where: { id }, data: { bucket } });
  return NextResponse.json(updated);
});

// DELETE /api/files/[id]
export const DELETE = requireAuth(async (req, ctx) => {
  const { id } = await (ctx as Ctx).params;
  const { deviceId, companyId, role } = req.device;

  const file = await prisma.file.findUnique({ where: { id }, include: { project: true } });
  if (!file || file.project.companyId !== companyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (role === Role.ENGINEER && file.project.deviceId !== deviceId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete from S3 if configured
  if (process.env.S3_BUCKET_NAME && process.env.AWS_ACCESS_KEY_ID) {
    const key = file.storageUrl.split(".amazonaws.com/")[1];
    if (key) {
      await s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET_NAME, Key: key })).catch(() => {});
    }
  }

  await prisma.file.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
