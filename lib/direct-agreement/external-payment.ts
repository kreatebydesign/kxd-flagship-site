/**
 * External payment reconciliation — pure validation + provenance.
 * Records already-completed payments. Never calls Stripe. Never charges.
 */

import type { ContractLifecyclePackage } from "@/lib/proposal-lifecycle/types";
import type {
  DirectAgreementPaymentReferences,
  DirectAgreementTerms,
  PaymentProvenanceSource,
} from "./types";
import { PAYMENT_PROVENANCE_SOURCES } from "./types";
import { assertNoSensitiveCardFields } from "./validate";

export type FieldErrors = Record<string, string>;

export type RecordExternalPaymentInput = {
  source: PaymentProvenanceSource;
  amountCents: number;
  currency: string;
  paidAt: string;
  livemode?: boolean | null;
  stripeCustomerId?: string | null;
  stripePaymentIntentId?: string | null;
  stripeChargeId?: string | null;
  stripeInvoiceId?: string | null;
  receiptUrl?: string | null;
  hostedInvoiceUrl?: string | null;
  operatorNote?: string | null;
};

const STRIPE_ID_PATTERNS: Record<string, RegExp> = {
  stripeCustomerId: /^cus_[A-Za-z0-9]+$/,
  stripePaymentIntentId: /^pi_[A-Za-z0-9]+$/,
  stripeChargeId: /^(ch_|py_)[A-Za-z0-9]+$/,
  stripeInvoiceId: /^in_[A-Za-z0-9]+$/,
};

const ELIGIBLE_COMMERCIAL_STATUSES = new Set(["accepted", "payment-pending"]);
const IDEMPOTENT_PAID_STATUSES = new Set(["paid", "active"]);

