/**
 * Obligation-level external payment recording (Cash App, etc.).
 * Records already-received external payments against invoice obligations.
 * Never calls Stripe. Never charges a card. Never auto-marks Stripe invoices paid.
 */

import { appendAudit } from "./package.ts";
import type {
  ContractLifecyclePackage,
  InvoiceObligation,
  InvoiceObligationStatus,
  ProposedBillingPlan,
} from "./types.ts";
import { assertObligationTransition } from "./transitions.ts";
import { assertNoSensitiveCardFields } from "../direct-agreement/validate.ts";

export const EXTERNAL_PAYMENT_METHODS = [
  "cash-app",
  "check",
  "wire",
  "ach",
  "other",
] as const;

export type ExternalPaymentMethod = (typeof EXTERNAL_PAYMENT_METHODS)[number];

export type ObligationCollectionChannel =
  | "stripe-invoice-external-pay"
  | "manual-external"
  | "stripe-collected";

export type ObligationPaymentReceipt = {
  status: "paid";
  amountCents: number;
  currency: string;
  paidAt: string;
  externalPaymentMethod: ExternalPaymentMethod;
  externalReference?: string | null;
  operatorNote?: string | null;
  recordedBy: string;
  recordedAt: string;
  /** Accounting reference only — does not imply Stripe collected the funds. */
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
  /**
   * When true, obligation may already have a Stripe draft/sent invoice ID used
   * for accounting, but payment was received outside Stripe collection.
   */
  paidOutsideStripe?: boolean;
};

export type FieldErrors = Record<string, string>;

const PAID: InvoiceObligationStatus = "paid";

function trimOrNull(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function normalizeCurrency(value: unknown): string {
  return String(value ?? "USD")
    .trim()
    .toUpperCase() || "USD";
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
  if (!Number.isFinite(amountCents) || !Number.isInteger(amountCents) || amountCents <= 0) {
    errors.amountCents = "Amount must be a positive integer in cents.";
  } else if (amountCents !== obligation.amountCents) {
    errors.amountCents = `Amount must match the obligation ($${(obligation.amountCents / 100).toFixed(2)}).`;
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

  const idempotencyKey = buildObligationExternalPaymentIdempotencyKey({
    contractId: context.contractId,
    obligationId: obligation.id,
    amountCents,
    currency,
    paidAt: paidAt!,
    externalPaymentMethod: input.externalPaymentMethod,
    externalReference: input.externalReference,
  });

  if (obligation.status === PAID && obligation.paymentReceipt?.idempotencyKey === idempotencyKey) {
    return {
      ok: true,
      idempotentReplay: true,
      obligation,
      receipt: obligation.paymentReceipt,
    };
  }

  if (obligation.status === PAID) {
    return {
      ok: false,
      errors: {
        obligationId:
          "This obligation is already marked paid with different payment references. Do not record a duplicate payment.",
      },
    };
  }

  if (obligation.collectionChannel === "stripe-collected" || obligation.paymentReceipt?.collectionChannel === "stripe-collected") {
    return {
      ok: false,
      errors: {
        obligationId:
          "This obligation was collected through Stripe. Do not also record an external Cash App payment.",
      },
    };
  }

  try {
    assertObligationTransition(obligation.status, PAID);
  } catch (err) {
    return {
      ok: false,
      errors: {
        status: err instanceof Error ? err.message : "Invalid obligation status transition.",
      },
    };
  }

  const collectionChannel: ObligationCollectionChannel =
    stripeInvoiceId || input.paidOutsideStripe
      ? "stripe-invoice-external-pay"
      : "manual-external";

  const receipt: ObligationPaymentReceipt = {
    status: "paid",
    amountCents,
    currency,
    paidAt: paidAt!,
    externalPaymentMethod: input.externalPaymentMethod,
    externalReference: trimOrNull(input.externalReference),
    operatorNote: trimOrNull(input.operatorNote),
    recordedBy: recordedBy!,
    recordedAt: new Date().toISOString(),
    stripeInvoiceId,
    collectionChannel,
    idempotencyKey,
  };

  return {
    ok: true,
    idempotentReplay: false,
    obligation,
    receipt,
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
  const nextObligations = plan.obligations.map((o) => {
    if (o.id !== validated.obligation.id) return o;
    return {
      ...o,
      status: PAID,
      paidAt: validated.receipt.paidAt,
      paymentReceipt: validated.receipt,
      collectionChannel: validated.receipt.collectionChannel,
      // Preserve any existing Stripe draft id for accounting; do not invent collection.
      stripeDraftInvoiceId: validated.receipt.stripeInvoiceId ?? o.stripeDraftInvoiceId ?? null,
    };
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
    fromStatus: validated.obligation.status,
    toStatus: PAID,
    reason: `${validated.receipt.externalPaymentMethod}${validated.receipt.externalReference ? ` · ${validated.receipt.externalReference}` : ""}`,
  });

  return { ok: true, pkg: next, idempotentReplay: false };
}
