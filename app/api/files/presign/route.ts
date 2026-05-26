import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireAuth } from "@/lib/rbac";
import { inferBucket } from "@/lib/bucket-sort";

const s3 = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  },
});

export const POST = requireAuth(async (req: NextRequest) => {
  const { filename, contentType, projectId } = await req.json();

  if (!filename || !contentType || !projectId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!process.env.S3_BUCKET_NAME || !process.env.AWS_ACCESS_KEY_ID) {
    return NextResponse.json({ error: "S3 not configured" }, { status: 503 });
  }

  const key = `projects/${projectId}/${Date.now()}-${filename}`;
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  const storageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION ?? "us-east-1"}.amazonaws.com/${key}`;
  const bucket = inferBucket(filename);

  return NextResponse.json({ presignedUrl, storageUrl, key, bucket });
});
