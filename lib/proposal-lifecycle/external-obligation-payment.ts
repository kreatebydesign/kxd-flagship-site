/**
 * Obligation-level external payment recording + multi-obligation allocation.
 * Records already-received external payments. Never calls Stripe. Never charges a card.
 */

import { appendAudit } from "./package.ts";
import { newLifecycleId } from "./hash.ts";
import type {
  ContractLifecyclePackage,
  InvoiceObligation,
  ProposedBillingPlan,
} from "./types.ts";
import { assertObligationTransition } from "./transitions.ts";
import { assertNoSensitiveCardFields } from "../direct-agreement/validate.ts";
import {
  isObligationOpenForExternalPayment,
  obligationAmountPaidCents,
  obligationRemainingCents,
  planFifoAllocation,
} from "./obligation-balances.ts";

/** Supported methods — includes legacy `wire` for stored values. */
export const EXTERNAL_PAYMENT_METHODS = [
  "stripe",
  "cash-app",
  "zelle",
  "ach",
  "check",
  "cash",
  "other",
  "wire",
] as const;

export type ExternalPaymentMethod = (typeof EXTERNAL_PAYMENT_METHODS)[number];

export type ObligationCollectionChannel =
  | "stripe-invoice-external-pay"
  | "manual-external"
  | "stripe-collected"
  | "mixed-external";

export type ObligationPaymentEvent = {
  id: string;
  /** Shared across legs when one operator payment is allocated to multiple obligations. */
  paymentGroupId: string;
  amountCents: number;
  currency: string;
  paidAt: string;
  externalPaymentMethod: ExternalPaymentMethod;
  externalReference?: string | null;
  operatorNote?: string | null;
  recordedBy: string;
  recordedAt: string;
  stripeInvoiceId?: string | null;
  collectionChannel: ObligationCollectionChannel;
  idempotencyKey: string;
};

/** Legacy single-receipt shape kept for fully-paid obligations and older data. */
export type ObligationPaymentReceipt = {
  status: "paid" | "partial";
  amountCents: number;
  currency: string;
  paidAt: string;
  externalPaymentMethod: ExternalPaymentMethod;
  externalReference?: string | null;
  operatorNote?: string | null;
  recordedBy: string;
  recordedAt: string;
  stripeInvoiceId?: string | null;
  collectionChannel: ObligationCollectionChannel;
  idempotencyKey: string;
};

export type RecordObligationExternalPaymentInput = {
  obligationId: string;
  amountCents: number;
  currency?: string;
  paidAt: string;
  externalPaymentMethod: ExternalPaymentMethod;
  externalReference?: string | null;
  operatorNote?: string | null;
  stripeInvoiceId?: string | null;
  recordedBy: string;
  paidOutsideStripe?: boolean;
};

export type AllocationLegInput = {
  obligationId: string;
  amountCents: number;
};

export type RecordAllocatedExternalPaymentInput = {
  amountCents: number;
  currency?: string;
  paidAt: string;
  externalPaymentMethod: ExternalPaymentMethod;
  externalReference?: string | null;
  operatorNote?: string | null;
  stripeInvoiceId?: string | null;
  recordedBy: string;
  paidOutsideStripe?: boolean;
  /**
   * Explicit legs. When omitted / empty and allocationMode is fifo, FIFO is planned.
   */
  allocations?: AllocationLegInput[];
  allocationMode?: "explicit" | "fifo";
  /**
   * When allocationMode is fifo, restrict FIFO to these obligation IDs only.
   * Prevents spill into unselected obligations (e.g. ancillary / recurring).
   */
  allowedObligationIds?: string[];
  /** Optional client-supplied idempotency key (still namespaced). */
  clientIdempotencyKey?: string | null;
};

export type FieldErrors = Record<string, string>;

export type AllocationPreview = {
  totalAmountCents: number;
  unallocatedCents: number;
  legs: Array<{
    obligationId: string;
    label: string;
    amountCents: number;
    remainingBeforeCents: number;
    remainingAfterCents: number;
  }>;
};