function trimOrNull(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function normalizeCurrency(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

export function obligationAmountCents(input: {
  daTerms: DirectAgreementTerms | null;
  pkg: ContractLifecyclePackage;
  projectAmountDollars?: number | null;
}): number | null {
  if (input.daTerms?.oneTimeAmountCents && input.daTerms.oneTimeAmountCents > 0) {
    return input.daTerms.oneTimeAmountCents;
  }
  const terms = input.pkg.structuredPaymentTerms;
  if (terms?.oneTimeTotalCents && terms.oneTimeTotalCents > 0) {
    return terms.oneTimeTotalCents;
  }
  if (input.projectAmountDollars != null && Number.isFinite(input.projectAmountDollars)) {
    const cents = Math.round(Number(input.projectAmountDollars) * 100);
    return cents > 0 ? cents : null;
  }
  return null;
}

export function buildExternalPaymentIdempotencyKey(input: {
  contractId: number;
  source: PaymentProvenanceSource;
  amountCents: number;
  currency: string;
  paidAt: string;
  stripePaymentIntentId?: string | null;
  stripeChargeId?: string | null;
  stripeInvoiceId?: string | null;
}): string {
  const parts: string[] = [`contract:${input.contractId}`, `source:${input.source}`];
  if (input.stripePaymentIntentId) parts.push(`pi:${input.stripePaymentIntentId}`);
  if (input.stripeChargeId) parts.push(`ch:${input.stripeChargeId}`);
  if (input.stripeInvoiceId) parts.push(`in:${input.stripeInvoiceId}`);
  if (input.source === "manual-non-stripe") {
    parts.push(`amt:${input.amountCents}`);
    parts.push(`cur:${normalizeCurrency(input.currency)}`);
    parts.push(`paid:${input.paidAt.slice(0, 10)}`);
  }
  return `extpay:${parts.join("|")}`;
}

export function extractStripeObjectIds(
  refs: DirectAgreementPaymentReferences | null | undefined,
): string[] {
  if (!refs) return [];
  return [
    refs.stripePaymentIntentId,
    refs.stripeChargeId,
    refs.stripeInvoiceId,
  ].filter((v): v is string => Boolean(v && String(v).trim()));
}

export function findDuplicateStripeObjectConflict(
  existing: DirectAgreementPaymentReferences | null | undefined,
  next: Pick<
    DirectAgreementPaymentReferences,
    "stripePaymentIntentId" | "stripeChargeId" | "stripeInvoiceId" | "idempotencyKey"
  >,
): string | null {
  if (!existing) return null;
  const pairs: Array<[keyof typeof next, string]> = [
    ["stripePaymentIntentId", "PaymentIntent"],
    ["stripeChargeId", "Charge"],
    ["stripeInvoiceId", "Invoice"],
  ];
  for (const [key, label] of pairs) {
    const prev = trimOrNull(existing[key as keyof DirectAgreementPaymentReferences]);
    const incoming = trimOrNull(next[key]);
    if (prev && incoming && prev === incoming) {
      if (
        existing.paymentStatus === "paid" ||
        existing.idempotencyKey === next.idempotencyKey
      ) {
        return `duplicate:${key}`;
      }
      return `${label} ID ${incoming} is already linked on this agreement.`;
    }
  }
  if (
    existing.idempotencyKey &&
    next.idempotencyKey &&
    existing.idempotencyKey === next.idempotencyKey
  ) {
    return "duplicate:idempotencyKey";
  }
  return null;
}

export function isEligibleForExternalPaymentRecording(
  pkg: ContractLifecyclePackage,
): boolean {
  const status = String(pkg.commercialStatus ?? "");
  if (IDEMPOTENT_PAID_STATUSES.has(status) && pkg.paymentReferences?.idempotencyKey) {
    return true;
  }
  return ELIGIBLE_COMMERCIAL_STATUSES.has(status);
}

export function validateRecordExternalPaymentInput(
  input: RecordExternalPaymentInput,
  context: {
    contractId: number;
    commercialStatus: string | null | undefined;
    agreementSource: string | null | undefined;
    obligationCents: number | null;
    existingReferences: DirectAgreementPaymentReferences | null | undefined;
  },
):
  | {
      ok: true;
      references: DirectAgreementPaymentReferences;
      markPaid: true;
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
  const source = String(input.source ?? "") as PaymentProvenanceSource;
  if (!PAYMENT_PROVENANCE_SOURCES.includes(source)) {
    errors.source = "Payment source must be imported-external-stripe-payment, kxd-stripe-lifecycle, or manual-non-stripe.";
  }

  if (String(context.agreementSource ?? "") !== "direct-agreement") {
    errors.agreement = "External payment recording is only available for Direct Agreements.";
  }

  const status = String(context.commercialStatus ?? "");
  if (!ELIGIBLE_COMMERCIAL_STATUSES.has(status) && !IDEMPOTENT_PAID_STATUSES.has(status)) {
    errors.agreement = `Agreement must be payment-pending (or accepted) to record an external payment. Current status: ${status || "unknown"}.`;
  }

  const amountCents = Number(input.amountCents);
  if (!Number.isFinite(amountCents) || !Number.isInteger(amountCents) || amountCents <= 0) {
    errors.amountCents = "Amount must be a positive integer in cents.";
  }

  const currency = normalizeCurrency(input.currency);
  if (!currency) {
    errors.currency = "Currency is required.";
  } else if (currency !== "USD") {
    errors.currency = "Only USD is supported for Direct Agreement external payments.";
  }

  const paidAt = trimOrNull(input.paidAt);
  if (!paidAt) {
    errors.paidAt = "Payment date is required.";
  } else if (Number.isNaN(Date.parse(paidAt))) {
    errors.paidAt = "Payment date must be a valid date.";
  }

  if (
    context.obligationCents != null &&
    Number.isFinite(amountCents) &&
    amountCents > 0 &&
    amountCents !== context.obligationCents
  ) {
    errors.amountCents = `Amount must match the agreement obligation ($${(context.obligationCents / 100).toFixed(2)}).`;
  }

  const stripeCustomerId = trimOrNull(input.stripeCustomerId);
  const stripePaymentIntentId = trimOrNull(input.stripePaymentIntentId);
  const stripeChargeId = trimOrNull(input.stripeChargeId);
  const stripeInvoiceId = trimOrNull(input.stripeInvoiceId);
  const receiptUrl = trimOrNull(input.receiptUrl);
  const hostedInvoiceUrl = trimOrNull(input.hostedInvoiceUrl);
  const operatorNote = trimOrNull(input.operatorNote);

  const idFields = {
    stripeCustomerId,
    stripePaymentIntentId,
    stripeChargeId,
    stripeInvoiceId,
  } as const;

  for (const [key, value] of Object.entries(idFields)) {
    if (!value) continue;
    const pattern = STRIPE_ID_PATTERNS[key];
    if (pattern && !pattern.test(value)) {
      errors[key] = `Invalid ${key.replace("stripe", "Stripe ")} format.`;
    }
  }

  let livemode: boolean | null =
    input.livemode === true ? true : input.livemode === false ? false : null;

  if (source === "imported-external-stripe-payment") {
    if (livemode == null) {
      errors.livemode = "Live/test mode is required for Stripe external payments.";
    }
    const hasEvidence = Boolean(stripePaymentIntentId || stripeChargeId || stripeInvoiceId);
    if (!hasEvidence) {
      errors.stripeEvidence =
        "Stripe external payments require at least one of PaymentIntent ID, Charge ID, or Invoice ID.";
    }
  }

  if (source === "manual-non-stripe") {
    if (stripePaymentIntentId || stripeChargeId || stripeInvoiceId || stripeCustomerId) {
      errors.source =
        "Manual non-Stripe payments cannot include Stripe object IDs. Use imported-external-stripe-payment instead.";
    }
    if (livemode != null) {
      errors.livemode = "Live/test mode applies only to Stripe payments.";
    }
    livemode = null;
  }

  if (source === "kxd-stripe-lifecycle" && livemode === true) {
    errors.livemode =
      "kxd-stripe-lifecycle provenance is TEST-path only. Use imported-external-stripe-payment for LIVE payments.";
  }

  if (Object.keys(errors).length) return { ok: false, errors };

  const idempotencyKey = buildExternalPaymentIdempotencyKey({
    contractId: context.contractId,
    source,
    amountCents,
    currency,
    paidAt: paidAt!,
    stripePaymentIntentId,
    stripeChargeId,
    stripeInvoiceId,
  });

  const duplicate = findDuplicateStripeObjectConflict(context.existingReferences, {
    stripePaymentIntentId,
    stripeChargeId,
    stripeInvoiceId,
    idempotencyKey,
  });

  if (duplicate?.startsWith("duplicate:")) {
    const existing = context.existingReferences;
    if (
      existing &&
      (existing.idempotencyKey === idempotencyKey ||
        extractStripeObjectIds(existing).some((id) =>
          [stripePaymentIntentId, stripeChargeId, stripeInvoiceId].includes(id),
        )) &&
      (existing.paymentStatus === "paid" || IDEMPOTENT_PAID_STATUSES.has(status))
    ) {
      return {
        ok: true,
        idempotentReplay: true,
        markPaid: true,
        references: existing,
      };
    }
  } else if (duplicate) {
    return { ok: false, errors: { duplicate: duplicate } };
  }

  if (
    IDEMPOTENT_PAID_STATUSES.has(status) &&
    context.existingReferences?.paymentStatus === "paid" &&
    context.existingReferences.idempotencyKey !== idempotencyKey
  ) {
    return {
      ok: false,
      errors: {
        agreement:
          "This agreement is already paid with different payment references. Create a superseding agreement to record a new payment.",
      },
    };
  }

  const references: DirectAgreementPaymentReferences = {
    stripeCustomerId,
    stripePaymentIntentId,
    stripeChargeId,
    stripeInvoiceId,
    receiptUrl,
    hostedInvoiceUrl,
    paymentStatus: "paid",
    amountCents,
    currency,
    paidAt: paidAt!,
    operatorNote,
    source,
    livemode,
    idempotencyKey,
  };

  return {
    ok: true,
    references,
    markPaid: true,
    idempotentReplay: false,
  };
}

/** Guard used by services — no Stripe SDK import path. */
export function assertNoStripeMutationInExternalPaymentPath(): void {
  // Intentionally empty marker for verify scripts / static analysis.
  // External payment reconciliation must never import or call Stripe APIs.
}
