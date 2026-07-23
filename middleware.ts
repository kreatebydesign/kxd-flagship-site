import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  hasPayloadAuthCookie,
  payloadAdminLoginUrl,
  requiresPayloadAdminAuth,
} from "@/lib/admin/middleware";
import { PORTAL_SESSION_COOKIE, PORTAL_HOST } from "@/lib/portal/constants";
import { JUNIOR_CREATOR_SESSION_COOKIE } from "@/lib/junior-creators/constants";
import {
  isAuthorizedCronBearer,
  isReportingAdminIngestPath,
} from "@/lib/reporting/ingest/cron-auth";

const PORTAL_PUBLIC_PATHS = [
  "/portal/login",
  "/portal/forgot-password",
  "/portal/reset-password",
];

const JUNIOR_PUBLIC_PATHS = [
  "/junior-creators/login",
];

function isPortalHost(request: NextRequest): boolean {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  return host === PORTAL_HOST;
}

/** Signed portal session shape: `{portalUserId}.{sha256Hex}` (64 hex chars). */
function isWellFormedPortalSessionCookie(value: string | undefined): boolean {
  if (!value) return false;
  return /^\d+\.[a-f0-9]{64}$/i.test(value);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/" && isPortalHost(request)) {
    return NextResponse.redirect(new URL("/portal/login", request.url));
  }

  if (requiresPayloadAdminAuth(pathname)) {
    if (!hasPayloadAuthCookie(request)) {
      return NextResponse.redirect(payloadAdminLoginUrl(request, pathname));
    }
    return NextResponse.next();
  }

  // Cron surfaces — fail closed. Require valid CRON_SECRET bearer. No cookie bypass.
  if (pathname.startsWith("/api/cron/")) {
    if (!isAuthorizedCronBearer(request.headers.get("authorization"))) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 },
      );
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/admin/")) {
    const authHeader = request.headers.get("authorization");
    // Cron bearer is scoped ONLY to reporting ingest — never the whole admin API.
    const hasScopedCronBearer =
      isReportingAdminIngestPath(pathname) && isAuthorizedCronBearer(authHeader);
    if (!hasScopedCronBearer && !hasPayloadAuthCookie(request)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 },
      );
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/portal")) {
    const isPublic = PORTAL_PUBLIC_PATHS.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    );
    const rawSession = request.cookies.get(PORTAL_SESSION_COOKIE)?.value;
    // Presence alone is not enough — forged/malformed cookies must not count as
    // authenticated, or login↔workspace redirects can loop forever.
    const hasSession = isWellFormedPortalSessionCookie(rawSession);

    if (rawSession && !hasSession) {
      const response = isPublic
        ? NextResponse.next()
        : NextResponse.redirect(
            (() => {
              const loginUrl = new URL("/portal/login", request.url);
              loginUrl.searchParams.set("redirect", pathname);
              return loginUrl;
            })(),
          );
      response.cookies.set(PORTAL_SESSION_COOKIE, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      return response;
    }

    if (isPublic) {
      // Do not bounce /portal/login → /portal from cookie presence alone.
      // Valid sessions are redirected by the login page after getPortalSession().
      // Cookie-only bounce caused ERR_TOO_MANY_REDIRECTS for invalid sessions.
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
    "/",
    "/os",
    "/admin/operations",
    "/admin/operations/:path*",
    "/admin/work",
    "/admin/work/:path*",
    "/admin/sales",
    "/admin/sales/:path*",
    "/admin/training",
    "/admin/training/:path*",
    "/api/admin/:path*",
    "/api/cron/:path*",
    "/portal/:path*",
    "/junior-creators/:path*",
  ],
};
