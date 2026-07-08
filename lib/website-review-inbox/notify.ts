import "server-only";

import { Resend } from "resend";
import type { ReviewInboxItem } from "./types";

export interface WebsiteReviewNotificationInput {
  requestId: number;
  requestTitle: string;
  clientName: string;
  submittedBy: string | null;
  submittedByEmail: string | null;
  pageLocation: string | null;
  priority: string;
  notesPreview: string;
  attachmentCount: number;
  origin: string;
}

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

function buildEmailHtml(input: WebsiteReviewNotificationInput): string {
  const inboxUrl = `${input.origin}/admin/operations/review-inbox`;
  const recordUrl = `${input.origin}/admin/collections/client-requests/${input.requestId}`;

  const rows = [
    ["Client", input.clientName],
    ["Submitted by", input.submittedBy ?? "—"],
    ["Email", input.submittedByEmail ?? "—"],
    ["Page / section", input.pageLocation ?? "—"],
    ["Priority", input.priority],
    ["Attachments", String(input.attachmentCount)],
  ];

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#666;font-size:13px;vertical-align:top">${escapeHtml(label)}</td><td style="padding:6px 0;font-size:13px;color:#111">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  const notes = input.notesPreview.trim() || "—";

  return `
    <div style="font-family:Georgia,'Times New Roman',serif;color:#111;max-width:560px">
      <p style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#888;margin:0 0 12px">Website Review</p>
      <h1 style="font-size:22px;font-weight:500;line-height:1.25;margin:0 0 16px">${escapeHtml(input.requestTitle)}</h1>
      <table style="border-collapse:collapse;margin:0 0 20px">${tableRows}</table>
      <p style="font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#888;margin:0 0 8px">Notes</p>
      <p style="font-size:14px;line-height:1.6;margin:0 0 24px;white-space:pre-wrap">${escapeHtml(notes)}</p>
      <p style="margin:0 0 12px">
        <a href="${inboxUrl}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:4px;font-size:13px">Open Review Inbox</a>
      </p>
      <p style="margin:0;font-size:13px">
        <a href="${recordUrl}" style="color:#666">View Client Request record</a>
      </p>
    </div>
  `;
}

/**
 * Sends KXD operator notification for a new Website Review revision.
 * Never throws — failures are logged only so portal submission is unaffected.
 */
export async function notifyWebsiteReviewSubmitted(
  input: WebsiteReviewNotificationInput,
): Promise<void> {
  const recipient = resolveRecipient();
  if (!recipient) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[KXD Review Inbox] KXD_REVIEW_NOTIFICATION_EMAIL not set — notification skipped.",
      );
    }
    return;
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const subject = `New Website Review · ${input.clientName} · ${input.requestTitle}`;

  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[KXD Review Inbox] Local dev notification (no RESEND_API_KEY):", {
        to: recipient,
        subject,
        requestId: input.requestId,
        inbox: `${input.origin}/admin/operations/review-inbox`,
      });
    } else {
      console.warn("[KXD Review Inbox] RESEND_API_KEY not set — notification email not sent.");
    }
    return;
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from:
        process.env.RESEND_FROM_EMAIL?.trim() || "Kreate by Design <hello@kreatebydesign.com>",
      to: recipient,
      subject,
      html: buildEmailHtml(input),
    });
  } catch (err) {
    console.error("[KXD Review Inbox] Notification email failed:", err);
  }
}

export function notificationInputFromInboxItem(
  item: ReviewInboxItem,
  origin: string,
): WebsiteReviewNotificationInput {
  return {
    requestId: item.id,
    requestTitle: item.title,
    clientName: item.clientName,
    submittedBy: item.submittedBy,
    submittedByEmail: item.submittedByEmail,
    pageLocation: item.pageLocation,
    priority: item.priority,
    notesPreview: item.notesPreview,
    attachmentCount: item.attachmentCount,
    origin,
  };
}
