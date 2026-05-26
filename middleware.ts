import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/register", "/join"];
const API_PUBLIC = ["/api/auth/register", "/api/auth/join"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public auth pages and API routes
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (API_PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) return NextResponse.next();

  // For API routes, token is in Authorization header — let route handlers verify
  if (pathname.startsWith("/api/")) return NextResponse.next();

  // For page routes, check token in cookie (set client-side after login)
  const token = req.cookies.get("bb_token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/register", req.url));
  }

  const device = await verifyToken(token);
  if (!device) {
    const res = NextResponse.redirect(new URL("/register", req.url));
    res.cookies.delete("bb_token");
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
