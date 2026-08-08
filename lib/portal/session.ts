import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";

import { isStudioPayloadOperator } from "../../payload/access/index.ts";
import { getPayloadAdminUser } from "@/lib/admin/auth";
import { PORTAL_SESSION_COOKIE } from "./constants";
import {
  listPortalMembershipsForUser,
  resolveAuthorizedActiveClient,
} from "./memberships";
import { getOperatorPortalPreviewCookieSession } from "./operator-preview/cookie";
import type { OperatorPortalPreviewSession } from "./operator-preview/types";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type PortalSession = {
  portalUserId: number;
  clientId: number;
  email: string;
  displayName: string;
  clientName: string;
  welcomeCompletedAt: string | null;
  /** True when a studio operator is previewing this client portal. */
  isOperatorPreview: boolean;
  /** Present only for operator preview — never a portal-user identity. */
  operatorPreview: OperatorPortalPreviewSession | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

/** Must match payload.config.ts secret resolution (incl. dev fallback). */
async function getPayloadSecret(): Promise<string> {
  const payload = await getPayload({ config });
  return payload.secret;
}

function signPortalUserId(portalUserId: number, secret: string): string {
  const sig = createHmac("sha256", secret)
    .update(`portal:${portalUserId}`)
    .digest("hex");
  return `${portalUserId}.${sig}`;
}

function parseSignedSession(value: string, secret: string): number | null {
  const [idPart, sig] = value.split(".");
  if (!idPart || !sig) return null;
  const portalUserId = Number(idPart);
  if (!Number.isFinite(portalUserId)) return null;
  const expected = createHmac("sha256", secret)
    .update(`portal:${portalUserId}`)
    .digest("hex");
  if (sig.length !== expected.length) return null;
  try {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return portalUserId;
}

function resolveLegacyClient(user: AnyDoc): {
  clientId: number;
  clientName: string;
} | null {
  const clientRaw = user.client;
  const clientId =
    typeof clientRaw === "number"
      ? clientRaw
      : typeof clientRaw === "object" && clientRaw !== null
        ? ((clientRaw as AnyDoc).id as number)
        : null;

  if (!clientId || !Number.isFinite(clientId)) return null;

  const clientName =
    typeof clientRaw === "object" && clientRaw !== null && "name" in clientRaw
      ? String((clientRaw as AnyDoc).name ?? "")
      : "Your Company";

  return { clientId, clientName: clientName || "Your Company" };
}

function asPortalUserSession(input: {
  portalUserId: number;
  clientId: number;
  email: string;
  displayName: string;
  clientName: string;
  welcomeCompletedAt: string | null;
}): PortalSession {
  return {
    ...input,
    isOperatorPreview: false,
    operatorPreview: null,
  };
}

async function resolveOperatorPreviewSession(): Promise<PortalSession | null> {
  const preview = await getOperatorPortalPreviewCookieSession();
  if (!preview) return null;

  const admin = await getPayloadAdminUser();
  if (!admin || !isStudioPayloadOperator(admin)) {
    return null;
  }

  const adminId = Number(admin.id);
  if (!Number.isFinite(adminId) || adminId !== preview.adminUserId) {
    // Cookie must match the currently authenticated studio operator.
    return null;
  }

  // Re-validate client still exists (fail closed if deleted).
  try {
    const payload = await getPayload({ config });
    const client = (await payload.findByID({
      collection: "clients",
      id: preview.clientId,
      depth: 0,
      overrideAccess: true,
    })) as AnyDoc | null;
    if (!client) return null;
    const clientName = String(client.name ?? preview.clientName ?? "Client");
    return {
      // Sentinel — never a real portal-users row. Writes must check isOperatorPreview.
      portalUserId: 0,
      clientId: preview.clientId,
      email: preview.adminEmail,
      displayName: `Operator Preview · ${clientName}`,
      clientName,
      // Skip welcome / MFA enrollment gates for operator preview.
      welcomeCompletedAt: preview.startedAt,
      isOperatorPreview: true,
      operatorPreview: {
        ...preview,
        clientName,
      },
    };
  } catch {
    return null;
  }
}

export async function createPortalSession(portalUserId: number): Promise<void> {
  const secret = await getPayloadSecret();
  const cookieStore = await cookies();
  cookieStore.set(PORTAL_SESSION_COOKIE, signPortalUserId(portalUserId, secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroyPortalSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(PORTAL_SESSION_COOKIE);
}

/**
 * Resolve authenticated portal access.
 * Operator preview (studio admin cookie + preview cookie) takes precedence over
 * a portal-user session so preview is never attributed to a client identity.
 * Active client for portal users is resolved server-side from memberships.
 */
export async function getPortalSession(): Promise<PortalSession | null> {
  const previewSession = await resolveOperatorPreviewSession();
  if (previewSession) return previewSession;

  const cookieStore = await cookies();
  const raw = cookieStore.get(PORTAL_SESSION_COOKIE)?.value;
  if (!raw) return null;

  const secret = await getPayloadSecret();
  const portalUserId = parseSignedSession(raw, secret);
  if (!portalUserId) return null;

  const payload = await getPayload({ config });

  try {
    const user = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-users" as any,
      id: portalUserId,
      depth: 1,
      overrideAccess: true,
    })) as AnyDoc;

    if (user.active === false) return null;

    const legacy = resolveLegacyClient(user);
    const lastActiveRaw = user.lastActiveClientId;
    const lastActiveClientId =
      typeof lastActiveRaw === "number" && Number.isFinite(lastActiveRaw)
        ? lastActiveRaw
        : typeof lastActiveRaw === "string" && lastActiveRaw.trim()
          ? Number(lastActiveRaw)
          : null;

    const memberships = await listPortalMembershipsForUser(portalUserId, {
      payload,
    });
    const activeMemberships = memberships.filter((m) => m.status === "active");

    // Memberships exist but none active → fail closed (do not use unauthorized legacy).
    if (memberships.length > 0 && activeMemberships.length === 0) {
      return null;
    }

    let clientId: number;
    let clientName: string;

    if (activeMemberships.length > 0) {
      const resolved = resolveAuthorizedActiveClient({
        memberships: activeMemberships,
        lastActiveClientId:
          lastActiveClientId != null && Number.isFinite(lastActiveClientId)
            ? lastActiveClientId
            : null,
        legacyClientId: legacy?.clientId ?? null,
        legacyClientName: legacy?.clientName ?? null,
      });
      if (!resolved) return null;
      clientId = resolved.clientId;
      clientName = resolved.clientName;
    } else if (legacy) {
      // Compatibility window: no membership rows yet (pre-backfill) → legacy client.
      clientId = legacy.clientId;
      clientName = legacy.clientName;
    } else {
      return null;
    }

    return asPortalUserSession({
      portalUserId,
      clientId,
      email: String(user.email ?? ""),
      displayName: String(user.displayName ?? clientName),
      clientName,
      welcomeCompletedAt: user.welcomeCompletedAt
        ? String(user.welcomeCompletedAt)
        : null,
    });
  } catch {
    return null;
  }
}

/**
 * Portal session that may mutate client-owned data.
 * Operator preview is read-only and returns null (caller → 401/403).
 */
export async function getPortalWriteSession(): Promise<PortalSession | null> {
  const session = await getPortalSession();
  if (!session || session.isOperatorPreview) return null;
  return session;
}

export async function requirePortalSession(): Promise<PortalSession> {
  const session = await getPortalSession();
  if (!session) {
    throw new Error("PORTAL_UNAUTHORIZED");
  }
  return session;
}

/** JSON 403 helper for mutating portal APIs under operator preview. */
export function portalPreviewReadOnlyResponse(): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      success: false,
      error: "Operator preview is read-only. Exit preview to use client actions.",
      code: "operator_preview_readonly",
    },
    { status: 403 },
  );
}

/**
 * Gate a portal API. Returns the session, or a NextResponse error.
 * Pass `{ write: true }` for any mutating route.
 */
export async function gatePortalApiSession(options?: {
  write?: boolean;
}): Promise<PortalSession | NextResponse> {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, success: false, error: "Unauthorized." },
      { status: 401 },
    );
  }
  if (options?.write && session.isOperatorPreview) {
    return portalPreviewReadOnlyResponse();
  }
  return session;
}
