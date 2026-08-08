/**
 * Operator portal preview token — pure crypto helpers (no server-only).
 * Cookie read/write stays in cookie.ts.
 */

import { createHmac, timingSafeEqual } from "crypto";
import type { OperatorPortalPreviewSession } from "./types";

const PREVIEW_TTL_MS = 1000 * 60 * 60; // 1 hour

function previewSecret(): string {
  return (
    process.env.PAYLOAD_SECRET?.trim() ||
    process.env.KXD_PORTAL_SESSION_SECRET?.trim() ||
    "kxd-operator-portal-preview-dev-only"
  );
}

function sign(payload: string): string {
  return createHmac("sha256", previewSecret()).update(payload).digest("hex");
}

export function encodeOperatorPortalPreviewSession(
  session: OperatorPortalPreviewSession,
): string {
  const body = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

export function decodeOperatorPortalPreviewSession(
  raw: string | undefined | null,
): OperatorPortalPreviewSession | null {
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
    ) as OperatorPortalPreviewSession;
    if (
      parsed?.kind !== "operator-portal-preview" ||
      !parsed.adminUserId ||
      !parsed.clientId ||
      !parsed.expiresAt
    ) {
      return null;
    }
    if (!Number.isFinite(parsed.adminUserId) || parsed.adminUserId <= 0) {
      return null;
    }
    if (!Number.isFinite(parsed.clientId) || parsed.clientId <= 0) {
      return null;
    }
    if (new Date(parsed.expiresAt).getTime() < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function buildOperatorPortalPreviewSession(input: {
  adminUserId: number;
  adminEmail: string;
  clientId: number;
  clientName: string;
  clientSlug: string | null;
}): OperatorPortalPreviewSession {
  const startedAt = new Date().toISOString();
  return {
    kind: "operator-portal-preview",
    adminUserId: input.adminUserId,
    adminEmail: input.adminEmail.trim().toLowerCase(),
    clientId: input.clientId,
    clientName: input.clientName,
    clientSlug: input.clientSlug,
    startedAt,
    expiresAt: new Date(Date.now() + PREVIEW_TTL_MS).toISOString(),
  };
}

export const OPERATOR_PORTAL_PREVIEW_TTL_MS = PREVIEW_TTL_MS;
