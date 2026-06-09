import type { Payload } from "payload";
import { INQUIRY_EMAIL } from "../site.ts";

type InquiryDoc = {
  id?: string | number;
  name?: string;
  email?: string;
  company?: string;
  companyName?: string;
  contactName?: string;
  inquiryType?: string;
  platformType?: string;
  message?: string;
  objectives?: string;
  currentState?: string;
};

export async function routeInquiryNotification(
  doc: InquiryDoc,
  payload: Payload,
): Promise<void> {
  const recipient = INQUIRY_EMAIL;
  const subjectParts = [
    doc.inquiryType || doc.platformType || "Inquiry",
    doc.company || doc.companyName || doc.name || doc.contactName,
  ].filter(Boolean);

  payload.logger.info({
    msg: "Inquiry notification queued",
    recipient,
    subject: subjectParts.join(" · "),
    inquiryId: doc.id,
  });

  // Email transport will connect here when production mail is configured.
  // All inquiries route to matt@kreatebydesign.com per KXD requirements.
}
