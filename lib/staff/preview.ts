import "server-only";

import { cookies } from "next/headers";
import {
  decodeStaffPreviewSession,
  encodeStaffPreviewSession,
  STAFF_PREVIEW_TTL_MS,
} from "./preview-token";
import type { StaffPreviewSession } from "./types";

export const STAFF_PREVIEW_COOKIE = "kxd-staff-preview";

export {
  buildStaffPreviewSession,
  decodeStaffPreviewSession,
  encodeStaffPreviewSession,
} from "./preview-token";

export async function getStaffPreviewSession(): Promise<StaffPreviewSession | null> {
  const jar = await cookies();
  return decodeStaffPreviewSession(jar.get(STAFF_PREVIEW_COOKIE)?.value);
}

export async function clearStaffPreviewCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(STAFF_PREVIEW_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function setStaffPreviewCookie(
  session: StaffPreviewSession,
): Promise<void> {
  const jar = await cookies();
  jar.set(STAFF_PREVIEW_COOKIE, encodeStaffPreviewSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(STAFF_PREVIEW_TTL_MS / 1000),
  });
}
