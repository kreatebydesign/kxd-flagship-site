/**
 * Phase 4 Batch I — luxury invitation email (Resend via sendPortalEmail).
 */

import { sendPortalEmail, type PortalEmailSendResult } from "@/lib/portal/email";

export function buildInvitationActivateUrl(origin: string, rawToken: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/portal/activate?token=${encodeURIComponent(rawToken)}`;
}

export function buildInvitationEmailSubject(recipientName: string): string {
  const name = recipientName.trim() || "there";
  return `${name}, your private KXD workspace is ready`;
}

export function buildInvitationEmailHtml(input: {
  recipientName: string;
  companyNames: string[];
  activateUrl: string;
  welcomeNote?: string | null;
}): string {
  const name = escapeHtml(input.recipientName.trim() || "there");
  const companies =
    input.companyNames.length > 0
      ? input.companyNames.map(escapeHtml).join(", ")
      : "your company";
  const note = input.welcomeNote?.trim()
    ? `<p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:#3a3a3a;">${escapeHtml(input.welcomeNote.trim())}</p>`
    : "";

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f6f4f0;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4f0;padding:48px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#fff;padding:40px 36px;border:1px solid #e5e1d8;">
        <tr><td>
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#8a8478;">Kreate by Design</p>
          <h1 style="margin:0 0 16px;font-size:28px;font-weight:400;line-height:1.25;color:#1a1a1a;">Your private workspace is ready</h1>
          <p style="margin:0;font-size:16px;line-height:1.65;color:#3a3a3a;">Hello ${name},</p>
          <p style="margin:16px 0 0;font-size:16px;line-height:1.65;color:#3a3a3a;">
            You’ve been invited to a private Client HQ workspace for <strong>${companies}</strong>.
            This link is personal to you and expires in 48 hours.
          </p>
          ${note}
          <p style="margin:32px 0;">
            <a href="${escapeAttr(input.activateUrl)}" style="display:inline-block;padding:14px 22px;background:#1a1a1a;color:#fff;text-decoration:none;font-size:14px;letter-spacing:0.04em;">
              Activate your workspace
            </a>
          </p>
          <p style="margin:24px 0 0;font-size:13px;line-height:1.55;color:#6b665c;">
            If you weren’t expecting this invitation, you can ignore this email. No account is created until you activate.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildInvitationEmailText(input: {
  recipientName: string;
  companyNames: string[];
  activateUrl: string;
  welcomeNote?: string | null;
}): string {
  const name = input.recipientName.trim() || "there";
  const companies =
    input.companyNames.length > 0 ? input.companyNames.join(", ") : "your company";
  const note = input.welcomeNote?.trim() ? `\n\n${input.welcomeNote.trim()}\n` : "";
  return [
    `Hello ${name},`,
    "",
    `You've been invited to a private Client HQ workspace for ${companies}.`,
    "This personal link expires in 48 hours.",
    note,
    `Activate your workspace: ${input.activateUrl}`,
    "",
    "If you weren't expecting this invitation, ignore this email.",
  ]
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
    .join("\n");
}

export async function sendPortalInvitationEmail(input: {
  to: string;
  recipientName: string;
  companyNames: string[];
  activateUrl: string;
  welcomeNote?: string | null;
}): Promise<PortalEmailSendResult & { text: string }> {
  const html = buildInvitationEmailHtml(input);
  const text = buildInvitationEmailText(input);
  const result = await sendPortalEmail({
    to: input.to,
    subject: buildInvitationEmailSubject(input.recipientName),
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
