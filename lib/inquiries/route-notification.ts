import type { Payload } from "payload";
import { Resend } from "resend";
import { INQUIRY_EMAIL } from "../site";

type InquiryDoc = {
  id?: string | number;
  name?: string | null;
  email?: string | null;
  company?: string | null;
  companyName?: string | null;
  contactName?: string | null;
  inquiryType?: string | null;
  platformType?: string | null;
  message?: string | null;
  objectives?: string | null;
  currentState?: string | null;
};

export async function routeInquiryNotification(
  doc: InquiryDoc,
  payload: Payload,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error("❌ Missing RESEND_API_KEY for inquiry notification", {
      inquiryId: doc.id,
    });

    payload.logger.error({
      msg: "Missing RESEND_API_KEY for inquiry notification",
      inquiryId: doc.id,
    });
    return;
  }

  const resend = new Resend(apiKey);

  const recipient = INQUIRY_EMAIL;
  const name = doc.name || doc.contactName || "Unknown contact";
  const company = doc.company || doc.companyName || "No company provided";
  const inquiryType = doc.inquiryType || doc.platformType || "General inquiry";
  const message =
    doc.message || doc.objectives || doc.currentState || "No message provided";

  const subject = `New KXD Inquiry · ${inquiryType} · ${company}`;

  try {
    console.log("🚀 Sending inquiry email via Resend", {
      recipient,
      subject,
      inquiryId: doc.id,
    });

    const result = await resend.emails.send({
      from: "Kreate by Design <matt@kreatebydesign.com>",
      to: recipient,
      replyTo: doc.email ? [doc.email] : undefined,
      subject,
      text: [
        "New KXD inquiry received.",
        "",
        `Name: ${name}`,
        `Email: ${doc.email || "No email provided"}`,
        `Company: ${company}`,
        `Inquiry Type: ${inquiryType}`,
        "",
        "Message:",
        message,
        "",
        `Payload Inquiry ID: ${doc.id || "Unknown"}`,
      ].join("\n"),
    });

    console.log("✅ Resend result:", result);

    payload.logger.info({
      msg: "Inquiry notification sent",
      recipient,
      subject,
      inquiryId: doc.id,
    });
  } catch (error) {
    console.error("❌ Resend failed:", error);

    payload.logger.error({
      msg: "Failed to send inquiry notification",
      err: error,
      inquiryId: doc.id,
    });

    throw error;
  }
}