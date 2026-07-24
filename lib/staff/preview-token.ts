/**
 * Staff preview token — pure crypto helpers (no server-only).
 * Cookie read/write stays in preview.ts.
 */

import { createHmac, timingSafeEqual } from "crypto";
import type { StaffPreviewSession } from "./types";

const PREVIEW_TTL_MS = 1000 * 60 * 60; // 1 hour

function previewSecret(): string {
  return (
    process.env.PAYLOAD_SECRET?.trim() ||
    process.env.KXD_PORTAL_SESSION_SECRET?.trim() ||
    "kxd-staff-preview-dev-only"
  );
}

function sign(payload: string): string {
  return createHmac("sha256", previewSecret()).update(payload).digest("hex");
}

export function encodeStaffPreviewSession(
  session: StaffPreviewSession,
): string {
  const body = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

export function decodeStaffPreviewSession(
  raw: string | undefined | null,
): StaffPreviewSession | null {
  if (!raw) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  try {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as StaffPreviewSession;
    if (!parsed?.staffUserId || !parsed?.adminUserId || !parsed?.expiresAt) {
      return null;
    }
    if (new Date(parsed.expiresAt).getTime() < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function buildStaffPreviewSession(input: {
  staffUserId: number;
  staffLabel: string;
  adminUserId: number;
}): StaffPreviewSession {
  const startedAt = new Date().toISOString();
  return {
    staffUserId: input.staffUserId,
    staffLabel: input.staffLabel,
    adminUserId: input.adminUserId,
    startedAt,
    expiresAt: new Date(Date.now() + PREVIEW_TTL_MS).toISOString(),
  };
}

export const STAFF_PREVIEW_TTL_MS = PREVIEW_TTL_MS;
