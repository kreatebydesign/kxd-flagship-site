import "server-only";

import { Resend } from "resend";

export type UpgradeRequestNotificationInput = {
  requestId: number;
  clientName: string;
  moduleLabel: string;
  moduleKey: string;
  requesterName: string | null;
  requesterEmail: string | null;
  submittedAt: string;
  clientMessagePreview: string | null;
  origin: string;
};

function resolveRecipient(): string | null {
  const configured = process.env.KXD_REVIEW_NOTIFICATION_EMAIL?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") {
    return "matt@kreatebydesign.com";
  }
  return null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildEmailHtml(input: UpgradeRequestNotificationInput): string {
  const inboxUrl = `${input.origin}/admin/operations/upgrade-requests`;
  const recordUrl = `${input.origin}/admin/operations/upgrade-requests?id=${input.requestId}`;
  const rows = [
    ["Client", input.clientName],
    ["Capability", input.moduleLabel],
    ["Module key", input.moduleKey],
    ["Submitted by", input.requesterName ?? "—"],
    ["Email", input.requesterEmail ?? "—"],
    ["Submitted", input.submittedAt],
  ];
  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#666;font-size:13px;vertical-align:top">${escapeHtml(label)}</td><td style="padding:6px 0;font-size:13px;color:#111">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  const message = input.clientMessagePreview?.trim() || "—";

  return `
    <div style="font-family:Georgia,'Times New Roman',serif;color:#111;max-width:560px">
      <p style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#888;margin:0 0 12px">Upgrade Request</p>
      <h1 style="font-size:22px;font-weight:500;line-height:1.25;margin:0 0 16px">${escapeHtml(input.moduleLabel)}</h1>
      <p style="font-size:14px;line-height:1.55;margin:0 0 16px">A client requested access. Approving the request does not change entitlements — use Plans &amp; Access to grant access intentionally.</p>
      <table style="border-collapse:collapse;margin:0 0 20px">${tableRows}</table>
      <p style="font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#888;margin:0 0 8px">Client message</p>
      <p style="font-size:14px;line-height:1.6;margin:0 0 24px;white-space:pre-wrap">${escapeHtml(message)}</p>
      <p style="margin:0 0 12px">
        <a href="${inboxUrl}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:2px;font-size:13px">Open Upgrade Requests</a>
      </p>
      <p style="margin:0;font-size:13px">
        <a href="${recordUrl}" style="color:#666">View this request</a>
      </p>
    </div>
  `;
}

function buildEmailText(input: UpgradeRequestNotificationInput): string {
  const inboxUrl = `${input.origin}/admin/operations/upgrade-requests`;
  const lines = [
    "Upgrade Request",
    "",
    input.moduleLabel,
    "",
    "A client requested access. Approving the request does not change entitlements — use Plans & Access to grant access intentionally.",
    "",
    `Client: ${input.clientName}`,
    `Capability: ${input.moduleLabel}`,
    `Module key: ${input.moduleKey}`,
    `Submitted by: ${input.requesterName ?? "—"}`,
    `Email: ${input.requesterEmail ?? "—"}`,
    `Submitted: ${input.submittedAt}`,
    "",
    "Client message:",
    input.clientMessagePreview?.trim() || "—",
    "",
    `Open inbox: ${inboxUrl}`,
    `View request: ${inboxUrl}?id=${input.requestId}`,
  ];
  return lines.join("\n");
}

/**
 * Operator email for a new upgrade request. Never throws.
 * Notification failure must not roll back the durable request.
 */
export async function notifyUpgradeRequestSubmitted(
  input: UpgradeRequestNotificationInput,
): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  const to = resolveRecipient();

  if (!apiKey || !from || !to) {
    console.warn("[KXD Upgrade Requests] Email skipped — Resend not configured.");
    return { sent: false, reason: "not_configured" };
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to,
      subject: `Upgrade request · ${input.moduleLabel} · ${input.clientName}`,
      html: buildEmailHtml(input),
      text: buildEmailText(input),
    });
    return { sent: true };
  } catch (err) {
    console.error("[KXD Upgrade Requests] Email send failed:", err);
    return { sent: false, reason: "send_failed" };
  }
}
