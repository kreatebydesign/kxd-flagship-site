/**
 * POST /api/junior-creators/auth/login
 */
import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { createJuniorCreatorSession } from "@/lib/junior-creators/session";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase();
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
      collection: "junior-creator-users" as any,
      data: { email, password },
    });

    const user = result.user as AnyDoc | undefined;
    if (!user?.id) {
      return NextResponse.json(
        { ok: false, message: "Invalid email or password." },
        { status: 401 },
      );
    }

    if (!user.active) {
      return NextResponse.json(
        { ok: false, message: "This account is inactive. Contact KXD leadership." },
        { status: 403 },
      );
    }

    await createJuniorCreatorSession(user.id as number);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[KXD Junior Creators] Login failed:", err);
    return NextResponse.json(
      { ok: false, message: "Invalid email or password." },
      { status: 401 },
    );
  }
}
