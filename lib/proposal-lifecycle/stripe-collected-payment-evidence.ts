/**
 * Durable Stripe-collected payment evidence for lifecycle obligations.
 * Shared by live reconciliation, Stripe TEST webhooks, and mock paid paths.
 * Never contacts Stripe. Never double-counts when idempotencyKey already present.
 */

import type { InvoiceObligation } from "./types.ts";
import type {
  ObligationPaymentEvent,
  ObligationPaymentReceipt,
} from "./external-obligation-payment.ts";
import { newLifecycleId } from "./hash.ts";
import { obligationAmountPaidCents, obligationIsPaid } from "./obligation-balances.ts";

export type StripeCollectedPaymentEvidenceInput = {
  amountCents: number;
  currency: string;
  paidAt: string;
  stripeInvoiceId: string;
  recordedBy: string;
  recordedAt?: string;
  idempotencyKey: string;
  operatorNote?: string | null;
  paymentGroupId?: string;
};

function hasIdempotency(obligation: InvoiceObligation, key: string): boolean {
  if (obligation.paymentReceipt?.idempotencyKey === key) return true;
  return Boolean(obligation.paymentEvents?.some((event) => event.idempotencyKey === key));
}

/**
 * Apply full Stripe-collected settlement evidence onto an obligation.
 * Idempotent on idempotencyKey. Caps paid amount to obligation.amountCents.
 */
export function applyStripeCollectedPaymentEvidence(
  obligation: InvoiceObligation,
  input: StripeCollectedPaymentEvidenceInput,
): { obligation: InvoiceObligation; applied: boolean; duplicate: boolean } {
  if (hasIdempotency(obligation, input.idempotencyKey)) {
    return { obligation, applied: false, duplicate: true };
  }

  if (obligationIsPaid(obligation)) {
    // Already fully paid by other evidence — do not append duplicate amount.
    return { obligation, applied: false, duplicate: true };
  }

  const amountCents = Math.min(
    Math.max(0, Math.trunc(Number(input.amountCents) || 0)),
    Math.max(0, Math.trunc(Number(obligation.amountCents) || 0)),
  );
  if (amountCents <= 0) {
    return { obligation, applied: false, duplicate: false };
  }

  const recordedAt = input.recordedAt ?? new Date().toISOString();
  const currency = String(input.currency || obligation.currency || "USD").toUpperCase() || "USD";

  const event: ObligationPaymentEvent = {
    id: newLifecycleId("payevt"),
    paymentGroupId: input.paymentGroupId ?? newLifecycleId("paygrp"),
    amountCents,
    currency,
    paidAt: input.paidAt,
    externalPaymentMethod: "other",
    externalReference: input.stripeInvoiceId,
    operatorNote: input.operatorNote ?? null,
    recordedBy: input.recordedBy,
    recordedAt,
    stripeInvoiceId: input.stripeInvoiceId,
    collectionChannel: "stripe-collected",
    idempotencyKey: input.idempotencyKey,
  };

  const priorEvents = obligation.paymentEvents ?? [];
  const events = [...priorEvents, event];
  // Prefer event sum once events exist (canonical helper rule).
  const paidFromEvents = events.reduce((sum, item) => sum + (Number(item.amountCents) || 0), 0);
  const paid = Math.min(paidFromEvents, obligation.amountCents);
  const status = paid >= obligation.amountCents ? ("paid" as const) : ("partially-paid" as const);

  const receipt: ObligationPaymentReceipt = {
    status: status === "paid" ? "paid" : "partial",
    amountCents: status === "paid" ? obligation.amountCents : paid,
    currency,
    paidAt: input.paidAt,
    externalPaymentMethod: "other",
    externalReference: input.stripeInvoiceId,
    operatorNote: input.operatorNote ?? null,
    recordedBy: input.recordedBy,
    recordedAt,
    stripeInvoiceId: input.stripeInvoiceId,
    collectionChannel: "stripe-collected",
    idempotencyKey: input.idempotencyKey,
  };

  return {
    applied: true,
    duplicate: false,
    obligation: {
      ...obligation,
      status,
      paidAt: status === "paid" ? input.paidAt : obligation.paidAt ?? input.paidAt,
      amountPaidCents: paid,
      paymentEvents: events,
      paymentReceipt: receipt,
      collectionChannel: "stripe-collected",
      stripeDraftInvoiceId: input.stripeInvoiceId || obligation.stripeDraftInvoiceId || null,
    },
  };
}

/** Ensure amountPaidCents mirrors canonical paid amount after Stripe evidence writes. */
export function syncAmountPaidCentsFromCanonical(
  obligation: InvoiceObligation,
): InvoiceObligation {
  const paid = obligationAmountPaidCents(obligation);
  if (obligation.amountPaidCents === paid) return obligation;
  return { ...obligation, amountPaidCents: paid };
}
