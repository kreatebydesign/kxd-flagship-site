import { inquiryHasRegistrationPayment } from "@/lib/managed-client-leads/apply-registration-payment";
import type { ClientInquiryRecord } from "@/lib/managed-client-leads/types";
import type { LeadListView } from "./types";

export function matchesLeadListView(
  inquiry: ClientInquiryRecord,
  leadView: LeadListView = "all",
): boolean {
  if (leadView === "registrations") {
    return inquiryHasRegistrationPayment(inquiry);
  }
  if (leadView === "leads") {
    return !inquiryHasRegistrationPayment(inquiry);
  }
  return true;
}