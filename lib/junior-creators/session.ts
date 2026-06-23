import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getPayload } from "payload";
import config from "@payload-config";

import { JUNIOR_CREATOR_SESSION_COOKIE } from "./constants";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export type JuniorCreatorSession = {
  juniorCreatorUserId: number;
  email: string;
  displayName: string;
  role: string;
  hourlyRateCents: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function getSecret(): string {
  const secret = process.env.PAYLOAD_SECRET?.trim();
  if (!secret) throw new Error("PAYLOAD_SECRET is not configured.");
  return secret;
}

function signUserId(userId: number): string {
  const sig = createHmac("sha256", getSecret())
    .update(`junior-creator:${userId}`)
    .digest("hex");
  return `${userId}.${sig}`;
}

function parseSignedSession(value: string): number | null {
  const [idPart, sig] = value.split(".");
  if (!idPart || !sig) return null;
  const userId = Number(idPart);
  if (!Number.isFinite(userId)) return null;
  const expected = createHmac("sha256", getSecret())
    .update(`junior-creator:${userId}`)
    .digest("hex");
  if (sig.length !== expected.length) return null;
  try {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return userId;
}

export async function createJuniorCreatorSession(userId: number): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(JUNIOR_CREATOR_SESSION_COOKIE, signUserId(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroyJuniorCreatorSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(JUNIOR_CREATOR_SESSION_COOKIE);
}

export async function getJuniorCreatorSession(): Promise<JuniorCreatorSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(JUNIOR_CREATOR_SESSION_COOKIE)?.value;
  if (!raw) return null;

  const userId = parseSignedSession(raw);
  if (!userId) return null;

  const payload = await getPayload({ config });

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await payload.findByID({
      collection: "junior-creator-users" as any,
      id: userId,
      depth: 0,
      overrideAccess: true,
    }) as AnyDoc;

    if (!user.active) return null;

    return {
      juniorCreatorUserId: userId,
      email: String(user.email ?? ""),
      displayName: String(user.displayName ?? "Junior Creator"),
      role: String(user.role ?? "junior_creator"),
      hourlyRateCents: Number(user.hourlyRateCents ?? 800),
    };
  } catch {
    return null;
  }
}

export async function requireJuniorCreatorSession(): Promise<JuniorCreatorSession> {
  const session = await getJuniorCreatorSession();
  if (!session) {
    throw new Error("JUNIOR_CREATOR_UNAUTHORIZED");
  }
  return session;
}
