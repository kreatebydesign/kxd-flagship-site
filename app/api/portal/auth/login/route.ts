/**
 * POST /api/portal/auth/login
 *
 * Uses Payload LocalAPI `payload.login` so lockout / loginAttempts are enforced.
 * Session cookie is custom `kxd-portal-session` only — LocalAPI login does NOT call
 * setPayloadAuthCookie, so this path does not overwrite admin `payload-token`.
 */
import { NextRequest, NextResponse } from "next/server";
import { AuthenticationError, type CollectionSlug, getPayload } from "payload";
import config from "@payload-config";
import { createPortalSession } from "@/lib/portal/session";
import { getMfaSettings } from "@/lib/portal/identity/mfa-store";
import { setPendingMfaCookie } from "@/lib/portal/identity/pending-mfa";
import {
  assertPortalRateLimit,
  clientIpFromRequest,
} from "@/lib/portal/identity/rate-limit";
import { appendPortalSecurityEvent } from "@/lib/portal/identity/security-events";

export const dynamic = "force-dynamic";

const PORTAL_USERS_COLLECTION = "portal-users" satisfies CollectionSlug;

async function portalUserExists(email: string): Promise<boolean> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: PORTAL_USERS_COLLECTION,
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return result.docs.length > 0;
}

export async function POST(req: NextRequest) {
  let email: string | undefined;

  try {
    const rate = assertPortalRateLimit({
      bucket: "portal-login",
      identity: clientIpFromRequest(req),
    });
    if (!rate.ok) {
      return NextResponse.json(
        { ok: false, message: "Too many sign-in attempts. Please try again shortly." },
        { status: 429 },
      );
    }

    const body = (await req.json()) as { email?: string; password?: string };
    email = body.email?.trim().toLowerCase();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, message: "Email and password are required." },
        { status: 400 },
      );
    }

    const payload = await getPayload({ config });

    // LocalAPI login: verifies hash via authenticateLocalStrategy, enforces
    // maxLoginAttempts/lockUntil, resets attempts on success. Does not set cookies.
    const result = await payload.login({
      collection: PORTAL_USERS_COLLECTION,
      data: { email, password },
    });

    if (!result.user?.id) {
      return NextResponse.json(
        { ok: false, message: "We couldn't sign you in. Please check your email and password." },
        { status: 401 },
      );
    }

    const portalUser = result.user as { id: number; active?: boolean };
    if (portalUser.active === false) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "This workspace account isn't active. Please reach out to us for help.",
        },
        { status: 403 },
      );
    }

    const portalUserId = result.user.id as number;
    const mfa = await getMfaSettings(portalUserId);
    if (mfa.totpEnabled) {
      await setPendingMfaCookie(portalUserId);
      await appendPortalSecurityEvent({
        type: "login.mfa_required",
        actorKind: "portal-user",
        actorPortalUserId: portalUserId,
        summary: "Password verified — MFA required",
      });
      return NextResponse.json({ ok: true, mfaRequired: true });
    }

    await createPortalSession(portalUserId);
    await appendPortalSecurityEvent({
      type: "login.password",
      actorKind: "portal-user",
      actorPortalUserId: portalUserId,
      summary: "Password login succeeded",
    });

    return NextResponse.json({ ok: true, mfaRequired: false });
  } catch (err) {
    console.error("[KXD Portal] Login failed:", err);

    if (err instanceof Error && err.message.includes("PAYLOAD_SECRET")) {
      return NextResponse.json(
        {
          ok: false,
          message:
            process.env.NODE_ENV === "production"
              ? "Sign-in is temporarily unavailable. Please try again shortly."
              : "PAYLOAD_SECRET is missing from .env.local. Copy it from .env.production.local or .env.example.",
        },
        { status: 500 },
      );
    }

    const isDev = process.env.NODE_ENV !== "production";
    if (
      isDev &&
      email &&
      err instanceof AuthenticationError &&
      (await portalUserExists(email))
    ) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Invalid email or password. This account exists but credentials may not be set. " +
            "Run: npm run seed:portal-user -- --email " +
            email +
            " --password 'YourPassword' --client <client-slug> --display-name Name",
        },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { ok: false, message: "We couldn't sign you in. Please check your email and password." },
      { status: 401 },
    );
  }
}
