import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { inferBucket } from "@/lib/bucket-sort";
import { Bucket } from "@/lib/generated/prisma/client";

// POST /api/files — save file metadata after S3 upload
export const POST = requireAuth(async (req) => {
  const { projectId, filename, storageUrl, sizeBytes, contentType, bucket } = await req.json();

  if (!projectId || !filename || !storageUrl || !sizeBytes || !contentType) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.companyId !== req.device.companyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const resolvedBucket: Bucket = bucket ?? inferBucket(filename);

  const file = await prisma.file.create({
    data: { projectId, filename, storageUrl, sizeBytes, contentType, bucket: resolvedBucket },
  });

  return NextResponse.json(file, { status: 201 });
});
