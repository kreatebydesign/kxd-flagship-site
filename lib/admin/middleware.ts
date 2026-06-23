import type { NextRequest } from "next/server";

import {
  PAYLOAD_ADMIN_LOGIN_PATH,
  PAYLOAD_AUTH_COOKIE_PREFIX,
} from "./constants";

export function hasPayloadAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith(PAYLOAD_AUTH_COOKIE_PREFIX));
}

/** Payload login expects redirect paths relative to `/admin` (e.g. `/operations/executive`). */
export function payloadAdminLoginUrl(request: NextRequest, pathname: string): URL {
  const loginUrl = new URL(PAYLOAD_ADMIN_LOGIN_PATH, request.url);
  const redirectPath = pathname.startsWith("/admin")
    ? pathname.slice("/admin".length) || "/operations"
    : pathname;
  loginUrl.searchParams.set("redirect", redirectPath);
  return loginUrl;
}
