import { SignJWT, jwtVerify } from "jose";
import { Role } from "@/lib/generated/prisma/client";

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "dev-secret-change-in-production");

export interface DeviceToken {
  deviceId: string;
  companyId: string;
  role: Role;
}

export async function signToken(payload: DeviceToken): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifyToken(token: string): Promise<DeviceToken | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as DeviceToken;
  } catch {
    return null;
  }
}

export function generateCompanyCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "BK-";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function hashPassphrase(passphrase: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(passphrase);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyPassphrase(passphrase: string, hash: string): Promise<boolean> {
  const computed = await hashPassphrase(passphrase);
  return computed === hash;
}
