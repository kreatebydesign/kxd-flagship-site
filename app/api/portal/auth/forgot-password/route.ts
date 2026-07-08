/**
 * POST /api/portal/auth/forgot-password
 */
import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { email?: string };
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { ok: false, message: "Email is required." },
        { status: 400 },
      );
    }

    const payload = await getPayload({ config });
    const origin = req.nextUrl.origin;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const token = await payload.forgotPassword({
      collection: "portal-users" as any,
      data: { email },
      disableEmail: true,
    });

    if (!token) {
      // Always return success to avoid email enumeration
      return NextResponse.json({ ok: true });
    }

    const resetUrl = `${origin}/portal/reset-password?token=${encodeURIComponent(token)}`;
    const apiKey = process.env.RESEND_API_KEY?.trim();

    if (apiKey) {
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL?.trim() || "Kreate by Design <hello@kreatebydesign.com>",
        to: email,
        subject: "Reset your KXD Client Portal password",
        html: `
          <p>You requested a password reset for your KXD Client Portal account.</p>
          <p><a href="${resetUrl}">Reset your password</a></p>
          <p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
        `,
      });
    } else if (process.env.NODE_ENV !== "production") {
      console.info("[KXD Portal] Local dev password reset link:", resetUrl);
    } else {
      console.warn("[KXD Portal] RESEND_API_KEY not set — password reset email not sent.");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[KXD Portal] Forgot password error:", err);
    return NextResponse.json({ ok: true });
  }
}
