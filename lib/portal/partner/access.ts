import "server-only";

import { NextResponse } from "next/server";
import {
  getPortalSession,
  getPortalWriteSession,
  portalPreviewReadOnlyResponse,
  type PortalSession,
} from "@/lib/portal/session";

export function isPartnerSession(
  session: PortalSession | null | undefined,
): session is PortalSession & {
  accessMode: "partner";
  partnerId: number;
} {
  return Boolean(
    session &&
      session.accessMode === "partner" &&
      typeof session.partnerId === "number" &&
      session.partnerId > 0,
  );
}

export function isClientPortalSession(
  session: PortalSession | null | undefined,
): session is PortalSession & {
  accessMode: "client";
  clientId: number;
} {
  return Boolean(
    session &&
      session.accessMode !== "partner" &&
      typeof session.clientId === "number" &&
      session.clientId > 0,
  );
}

/** Partner session for SSR pages. Returns null when unauthorized. */
export async function getPartnerSession(): Promise<
  (PortalSession & { accessMode: "partner"; partnerId: number }) | null
> {
  const session = await getPortalSession();
  if (!isPartnerSession(session)) return null;
  return session;
}

/** Partner write session — Operator Preview fails closed. */
export async function getPartnerWriteSession(): Promise<
  (PortalSession & { accessMode: "partner"; partnerId: number }) | null
> {
  const session = await getPortalWriteSession();
  if (!isPartnerSession(session)) return null;
  return session;
}

export async function gatePartnerApiSession(options?: {
  write?: boolean;
}): Promise<
  | (PortalSession & { accessMode: "partner"; partnerId: number })
  | NextResponse
> {
  const session = options?.write
    ? await getPartnerWriteSession()
    : await getPartnerSession();

  if (!session) {
    const preview = await getPortalSession();
    if (options?.write && preview?.isOperatorPreview && isPartnerSession(preview)) {
      return portalPreviewReadOnlyResponse();
    }
    return NextResponse.json(
      { ok: false, success: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  return session;
}
