import type { ClientInquiryRecord } from "@/lib/managed-client-leads/types";
import {
  formatRegistrationPaymentAmount,
  registrationPaymentStatusLabel,
} from "@/lib/managed-client-leads/registration-payment";
import { inquiryHasRegistrationPayment } from "@/lib/managed-client-leads/apply-registration-payment";

export function leadHasRegistrationPayment(inquiry: ClientInquiryRecord): boolean {
  return inquiryHasRegistrationPayment(inquiry);
}

export function registrationPaymentStatusClass(
  status: ClientInquiryRecord["paymentStatus"],
): string {
  switch (status) {
    case "paid":
      return "kxd-lead-pay--paid";
    case "pending":
      return "kxd-lead-pay--pending";
    case "failed":
      return "kxd-lead-pay--failed";
    case "refunded":
      return "kxd-lead-pay--refunded";
    case "payment_exception":
      return "kxd-lead-pay--exception";
    default:
      return "kxd-lead-pay--unknown";
  }
}

export function formatLeadRegistrationPaymentAmount(inquiry: ClientInquiryRecord): string | null {
  return formatRegistrationPaymentAmount(inquiry.paymentAmountCents, inquiry.paymentCurrency);
}

export function formatLeadRegistrationProgram(inquiry: ClientInquiryRecord): string | null {
  return (
    inquiry.programLabel?.trim() ||
    inquiry.programInterest?.trim() ||
    inquiry.bookedProgram?.trim() ||
    null
  );
}

export function formatLeadRegistrationPaymentLabel(inquiry: ClientInquiryRecord): string | null {
  return registrationPaymentStatusLabel(inquiry.paymentStatus);
}

export function formatLeadEventDates(inquiry: ClientInquiryRecord): string | null {
  const start = inquiry.eventStartsOn?.slice(0, 10);
  const end = inquiry.eventEndsOn?.slice(0, 10);
  if (!start) return null;
  if (end && end !== start) return `${start} to ${end}`;
  return start;
}