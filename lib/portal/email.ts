import type { NextRequest } from "next/server";
import { Resend } from "resend";
import { PORTAL_HOST } from "./constants";

const DEFAULT_FROM = "Kreate by Design <hello@kreatebydesign.com>";

export function isPortalResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function resolvePortalFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM;
}

export function logMissingPortalEmailEnv(context: string): void {
  const missing: string[] = [];
  if (!process.env.RESEND_API_KEY?.trim()) missing.push("RESEND_API_KEY");
  if (!process.env.RESEND_FROM_EMAIL?.trim()) missing.push("RESEND_FROM_EMAIL");

  if (missing.length > 0) {
    console.warn(
      `[KXD Portal] ${context}: missing ${missing.join(", ")} — reset email not sent.`,
    );
  }
}

export function resolvePortalResetOrigin(request: NextRequest): string {
  const configured = process.env.PORTAL_PUBLIC_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  if (host === PORTAL_HOST) {
    return `${request.nextUrl.protocol}//${host}`;
  }

  if (process.env.NODE_ENV === "production") {
    return `https://${PORTAL_HOST}`;
  }

  return request.nextUrl.origin;
}

export interface PortalEmailSendResult {
  sent: boolean;
  resendConfigured: boolean;
  errorMessage?: string;
}

export async function sendPortalEmail(input: {
  to: string;
  subject: string;
  html: string;
}): Promise<PortalEmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    logMissingPortalEmailEnv("sendPortalEmail");
    return { sent: false, resendConfigured: false };
  }

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from: resolvePortalFromEmail(),
    to: input.to,
    subject: input.subject,
    html: input.html,
  });

  if (result.error) {
    return {
      sent: false,
      resendConfigured: true,
      errorMessage: result.error.message,
    };
  }

  return { sent: true, resendConfigured: true };
}

export function buildPasswordResetEmailHtml(resetUrl: string): string {
  return `
    <div style="font-family:Georgia,'Times New Roman',serif;color:#111;max-width:520px">
      <p style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#888;margin:0 0 12px">KXD Client Portal</p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 16px">You requested a password reset for your client portal account.</p>
      <p style="margin:0 0 20px">
        <a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:4px;font-size:14px">Reset your password</a>
      </p>
      <p style="font-size:14px;line-height:1.6;color:#444;margin:0 0 12px">This link expires in 1 hour.</p>
      <p style="font-size:13px;line-height:1.5;color:#666;margin:0">If you did not request this, you can ignore this email.</p>
    </div>
  `;
}
