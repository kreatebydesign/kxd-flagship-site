/**
 * POST /api/portal/auth/login
 */
import { NextRequest, NextResponse } from "next/server";
import { AuthenticationError } from "payload";
import { getPayload } from "payload";
import config from "@payload-config";
import { createPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

const PORTAL_USERS_COLLECTION = "portal-users";

async function portalUserExists(email: string): Promise<boolean> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: PORTAL_USERS_COLLECTION as any,
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await payload.login({
      collection: PORTAL_USERS_COLLECTION as any,
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
          message: "This workspace account isn't active. Please reach out to us for help.",
        },
        { status: 403 },
      );
    }

    await createPortalSession(result.user.id as number);

    return NextResponse.json({ ok: true });
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
