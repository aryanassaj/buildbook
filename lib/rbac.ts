import { NextRequest, NextResponse } from "next/server";
import { Role } from "@/lib/generated/prisma/client";
import { verifyToken, DeviceToken } from "./auth";

export type AuthedRequest = NextRequest & { device: DeviceToken };

type RouteHandler = (req: AuthedRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<NextResponse>;

export function requireRole(...roles: Role[]) {
  return function (handler: RouteHandler) {
    return async function (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
      const token = req.headers.get("authorization")?.replace("Bearer ", "");
      if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const device = await verifyToken(token);
      if (!device) {
        return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
      }

      if (roles.length > 0 && !roles.includes(device.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      (req as AuthedRequest).device = device;
      return handler(req as AuthedRequest, ctx);
    };
  };
}

export const requireAuth = requireRole();
export const requireAdmin = requireRole(Role.ADMIN);
export const requireManager = requireRole(Role.ADMIN, Role.MANAGER);
