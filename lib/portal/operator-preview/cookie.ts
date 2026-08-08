import "server-only";

import { cookies } from "next/headers";
import {
  decodeOperatorPortalPreviewSession,
  encodeOperatorPortalPreviewSession,
  OPERATOR_PORTAL_PREVIEW_TTL_MS,
} from "./token";
import type { OperatorPortalPreviewSession } from "./types";
import { OPERATOR_PORTAL_PREVIEW_COOKIE } from "../constants";

export async function getOperatorPortalPreviewCookieSession(): Promise<OperatorPortalPreviewSession | null> {
  const jar = await cookies();
  return decodeOperatorPortalPreviewSession(
    jar.get(OPERATOR_PORTAL_PREVIEW_COOKIE)?.value,
  );
}

export async function clearOperatorPortalPreviewCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(OPERATOR_PORTAL_PREVIEW_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function setOperatorPortalPreviewCookie(
  session: OperatorPortalPreviewSession,
): Promise<void> {
  const jar = await cookies();
  jar.set(
    OPERATOR_PORTAL_PREVIEW_COOKIE,
    encodeOperatorPortalPreviewSession(session),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: Math.floor(OPERATOR_PORTAL_PREVIEW_TTL_MS / 1000),
    },
  );
}
