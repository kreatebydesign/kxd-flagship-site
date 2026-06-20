import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getPayload } from "payload";
import config from "@payload-config";

import { PORTAL_SESSION_COOKIE } from "./constants";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type PortalSession = {
  portalUserId: number;
  clientId: number;
  email: string;
  displayName: string;
  clientName: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function getSecret(): string {
  const secret = process.env.PAYLOAD_SECRET?.trim();
  if (!secret) throw new Error("PAYLOAD_SECRET is not configured.");
  return secret;
}

function signPortalUserId(portalUserId: number): string {
  const sig = createHmac("sha256", getSecret())
    .update(`portal:${portalUserId}`)
    .digest("hex");
  return `${portalUserId}.${sig}`;
}

function parseSignedSession(value: string): number | null {
  const [idPart, sig] = value.split(".");
  if (!idPart || !sig) return null;
  const portalUserId = Number(idPart);
  if (!Number.isFinite(portalUserId)) return null;
  const expected = createHmac("sha256", getSecret())
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

export async function createPortalSession(portalUserId: number): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(PORTAL_SESSION_COOKIE, signPortalUserId(portalUserId), {
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

export async function getPortalSession(): Promise<PortalSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(PORTAL_SESSION_COOKIE)?.value;
  if (!raw) return null;

  const portalUserId = parseSignedSession(raw);
  if (!portalUserId) return null;

  const payload = await getPayload({ config });

  try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await payload.findByID({
      collection: "portal-users" as any,
      id: portalUserId,
      depth: 1,
      overrideAccess: true,
    }) as AnyDoc;

    const clientRaw = user.client;
    const clientId =
      typeof clientRaw === "number"
        ? clientRaw
        : typeof clientRaw === "object" && clientRaw !== null
          ? (clientRaw as AnyDoc).id as number
          : null;

    if (!clientId) return null;

    const clientName =
      typeof clientRaw === "object" && clientRaw !== null && "name" in clientRaw
        ? String((clientRaw as AnyDoc).name ?? "")
        : "Your Company";

    return {
      portalUserId,
      clientId,
      email: String(user.email ?? ""),
      displayName: String(user.displayName ?? clientName),
      clientName,
    };
  } catch {
    return null;
  }
}

export async function requirePortalSession(): Promise<PortalSession> {
  const session = await getPortalSession();
  if (!session) {
    throw new Error("PORTAL_UNAUTHORIZED");
  }
  return session;
}
