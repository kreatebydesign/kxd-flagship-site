/**
 * POST /api/portal/auth/reset-password
 */
import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { token?: string; password?: string };
    const token = body.token?.trim();
    const password = body.password;

    if (!token || !password || password.length < 8) {
      return NextResponse.json(
        { ok: false, message: "A valid token and password (8+ characters) are required." },
        { status: 400 },
      );
    }

    const payload = await getPayload({ config });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await payload.resetPassword({
      collection: "portal-users" as any,
      data: { token, password },
      overrideAccess: true,
    });

    if (!result) {
      return NextResponse.json(
        { ok: false, message: "This reset link is invalid or has expired." },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[KXD Portal] Reset password error:", err);
    return NextResponse.json(
      { ok: false, message: "This reset link is invalid or has expired." },
      { status: 400 },
    );
  }
}
