import {
  DEFAULT_OTP_COMMISSION_AMOUNT_CENTS,
  OTP_CARTS_CLIENT_KEY,
} from "./constants";
import type { ClientSiteEventRecord } from "./types";

export class CsiLifecycleModelError extends Error {}

export function assertOtpWebsiteLead(record: ClientSiteEventRecord): void {
  if (
    record.clientKey !== OTP_CARTS_CLIENT_KEY ||
    record.eventClass !== "website_lead" ||
    !Number.isFinite(record.clientId) ||
    record.clientId <= 0
  ) {
    throw new CsiLifecycleModelError(
      "Sale confirmation is limited to OTP Carts website leads.",
    );
  }
}

export function decideSaleConfirmation(
  record: ClientSiteEventRecord,
): "confirm" | "already_confirmed" {
  assertOtpWebsiteLead(record);
  if (
    record.lifecycleStatus === "sold_confirmed" &&
    (record.commissionStatus === "due" || record.commissionStatus === "paid")
  ) {
    if (
      record.commissionAmountCents !== DEFAULT_OTP_COMMISSION_AMOUNT_CENTS ||
      !record.soldAt ||
      !record.saleReference ||
      !record.confirmedById ||
      !record.confirmedAt
    ) {
      throw new CsiLifecycleModelError(
        "Confirmed sale has incomplete or invalid evidence and requires review.",
      );
    }
    return "already_confirmed";
  }
  if (
    record.lifecycleStatus !== "new" &&
    record.lifecycleStatus !== "acknowledged"
  ) {
    throw new CsiLifecycleModelError(
      `Cannot confirm sale from lifecycle state ${record.lifecycleStatus}.`,
    );
  }
  if (record.commissionStatus !== "not_due") {
    throw new CsiLifecycleModelError(
      `Cannot create commission from state ${record.commissionStatus}.`,
    );
  }
  return "confirm";
}

export function decideCommissionPayment(
  record: ClientSiteEventRecord,
): "pay" | "already_paid" {
  assertOtpWebsiteLead(record);
  if (record.commissionStatus === "paid") {
    if (
      record.lifecycleStatus !== "sold_confirmed" ||
      record.commissionAmountCents !== DEFAULT_OTP_COMMISSION_AMOUNT_CENTS ||
      !record.soldAt ||
      !record.saleReference ||
      !record.confirmedById ||
      !record.confirmedAt ||
      !record.commissionPaidAt ||
      !record.commissionPaymentReference ||
      !record.commissionPaidById
    ) {
      throw new CsiLifecycleModelError(
        "Paid commission has incomplete or invalid evidence and requires review.",
      );
    }
    return "already_paid";
  }
  if (
    record.lifecycleStatus !== "sold_confirmed" ||
    record.commissionStatus !== "due" ||
    record.commissionAmountCents !== DEFAULT_OTP_COMMISSION_AMOUNT_CENTS ||
    !record.soldAt ||
    !record.saleReference ||
    !record.confirmedById ||
    !record.confirmedAt
  ) {
    throw new CsiLifecycleModelError(
      "Commission can be marked paid only after an OTP Carts sale creates the $300 obligation.",
    );
  }
  return "pay";
}
