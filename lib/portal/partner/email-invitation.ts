/**
 * KXD Network Phase 3 — private partner invitation email (Resend via sendPortalEmail).
 */

import { sendPortalEmail, type PortalEmailSendResult } from "@/lib/portal/email";
import { NETWORK_HOST } from "@/lib/portal/constants";

export function buildPartnerInvitationActivateUrl(
  origin: string,
  rawToken: string,
): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/portal/partner/activate?token=${encodeURIComponent(rawToken)}`;
}

export function resolvePartnerInvitationOrigin(requestOrigin?: string | null): string {
  const networkOrigin = `https://${NETWORK_HOST}`;

  // Production: never emit localhost, Vercel previews, or arbitrary request hosts.
  if (process.env.NODE_ENV === "production") {
    const configured = process.env.NETWORK_PUBLIC_URL?.trim();
    if (configured) {
      try {
        const url = new URL(configured);
        if (
          url.protocol === "https:" &&
          url.hostname.toLowerCase() === NETWORK_HOST
        ) {
          return url.origin.replace(/\/$/, "");
        }
      } catch {
        /* fall through to canonical network origin */
      }
    }
    return networkOrigin;
  }

  const configured = process.env.NETWORK_PUBLIC_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  if (requestOrigin?.trim()) {
    try {
      const url = new URL(requestOrigin);
      const host = url.hostname.toLowerCase();
      if (host === NETWORK_HOST || host === "localhost" || host === "127.0.0.1") {
        return url.origin.replace(/\/$/, "");
      }
    } catch {
      /* fall through */
    }
  }

  return requestOrigin?.replace(/\/$/, "") || networkOrigin;
}

export function buildPartnerInvitationEmailSubject(recipientName: string): string {
  const name = recipientName.trim() || "there";
  return `${name}, your private KXD Network access`;
}

export function buildPartnerInvitationEmailHtml(input: {
  recipientName: string;
  activateUrl: string;
  personalNote?: string | null;
}): string {
  const name = escapeHtml(input.recipientName.trim() || "there");
  const note = input.personalNote?.trim()
    ? `<p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:#3a3a3a;">${escapeHtml(input.personalNote.trim())}</p>`
    : "";

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f3eee6;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3eee6;padding:48px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#fbf7f0;padding:40px 36px;border:1px solid rgba(28,25,20,0.12);">
        <tr><td>
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;color:#8a8478;">KXD Network · Private access</p>
          <h1 style="margin:0 0 16px;font-size:26px;font-weight:500;line-height:1.25;color:#1c1914;letter-spacing:-0.02em;">Your private access is ready</h1>
          <p style="margin:0;font-size:16px;line-height:1.65;color:#5c574e;">Hello ${name},</p>
          <p style="margin:16px 0 0;font-size:16px;line-height:1.65;color:#5c574e;">
            You’ve been invited into KXD Network. This link is personal to you and expires in 7 days.
            Set a password to activate your partner room.
          </p>
          ${note}
          <p style="margin:32px 0;">
            <a href="${escapeAttr(input.activateUrl)}" style="display:inline-block;padding:14px 22px;background:#c2aa72;color:#141210;text-decoration:none;font-size:14px;font-weight:500;letter-spacing:-0.01em;">
              Activate private access
            </a>
          </p>
          <p style="margin:24px 0 0;font-size:13px;line-height:1.55;color:#8a8478;">
            If you weren’t expecting this invitation, you can ignore this email. No access is granted until you activate.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildPartnerInvitationEmailText(input: {
  recipientName: string;
  activateUrl: string;
  personalNote?: string | null;
}): string {
  const name = input.recipientName.trim() || "there";
  const note = input.personalNote?.trim() ? `\n\n${input.personalNote.trim()}\n` : "";
  return [
    `Hello ${name},`,
    "",
    "You've been invited into KXD Network. This personal link expires in 7 days.",
    "Set a password to activate your partner room.",
    note,
    `Activate private access: ${input.activateUrl}`,
    "",
    "If you weren't expecting this invitation, ignore this email.",
  ]
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
    .join("\n");
}

export async function sendPartnerInvitationEmail(input: {
  to: string;
  recipientName: string;
  activateUrl: string;
  personalNote?: string | null;
}): Promise<PortalEmailSendResult & { text: string }> {
  const html = buildPartnerInvitationEmailHtml(input);
  const text = buildPartnerInvitationEmailText(input);
  const result = await sendPortalEmail({
    to: input.to,
    subject: buildPartnerInvitationEmailSubject(input.recipientName),
    html,
  });
  return { ...result, text };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/'/g, "&#39;");
}
