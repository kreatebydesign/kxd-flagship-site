/**
 * POST /api/portal/auth/forgot-password
 */
import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import {
  buildPasswordResetEmailHtml,
  resolvePortalResetOrigin,
  sendPortalEmail,
} from "@/lib/portal/email";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { ok: false, message: "Email is required." },
        { status: 400 },
      );
    }

    const payload = await getPayload({ config });
    const origin = resolvePortalResetOrigin(req);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const token = await payload.forgotPassword({
      collection: "portal-users" as any,
      data: { email },
      disableEmail: true,
      overrideAccess: true,
    });

    if (!token) {
      // Always return success to avoid email enumeration.
      console.info("[KXD Portal] Password reset: no matching portal user — email not sent.");
      return NextResponse.json({ ok: true });
    }

    const resetUrl = `${origin}/portal/reset-password?token=${encodeURIComponent(token)}`;

    if (process.env.NODE_ENV !== "production" && !process.env.RESEND_API_KEY?.trim()) {
      console.info("[KXD Portal] Local dev password reset link:", resetUrl);
      return NextResponse.json({ ok: true });
    }

    const sendResult = await sendPortalEmail({
      to: email,
      subject: "Reset your KXD Client Portal password",
      html: buildPasswordResetEmailHtml(resetUrl),
    });

    if (!sendResult.resendConfigured) {
      return NextResponse.json({ ok: true });
    }

    if (!sendResult.sent) {
      console.error(
        "[KXD Portal] Password reset Resend send failed:",
        sendResult.errorMessage ?? "unknown error",
      );
      return NextResponse.json({ ok: true });
    }

    console.info("[KXD Portal] Password reset email sent via Resend.");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[KXD Portal] Forgot password error:", err);
    return NextResponse.json({ ok: true });
  }
}
