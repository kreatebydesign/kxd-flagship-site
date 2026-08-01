/**
 * Short-lived signed cookie for password → TOTP challenge handoff.
 */

import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getPayload } from "payload";
import config from "@payload-config";

export const PORTAL_PENDING_MFA_COOKIE = "kxd-portal-pending-mfa";
const TTL_MS = 10 * 60 * 1000;

async function secret(): Promise<string> {
  const payload = await getPayload({ config });
  return payload.secret;
}

function sign(portalUserId: number, exp: number, sec: string): string {
  const body = `${portalUserId}.${exp}`;
  const sig = createHmac("sha256", sec).update(`pending-mfa:${body}`).digest("hex");
  return `${body}.${sig}`;
}

export async function setPendingMfaCookie(portalUserId: number): Promise<void> {
  const sec = await secret();
  const exp = Date.now() + TTL_MS;
  const cookieStore = await cookies();
  cookieStore.set(PORTAL_PENDING_MFA_COOKIE, sign(portalUserId, exp, sec), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(TTL_MS / 1000),
  });
}

export async function clearPendingMfaCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(PORTAL_PENDING_MFA_COOKIE);
}

export async function readPendingMfaPortalUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(PORTAL_PENDING_MFA_COOKIE)?.value;
  if (!raw) return null;
  const [idPart, expPart, sig] = raw.split(".");
  if (!idPart || !expPart || !sig) return null;
  const portalUserId = Number(idPart);
  const exp = Number(expPart);
  if (!Number.isFinite(portalUserId) || !Number.isFinite(exp) || Date.now() > exp) {
    return null;
  }
  const sec = await secret();
  const expected = createHmac("sha256", sec)
    .update(`pending-mfa:${portalUserId}.${exp}`)
    .digest("hex");
  try {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return portalUserId;
}
