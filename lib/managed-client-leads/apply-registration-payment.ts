/**
 * Merge registration payment patches onto client-inquiries (create + update).
 */

import type { RegistrationPaymentPatch } from "./registration-payment";
import {
  canApplyRegistrationPaymentTransition,
  hasRegistrationPaymentPatch,
} from "./registration-payment";
import type { ClientInquiryRecord } from "./types";

export type ApplyRegistrationPaymentResult =
  | { ok: true; patch: Record<string, unknown>; statusChanged: boolean }
  | { ok: false; code: "transition_rejected"; message: string };

function coalesceRegistrationId(
  existing: ClientInquiryRecord | null | undefined,
  incoming: RegistrationPaymentPatch,
  sourceExternalId: string | null | undefined,
): string | null {
  return (
    incoming.registrationId ??
    existing?.registrationId ??
    (sourceExternalId?.startsWith("evtreg_") || sourceExternalId?.startsWith("cschool-")
      ? sourceExternalId
      : null)
  );
}

export function buildRegistrationPaymentDataPatch(input: {
  existing?: ClientInquiryRecord | null;
  payment: RegistrationPaymentPatch;
  sourceExternalId?: string | null;
}): ApplyRegistrationPaymentResult {
  const existing = input.existing ?? null;

  if (!hasRegistrationPaymentPatch(input.payment) && !existing?.registrationId) {
    return { ok: true, patch: {}, statusChanged: false };
  }

  const registrationId = coalesceRegistrationId(existing, input.payment, input.sourceExternalId);
  const nextStatus = input.payment.paymentStatus ?? existing?.paymentStatus ?? null;

  if (nextStatus && existing?.paymentStatus) {
    if (!canApplyRegistrationPaymentTransition(existing.paymentStatus, nextStatus)) {
      return {
        ok: false,
        code: "transition_rejected",
        message: `Payment status cannot move from ${existing.paymentStatus} to ${nextStatus}.`,
      };
    }
  }

  const statusChanged = Boolean(
    nextStatus && nextStatus !== (existing?.paymentStatus ?? null),
  );

  const patch: Record<string, unknown> = {};

  if (registrationId) patch.registrationId = registrationId;
  if (input.payment.programLabel) patch.programLabel = input.payment.programLabel;
  else if (existing?.programLabel) patch.programLabel = existing.programLabel;

  if (input.payment.courseId) patch.courseId = input.payment.courseId;
  else if (existing?.courseId) patch.courseId = existing.courseId;

  if (nextStatus) patch.paymentStatus = nextStatus;

  if (input.payment.paymentAmountCents != null) {
    patch.paymentAmountCents = input.payment.paymentAmountCents;
  } else if (existing?.paymentAmountCents != null) {
    patch.paymentAmountCents = existing.paymentAmountCents;
  }

  if (input.payment.paymentCurrency) patch.paymentCurrency = input.payment.paymentCurrency;
  else if (existing?.paymentCurrency) patch.paymentCurrency = existing.paymentCurrency;

  if (input.payment.stripeCheckoutSessionId) {
    patch.stripeCheckoutSessionId = input.payment.stripeCheckoutSessionId;
  }
  if (input.payment.stripePaymentIntentId) {
    patch.stripePaymentIntentId = input.payment.stripePaymentIntentId;
  }

  if (input.payment.paidAt) patch.paidAt = input.payment.paidAt;
  else if (existing?.paidAt) patch.paidAt = existing.paidAt;

  if (input.payment.refundedAt) patch.refundedAt = input.payment.refundedAt;
  else if (existing?.refundedAt) patch.refundedAt = existing.refundedAt;

  if (input.payment.eventStartsOn) patch.eventStartsOn = input.payment.eventStartsOn;
  else if (existing?.eventStartsOn) patch.eventStartsOn = existing.eventStartsOn;

  if (input.payment.eventEndsOn) patch.eventEndsOn = input.payment.eventEndsOn;
  else if (existing?.eventEndsOn) patch.eventEndsOn = existing.eventEndsOn;

  return { ok: true, patch, statusChanged };
}

export function inquiryHasRegistrationPayment(inquiry: ClientInquiryRecord): boolean {
  return Boolean(inquiry.registrationId || inquiry.paymentStatus);
}