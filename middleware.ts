import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  hasPayloadAuthCookie,
  payloadAdminLoginUrl,
} from "@/lib/admin/middleware";
import { PORTAL_SESSION_COOKIE } from "@/lib/portal/constants";
import { JUNIOR_CREATOR_SESSION_COOKIE } from "@/lib/junior-creators/constants";

const PORTAL_PUBLIC_PATHS = [
  "/portal/login",
  "/portal/forgot-password",
  "/portal/reset-password",
];

const JUNIOR_PUBLIC_PATHS = [
  "/junior-creators/login",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/operations" || pathname.startsWith("/admin/operations/")) {
    if (!hasPayloadAuthCookie(request)) {
      return NextResponse.redirect(payloadAdminLoginUrl(request, pathname));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/portal")) {
    const isPublic = PORTAL_PUBLIC_PATHS.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    );
    const hasSession = Boolean(request.cookies.get(PORTAL_SESSION_COOKIE)?.value);

    if (isPublic) {
      if (hasSession && pathname.startsWith("/portal/login")) {
        return NextResponse.redirect(new URL("/portal", request.url));
      }
      return NextResponse.next();
    }

    if (!hasSession) {
      const loginUrl = new URL("/portal/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/junior-creators")) {
    const isPublic = JUNIOR_PUBLIC_PATHS.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    );
    const hasSession = Boolean(request.cookies.get(JUNIOR_CREATOR_SESSION_COOKIE)?.value);

    if (isPublic) {
      if (hasSession && pathname.startsWith("/junior-creators/login")) {
        return NextResponse.redirect(new URL("/junior-creators", request.url));
      }
      return NextResponse.next();
    }

    if (!hasSession) {
      const loginUrl = new URL("/junior-creators/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/operations",
    "/admin/operations/:path*",
    "/portal/:path*",
    "/junior-creators/:path*",
  ],
};
