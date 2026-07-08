import type { NextRequest } from "next/server";
import { Resend } from "resend";
import { PORTAL_CLIENT_LANGUAGE } from "@/lib/ces/copy/portal-language";
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
  const footer = PORTAL_CLIENT_LANGUAGE.authEmailFooter;

  return `
<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f6f4f1;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f4f1;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border:1px solid #e8e4de;">
            <tr>
              <td style="padding:40px 36px 28px;font-family:Georgia,'Times New Roman',serif;color:#141414;">
                <p style="margin:0 0 18px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8a847c;">
                  Your workspace
                </p>
                <h1 style="margin:0 0 16px;font-size:28px;font-weight:500;line-height:1.2;letter-spacing:-0.02em;color:#141414;">
                  Reset your password
                </h1>
                <p style="margin:0 0 28px;font-size:16px;line-height:1.65;color:#4a4742;font-family:Georgia,'Times New Roman',serif;">
                  We received a request to reset your workspace password. Use the button below to choose a new one.
                </p>
                <p style="margin:0 0 28px;">
                  <a href="${resetUrl}" style="display:inline-block;padding:14px 22px;background:#141414;color:#ffffff;text-decoration:none;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                    Reset password
                  </a>
                </p>
                <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#6a665f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                  This link expires in one hour. If you didn't request this, you can safely ignore this email.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 36px 32px;border-top:1px solid #efeae3;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#9a948c;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                  ${footer}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
}
