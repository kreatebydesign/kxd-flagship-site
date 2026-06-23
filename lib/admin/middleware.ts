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

/** Preserve the full pathname so post-login navigation hits the real app route. */
export function payloadAdminLoginUrl(request: NextRequest, pathname: string): URL {
  const loginUrl = new URL(PAYLOAD_ADMIN_LOGIN_PATH, request.url);
  loginUrl.searchParams.set("redirect", pathname);
  return loginUrl;
}