function trimOrNull(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function normalizeCurrency(value: unknown): string {
  return (
    String(value ?? "USD")
      .trim()
      .toUpperCase() || "USD"
  );
}

export function buildObligationExternalPaymentIdempotencyKey(input: {
  contractId: number;
  obligationId: string;
  amountCents: number;
  currency: string;
  paidAt: string;
  externalPaymentMethod: ExternalPaymentMethod;
  externalReference?: string | null;
}): string {
  const ref = trimOrNull(input.externalReference) || "noref";
  return [
    "obl-extpay",
    `contract:${input.contractId}`,
    `obl:${input.obligationId}`,
    `amt:${input.amountCents}`,
    `cur:${normalizeCurrency(input.currency)}`,
    `paid:${input.paidAt.slice(0, 10)}`,
    `method:${input.externalPaymentMethod}`,
    `ref:${ref}`,
  ].join("|");
}

export function buildAllocatedExternalPaymentIdempotencyKey(input: {
  contractId: number;
  amountCents: number;
  currency: string;
  paidAt: string;
  externalPaymentMethod: ExternalPaymentMethod;
  externalReference?: string | null;
  clientIdempotencyKey?: string | null;
  allocationFingerprint: string;
}): string {
  const ref = trimOrNull(input.externalReference) || "noref";
  const client = trimOrNull(input.clientIdempotencyKey);
  return [
    "obl-extpay-alloc",
    `contract:${input.contractId}`,
    `amt:${input.amountCents}`,
    `cur:${normalizeCurrency(input.currency)}`,
    `paid:${input.paidAt.slice(0, 10)}`,
    `method:${input.externalPaymentMethod}`,
    `ref:${ref}`,
    `alloc:${input.allocationFingerprint}`,
    client ? `client:${client}` : "client:none",
  ].join("|");
}

function allocationFingerprint(legs: AllocationLegInput[]): string {
  return legs
    .map((leg) => `${leg.obligationId}:${leg.amountCents}`)
    .sort()
    .join(",");
}

function findExistingIdempotency(
  plan: ProposedBillingPlan,
  idempotencyKey: string,
): boolean {
  for (const obligation of plan.obligations) {
    if (obligation.paymentReceipt?.idempotencyKey === idempotencyKey) return true;
    if (obligation.paymentEvents?.some((event) => event.idempotencyKey === idempotencyKey)) {
      return true;
    }
  }
  return false;
}

export function previewExternalPaymentAllocation(
  plan: ProposedBillingPlan,
  input: {
    amountCents: number;
    allocationMode?: "explicit" | "fifo";
    allocations?: AllocationLegInput[];
    /** Restrict FIFO planning to these obligation IDs (selected-obligations mode). */
    allowedObligationIds?: string[];
  },
): AllocationPreview | { ok: false; errors: FieldErrors } {
  const amountCents = Number(input.amountCents);
  if (!Number.isFinite(amountCents) || !Number.isInteger(amountCents) || amountCents <= 0) {
    return { ok: false, errors: { amountCents: "Amount must be a positive integer in cents." } };
  }

  const mode = input.allocationMode ?? (input.allocations?.length ? "explicit" : "fifo");
  let legs: AllocationLegInput[] = [];
  const allowedIds = (input.allowedObligationIds ?? [])
    .map((id) => String(id).trim())
    .filter(Boolean);

  if (mode === "fifo") {
    if (input.allowedObligationIds && allowedIds.length === 0) {
      return {
        ok: false,
        errors: { allocations: "Select at least one obligation for this payment." },
      };
    }
    legs = planFifoAllocation(plan.obligations, amountCents, {
      allowedObligationIds: allowedIds.length ? allowedIds : undefined,
    }).map((leg) => ({
      obligationId: leg.obligationId,
      amountCents: leg.amountCents,
    }));
  } else {
    legs = (input.allocations ?? []).map((leg) => ({
      obligationId: String(leg.obligationId),
      amountCents: Number(leg.amountCents),
    }));
    if (allowedIds.length) {
      const allowed = new Set(allowedIds);
      for (const leg of legs) {
        if (!allowed.has(leg.obligationId)) {
          return {
            ok: false,
            errors: {
              allocations: "Allocation includes an obligation outside the selected set.",
            },
          };
        }
      }
    }
  }

  if (!legs.length) {
    return {
      ok: false,
      errors: { allocations: "No eligible obligations available for this payment amount." },
    };
  }

  const previewLegs: AllocationPreview["legs"] = [];
  let allocated = 0;

  for (const leg of legs) {
    if (!Number.isInteger(leg.amountCents) || leg.amountCents <= 0) {
      return {
        ok: false,
        errors: { allocations: "Each allocation amount must be a positive integer in cents." },
      };
    }
    const obligation = plan.obligations.find((item) => item.id === leg.obligationId);
    if (!obligation) {
      return { ok: false, errors: { allocations: `Unknown obligation ${leg.obligationId}.` } };
    }
    if (!isObligationOpenForExternalPayment(obligation)) {
      return {
        ok: false,
        errors: {
          allocations: `Obligation “${obligation.label}” is not open for external payment.`,
        },
      };
    }
    const remainingBefore = obligationRemainingCents(obligation);
    if (leg.amountCents > remainingBefore) {
      return {
        ok: false,
        errors: {
          allocations: `Allocation to “${obligation.label}” exceeds remaining $${(remainingBefore / 100).toFixed(2)}.`,
        },
      };
    }
    allocated += leg.amountCents;
    previewLegs.push({
      obligationId: obligation.id,
      label: obligation.label,
      amountCents: leg.amountCents,
      remainingBeforeCents: remainingBefore,
      remainingAfterCents: remainingBefore - leg.amountCents,
    });
  }

  if (allocated > amountCents) {
    return {
      ok: false,
      errors: { allocations: "Allocations exceed the payment amount." },
    };
  }

  return {
    totalAmountCents: amountCents,
    unallocatedCents: amountCents - allocated,
    legs: previewLegs,
  };
}

function collectionChannelFor(
  input: { stripeInvoiceId?: string | null; paidOutsideStripe?: boolean },
): ObligationCollectionChannel {
  return input.stripeInvoiceId || input.paidOutsideStripe
    ? "stripe-invoice-external-pay"
    : "manual-external";
}

function applyEventToObligation(
  obligation: InvoiceObligation,
  event: ObligationPaymentEvent,
): InvoiceObligation {
  const events = [...(obligation.paymentEvents ?? []), event];
  const paid = obligationAmountPaidCents(obligation) + event.amountCents;
  const status = paid >= obligation.amountCents ? "paid" : "partially-paid";
  if (obligation.status !== status) {
    assertObligationTransition(obligation.status, status);
  }

  const receipt: ObligationPaymentReceipt = {
    status: status === "paid" ? "paid" : "partial",
    amountCents: status === "paid" ? obligation.amountCents : paid,
    currency: event.currency,
    paidAt: event.paidAt,
    externalPaymentMethod: event.externalPaymentMethod,
    externalReference: event.externalReference,
    operatorNote: event.operatorNote,
    recordedBy: event.recordedBy,
    recordedAt: event.recordedAt,
    stripeInvoiceId: event.stripeInvoiceId,
    collectionChannel: event.collectionChannel,
    idempotencyKey: event.idempotencyKey,
  };

  const priorChannel = obligation.collectionChannel;
  const nextChannel: ObligationCollectionChannel =
    priorChannel && priorChannel !== event.collectionChannel && priorChannel !== "stripe-collected"
      ? "mixed-external"
      : event.collectionChannel;

  return {
    ...obligation,
    status,
    amountPaidCents: paid,
    paidAt: status === "paid" ? event.paidAt : obligation.paidAt ?? event.paidAt,
    paymentEvents: events,
    paymentReceipt: receipt,
    collectionChannel: nextChannel,
    stripeDraftInvoiceId: event.stripeInvoiceId ?? obligation.stripeDraftInvoiceId ?? null,
  };
}

/**
 * Single-obligation path (backward compatible).
 * Amount may be partial — must be > 0 and ≤ remaining.
 */
export function validateRecordObligationExternalPayment(
  input: RecordObligationExternalPaymentInput,
  context: {
    contractId: number;
    plan: ProposedBillingPlan | null | undefined;
  },
):
  | {
      ok: true;
      obligation: InvoiceObligation;
      receipt: ObligationPaymentReceipt;
      event: ObligationPaymentEvent;
      idempotentReplay: boolean;
    }
  | { ok: false; errors: FieldErrors } {
  try {
    assertNoSensitiveCardFields(input as unknown as Record<string, unknown>);
  } catch (err) {
    return {
      ok: false,
      errors: {
        card: err instanceof Error ? err.message : "Sensitive card data is not allowed.",
      },
    };
  }

  const errors: FieldErrors = {};
  if (!context.plan) {
    errors.plan = "Billing plan with obligations is required before recording an external payment.";
    return { ok: false, errors };
  }

  const obligation = context.plan.obligations.find((o) => o.id === input.obligationId);
  if (!obligation) {
    errors.obligationId = "Unknown invoice obligation.";
    return { ok: false, errors };
  }

  const amountCents = Number(input.amountCents);
  const remaining = obligationRemainingCents(obligation);
  if (!Number.isFinite(amountCents) || !Number.isInteger(amountCents) || amountCents <= 0) {
    errors.amountCents = "Amount must be a positive integer in cents.";
  } else if (amountCents > remaining) {
    errors.amountCents = `Amount cannot exceed remaining balance ($${(remaining / 100).toFixed(2)}).`;
  }

  const currency = normalizeCurrency(input.currency ?? obligation.currency);
  if (currency !== "USD") {
    errors.currency = "Only USD is supported for external obligation payments.";
  }

  const paidAt = trimOrNull(input.paidAt);
  if (!paidAt) {
    errors.paidAt = "Payment date is required.";
  } else if (Number.isNaN(Date.parse(paidAt))) {
    errors.paidAt = "Payment date must be a valid date.";
  }

  if (!EXTERNAL_PAYMENT_METHODS.includes(input.externalPaymentMethod)) {
    errors.externalPaymentMethod = "Unsupported external payment method.";
  }

  const recordedBy = trimOrNull(input.recordedBy);
  if (!recordedBy) {
    errors.recordedBy = "Operator who confirmed payment is required.";
  }

  const stripeInvoiceId = trimOrNull(input.stripeInvoiceId);
  if (stripeInvoiceId && !/^in_[A-Za-z0-9]+$/.test(stripeInvoiceId)) {
    errors.stripeInvoiceId = "Invalid Stripe invoice ID format.";
  }

  if (Object.keys(errors).length) return { ok: false, errors };

  if (!isObligationOpenForExternalPayment(obligation) && remaining <= 0) {
    return {
      ok: false,
      errors: {
        obligationId:
          obligation.collectionChannel === "stripe-collected"
            ? "This obligation was collected through Stripe. Do not also record an external payment."
            : "This obligation is already fully paid or closed.",
      },
    };
  }

  if (
    obligation.collectionChannel === "stripe-collected" ||
    obligation.paymentReceipt?.collectionChannel === "stripe-collected"
  ) {
    return {
      ok: false,
      errors: {
        obligationId:
          "This obligation was collected through Stripe. Do not also record an external payment.",
      },
    };
  }

  const idempotencyKey = buildObligationExternalPaymentIdempotencyKey({
    contractId: context.contractId,
    obligationId: obligation.id,
    amountCents,
    currency,
    paidAt: paidAt!,
    externalPaymentMethod: input.externalPaymentMethod,
    externalReference: input.externalReference,
  });

  if (findExistingIdempotency(context.plan, idempotencyKey)) {
    const existingEvent = obligation.paymentEvents?.find(
      (event) => event.idempotencyKey === idempotencyKey,
    );
    const receipt =
      obligation.paymentReceipt?.idempotencyKey === idempotencyKey
        ? obligation.paymentReceipt
        : existingEvent
          ? {
              status: (obligationRemainingCents(obligation) <= 0 ? "paid" : "partial") as
                | "paid"
                | "partial",
              amountCents: existingEvent.amountCents,
              currency: existingEvent.currency,
              paidAt: existingEvent.paidAt,
              externalPaymentMethod: existingEvent.externalPaymentMethod,
              externalReference: existingEvent.externalReference,
              operatorNote: existingEvent.operatorNote,
              recordedBy: existingEvent.recordedBy,
              recordedAt: existingEvent.recordedAt,
              stripeInvoiceId: existingEvent.stripeInvoiceId,
              collectionChannel: existingEvent.collectionChannel,
              idempotencyKey,
            }
          : obligation.paymentReceipt!;
    return {
      ok: true,
      idempotentReplay: true,
      obligation,
      receipt,
      event: existingEvent ?? {
        id: newLifecycleId("payevt"),
        paymentGroupId: newLifecycleId("paygrp"),
        amountCents,
        currency,
        paidAt: paidAt!,
        externalPaymentMethod: input.externalPaymentMethod,
        externalReference: trimOrNull(input.externalReference),
        operatorNote: trimOrNull(input.operatorNote),
        recordedBy: recordedBy!,
        recordedAt: new Date().toISOString(),
        stripeInvoiceId,
        collectionChannel: collectionChannelFor(input),
        idempotencyKey,
      },
    };
  }

  const nextProbeStatus =
    amountCents >= remaining && remaining > 0 ? "paid" : "partially-paid";
  try {
    assertObligationTransition(obligation.status, nextProbeStatus);
  } catch (err) {
    return {
      ok: false,
      errors: {
        status: err instanceof Error ? err.message : "Invalid obligation status transition.",
      },
    };
  }

  const channel = collectionChannelFor(input);
  const recordedAt = new Date().toISOString();
  const event: ObligationPaymentEvent = {
    id: newLifecycleId("payevt"),
    paymentGroupId: newLifecycleId("paygrp"),
    amountCents,
    currency,
    paidAt: paidAt!,
    externalPaymentMethod: input.externalPaymentMethod,
    externalReference: trimOrNull(input.externalReference),
    operatorNote: trimOrNull(input.operatorNote),
    recordedBy: recordedBy!,
    recordedAt,
    stripeInvoiceId,
    collectionChannel: channel,
    idempotencyKey,
  };

  const receipt: ObligationPaymentReceipt = {
    status: amountCents >= remaining ? "paid" : "partial",
    amountCents,
    currency,
    paidAt: paidAt!,
    externalPaymentMethod: input.externalPaymentMethod,
    externalReference: event.externalReference,
    operatorNote: event.operatorNote,
    recordedBy: recordedBy!,
    recordedAt,
    stripeInvoiceId,
    collectionChannel: channel,
    idempotencyKey,
  };

  return {
    ok: true,
    idempotentReplay: false,
    obligation,
    receipt,
    event,
  };
}

export function applyObligationExternalPayment(
  pkg: ContractLifecyclePackage,
  input: RecordObligationExternalPaymentInput & { contractId: number },
):
  | { ok: true; pkg: ContractLifecyclePackage; idempotentReplay: boolean }
  | { ok: false; errors: FieldErrors } {
  const validated = validateRecordObligationExternalPayment(input, {
    contractId: input.contractId,
    plan: pkg.billingPlan,
  });
  if (!validated.ok) return validated;
  if (validated.idempotentReplay) {
    return { ok: true, pkg, idempotentReplay: true };
  }

  const plan = pkg.billingPlan!;
  const nextObligations = plan.obligations.map((obligation) => {
    if (obligation.id !== validated.obligation.id) return obligation;
    return applyEventToObligation(obligation, validated.event);
  });

  let next: ContractLifecyclePackage = {
    ...pkg,
    billingPlan: {
      ...plan,
      obligations: nextObligations,
      updatedAt: new Date().toISOString(),
    },
  };
  next = appendAudit(next, {
    actor: input.recordedBy,
    action: "obligation.external-payment-recorded",
    reason: `${validated.event.externalPaymentMethod}${validated.event.externalReference ? ` · ${validated.event.externalReference}` : ""} · $${(validated.event.amountCents / 100).toFixed(2)} → ${validated.obligation.label}`,
  });
  return { ok: true, pkg: next, idempotentReplay: false };
}

export function applyAllocatedExternalPayment(
  pkg: ContractLifecyclePackage,
  input: RecordAllocatedExternalPaymentInput & { contractId: number },
):
  | {
      ok: true;
      pkg: ContractLifecyclePackage;
      idempotentReplay: boolean;
      preview: AllocationPreview;
    }
  | { ok: false; errors: FieldErrors } {
  try {
    assertNoSensitiveCardFields(input as unknown as Record<string, unknown>);
  } catch (err) {
    return {
      ok: false,
      errors: {
        card: err instanceof Error ? err.message : "Sensitive card data is not allowed.",
      },
    };
  }

  const plan = pkg.billingPlan;
  if (!plan) {
    return {
      ok: false,
      errors: { plan: "Billing plan with obligations is required before recording an external payment." },
    };
  }

  const errors: FieldErrors = {};
  const amountCents = Number(input.amountCents);
  if (!Number.isFinite(amountCents) || !Number.isInteger(amountCents) || amountCents <= 0) {
    errors.amountCents = "Amount must be a positive integer in cents.";
  }

  const currency = normalizeCurrency(input.currency ?? plan.currency);
  if (currency !== "USD") errors.currency = "Only USD is supported for external obligation payments.";

  const paidAt = trimOrNull(input.paidAt);
  if (!paidAt) errors.paidAt = "Payment date is required.";
  else if (Number.isNaN(Date.parse(paidAt))) errors.paidAt = "Payment date must be a valid date.";

  if (!EXTERNAL_PAYMENT_METHODS.includes(input.externalPaymentMethod)) {
    errors.externalPaymentMethod = "Unsupported external payment method.";
  }

  const recordedBy = trimOrNull(input.recordedBy);
  if (!recordedBy) errors.recordedBy = "Operator who confirmed payment is required.";

  const stripeInvoiceId = trimOrNull(input.stripeInvoiceId);
  if (stripeInvoiceId && !/^in_[A-Za-z0-9]+$/.test(stripeInvoiceId)) {
    errors.stripeInvoiceId = "Invalid Stripe invoice ID format.";
  }

  if (Object.keys(errors).length) return { ok: false, errors };

  const preview = previewExternalPaymentAllocation(plan, {
    amountCents,
    allocationMode: input.allocationMode,
    allocations: input.allocations,
    allowedObligationIds: input.allowedObligationIds,
  });
  if ("ok" in preview && preview.ok === false) return preview;
  const allocationPreview = preview as AllocationPreview;

  if (allocationPreview.unallocatedCents > 0) {
    return {
      ok: false,
      errors: {
        amountCents: `Payment leaves $${(allocationPreview.unallocatedCents / 100).toFixed(2)} unallocated. Reduce the amount or add more open obligations.`,
      },
    };
  }

  const fingerprint = allocationFingerprint(
    allocationPreview.legs.map((leg) => ({
      obligationId: leg.obligationId,
      amountCents: leg.amountCents,
    })),
  );
  const idempotencyKey = buildAllocatedExternalPaymentIdempotencyKey({
    contractId: input.contractId,
    amountCents,
    currency,
    paidAt: paidAt!,
    externalPaymentMethod: input.externalPaymentMethod,
    externalReference: input.externalReference,
    clientIdempotencyKey: input.clientIdempotencyKey,
    allocationFingerprint: fingerprint,
  });

  if (findExistingIdempotency(plan, idempotencyKey)) {
    return {
      ok: true,
      pkg,
      idempotentReplay: true,
      preview: allocationPreview,
    };
  }

  // Also reject duplicate external reference+date+amount+method across payment groups when ref present.
  const ref = trimOrNull(input.externalReference);
  if (ref) {
    const groupTotals = new Map<string, { paidAt: string; method: string; total: number }>();
    for (const obligation of plan.obligations) {
      for (const event of obligation.paymentEvents ?? []) {
        if (!event.externalReference || event.externalReference !== ref) continue;
        const existing = groupTotals.get(event.paymentGroupId) ?? {
          paidAt: event.paidAt.slice(0, 10),
          method: event.externalPaymentMethod,
          total: 0,
        };
        existing.total += event.amountCents;
        groupTotals.set(event.paymentGroupId, existing);
      }
    }
    for (const group of groupTotals.values()) {
      if (
        group.paidAt === paidAt!.slice(0, 10) &&
        group.method === input.externalPaymentMethod &&
        group.total === amountCents
      ) {
        return {
          ok: false,
          errors: {
            externalReference:
              "A payment with this reference, date, method, and amount was already recorded.",
          },
        };
      }
    }
  }

  const channel = collectionChannelFor(input);
  const recordedAt = new Date().toISOString();
  const paymentGroupId = newLifecycleId("paygrp");

  let nextObligations = plan.obligations;
  for (const leg of allocationPreview.legs) {
    const event: ObligationPaymentEvent = {
      id: newLifecycleId("payevt"),
      paymentGroupId,
      amountCents: leg.amountCents,
      currency,
      paidAt: paidAt!,
      externalPaymentMethod: input.externalPaymentMethod,
      externalReference: ref,
      operatorNote: trimOrNull(input.operatorNote),
      recordedBy: recordedBy!,
      recordedAt,
      stripeInvoiceId,
      collectionChannel: channel,
      idempotencyKey,
    };
    nextObligations = nextObligations.map((obligation) =>
      obligation.id === leg.obligationId ? applyEventToObligation(obligation, event) : obligation,
    );
  }

  let next: ContractLifecyclePackage = {
    ...pkg,
    billingPlan: {
      ...plan,
      obligations: nextObligations,
      updatedAt: recordedAt,
    },
  };
  next = appendAudit(next, {
    actor: recordedBy!,
    action: "obligation.external-payment-allocated",
    reason: `${input.externalPaymentMethod}${ref ? ` · ${ref}` : ""} · $${(amountCents / 100).toFixed(2)} across ${allocationPreview.legs.length} obligation(s)`,
  });

  return { ok: true, pkg: next, idempotentReplay: false, preview: allocationPreview };
}

/**
 * True when agreement-level full settlement would be unsafe
 * (installment / multi-obligation billing plan still has open legs).
 */
export function billingPlanBlocksAgreementLevelSettlement(
  plan: ProposedBillingPlan | null | undefined,
): boolean {
  if (!plan?.obligations?.length) return false;
  const open = plan.obligations.filter((obligation) =>
    isObligationOpenForExternalPayment(obligation),
  );
  if (open.length >= 2) return true;
  if (open.length === 1 && plan.obligations.length >= 2) {
    // Single open installment remains — still prefer obligation path, but allow
    // agreement-level only when that one open leg equals the full one-time total.
    return open[0]!.amountCents !== plan.oneTimeTotalCents;
  }
  return false;
}
