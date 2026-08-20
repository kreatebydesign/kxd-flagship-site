/**
 * Live Stripe invoice payment → commercial obligation reconciliation (pure).
 * Deterministic linkage only — never amount+email alone.
 */

import { appendAudit } from "./package.ts";
import { applyOnboardingEligibility } from "./onboarding-eligibility.ts";
import type { ContractLifecyclePackage, InvoiceObligation } from "./types.ts";
import { assertObligationTransition } from "./transitions.ts";
import { LIFECYCLE_STRIPE_METADATA } from "../stripe/lifecycle-test-billing-auth.ts";

export type ObligationStripeBinding = {
  obligationId: string;
  stripeInvoiceId: string;
  linkedAt: string;
  linkedBy: string;
  note?: string | null;
};

export type PendingVerifiedStripePayment = {
  stripeEventId: string;
  stripeInvoiceId: string;
  stripePaymentIntentId?: string | null;
  stripeChargeId?: string | null;
  amountCents: number;
  currency: string;
  paidAt: string;
  contractId: number;
  obligationId: string;
  matchedBy:
    | "metadata"
    | "obligation-binding"
    | "obligation-stripe-draft-id"
    | "payment-references";
  livemode: true;
  recordedAt: string;
};

export type LiveInvoicePaidEvent = {
  id: string;
  type: string;
  livemode: boolean;
  created?: number;
  data: {
    object: {
      id?: string;
      object?: string;
      status?: string | null;
      amount_paid?: number | null;
      amount_due?: number | null;
      currency?: string | null;
      paid?: boolean | null;
      payment_intent?: string | { id?: string } | null;
      charge?: string | { id?: string } | null;
      customer?: string | { id?: string } | null;
      metadata?: Record<string, string> | null;
    };
  };
};

export type LiveMatchResult =
  | {
      ok: true;
      contractId: number;
      obligationId: string;
      matchedBy: PendingVerifiedStripePayment["matchedBy"];
      amountCents: number;
      currency: string;
      stripeInvoiceId: string;
      stripePaymentIntentId: string | null;
      stripeChargeId: string | null;
      paidAt: string;
    }
  | { ok: false; code: string; message: string };

function metaOf(event: LiveInvoicePaidEvent): Record<string, string> {
  const raw = event.data.object.metadata;
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string" && v.trim()) out[k] = v.trim();
  }
  return out;
}

function asStripeId(
  value: string | { id?: string } | null | undefined,
): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object" && typeof value.id === "string") {
    return value.id.trim() || null;
  }
  return null;
}

function findInitialObligationId(pkg: ContractLifecyclePackage): string | null {
  const fromPlan = pkg.billingPlan?.obligations?.find((o) => o.kind === "initial");
  if (fromPlan?.id) return fromPlan.id;
  const installments = pkg.structuredPaymentTerms?.installments ?? [];
  if (installments[0]?.id) return installments[0].id;
  return null;
}

function findObligation(
  pkg: ContractLifecyclePackage,
  obligationId: string,
): InvoiceObligation | null {
  return pkg.billingPlan?.obligations?.find((o) => o.id === obligationId) ?? null;
}

function expectedAmountCents(
  pkg: ContractLifecyclePackage,
  obligationId: string,
): number | null {
  const obl = findObligation(pkg, obligationId);
  if (obl) return obl.amountCents;
  const installment = pkg.structuredPaymentTerms?.installments?.find(
    (i) => i.id === obligationId,
  );
  return installment?.amountCents ?? null;
}

/**
 * Resolve deterministic match for a paid live invoice against one contract package.
 * Caller supplies the candidate contract (looked up by metadata/binding).
 */
export function matchLivePaidInvoiceToPackage(input: {
  event: LiveInvoicePaidEvent;
  contractId: number;
  pkg: ContractLifecyclePackage;
}): LiveMatchResult {
  const event = input.event;
  if (event.livemode !== true) {
    return { ok: false, code: "not-live", message: "Live reconciliation requires livemode=true." };
  }
  if (event.type !== "invoice.paid" && event.type !== "invoice_payment.paid") {
    return { ok: false, code: "unsupported-event", message: `Unsupported event type ${event.type}.` };
  }

  const obj = event.data.object;
  const stripeInvoiceId = String(obj.id ?? "").trim();
  if (!stripeInvoiceId.startsWith("in_")) {
    return { ok: false, code: "missing-invoice-id", message: "Paid event missing Stripe invoice id." };
  }

  const paid =
    obj.paid === true ||
    obj.status === "paid" ||
    (typeof obj.amount_paid === "number" && obj.amount_paid > 0);
  if (!paid) {
    return { ok: false, code: "not-paid", message: "Invoice object is not paid." };
  }

  const amountCents =
    typeof obj.amount_paid === "number" && obj.amount_paid > 0
      ? obj.amount_paid
      : typeof obj.amount_due === "number"
        ? obj.amount_due
        : 0;
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return { ok: false, code: "invalid-amount", message: "Paid invoice amount is invalid." };
  }

  const currency = String(obj.currency ?? "usd").trim().toUpperCase() || "USD";
  const meta = metaOf(event);
  const metaContractId = meta[LIFECYCLE_STRIPE_METADATA.contractId];
  const metaObligationId = meta[LIFECYCLE_STRIPE_METADATA.obligationId];

  let obligationId: string | null = null;
  let matchedBy: PendingVerifiedStripePayment["matchedBy"] | null = null;

  if (metaContractId) {
    if (metaContractId !== String(input.contractId)) {
      return {
        ok: false,
        code: "contract-mismatch",
        message: "Stripe metadata contract id does not match candidate contract.",
      };
    }
    if (metaObligationId) {
      obligationId = metaObligationId;
      matchedBy = "metadata";
    }
  }

  const bindings = input.pkg.obligationStripeBindings ?? [];
  const binding = bindings.find((b) => b.stripeInvoiceId === stripeInvoiceId);
  if (!matchedBy && binding) {
    obligationId = binding.obligationId;
    matchedBy = "obligation-binding";
  }

  const planObl = input.pkg.billingPlan?.obligations?.find(
    (o) => o.stripeDraftInvoiceId === stripeInvoiceId,
  );
  if (!matchedBy && planObl) {
    obligationId = planObl.id;
    matchedBy = "obligation-stripe-draft-id";
  }

  const refs = input.pkg.paymentReferences;
  if (
    !matchedBy &&
    refs?.stripeInvoiceId === stripeInvoiceId &&
    (refs.paymentStatus === "paid" || refs.paymentStatus === "open" || refs.paymentStatus)
  ) {
    obligationId = findInitialObligationId(input.pkg);
    matchedBy = "payment-references";
  }

  if (!matchedBy || !obligationId) {
    return {
      ok: false,
      code: "no-deterministic-link",
      message:
        "No deterministic linkage (metadata, obligation binding, draft invoice id, or payment references).",
    };
  }

  const expected = expectedAmountCents(input.pkg, obligationId);
  if (expected == null) {
    return {
      ok: false,
      code: "unknown-obligation",
      message: `Obligation ${obligationId} is not on this contract package.`,
    };
  }
  if (expected !== amountCents) {
    return {
      ok: false,
      code: "amount-mismatch",
      message: `Invoice amount ${amountCents} does not match obligation ${obligationId} amount ${expected}.`,
    };
  }

  const paidAt =
    typeof event.created === "number"
      ? new Date(event.created * 1000).toISOString()
      : new Date().toISOString();

  return {
    ok: true,
    contractId: input.contractId,
    obligationId,
    matchedBy,
    amountCents,
    currency,
    stripeInvoiceId,
    stripePaymentIntentId: asStripeId(obj.payment_intent),
    stripeChargeId: asStripeId(obj.charge),
    paidAt,
  };
}

export function contractIdFromLiveInvoiceEvent(
  event: LiveInvoicePaidEvent,
): number | null {
  const meta = metaOf(event);
  const raw = meta[LIFECYCLE_STRIPE_METADATA.contractId];
  if (!raw) return null;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/**
 * Apply a verified live paid invoice to a contract package.
 * If billing plan does not exist yet, stores a pending verified payment.
 */
export function applyVerifiedLiveInvoicePayment(input: {
  pkg: ContractLifecyclePackage;
  contractStatus: string | null | undefined;
  match: Extract<LiveMatchResult, { ok: true }>;
  eventId: string;
}): {
  pkg: ContractLifecyclePackage;
  duplicate: boolean;
  appliedToObligation: boolean;
  pending: boolean;
} {
  const { match, eventId } = input;
  let pkg = input.pkg;
  const processed = pkg.processedWebhookEventIds ?? [];
  const markProcessed = (ids: string[]) =>
    ids.includes(eventId) ? ids : [...ids, eventId];

  const pendingExisting = (pkg.pendingVerifiedStripePayments ?? []).some(
    (p) => p.stripeEventId === eventId || p.stripeInvoiceId === match.stripeInvoiceId,
  );
  const obl = findObligation(pkg, match.obligationId);
  if (obl?.status === "paid") {
    pkg = {
      ...pkg,
      processedWebhookEventIds: markProcessed(processed),
      pendingVerifiedStripePayments: (pkg.pendingVerifiedStripePayments ?? []).filter(
        (p) => p.stripeInvoiceId !== match.stripeInvoiceId,
      ),
    };
    pkg = applyOnboardingEligibility(pkg, input.contractStatus);
    return { pkg, duplicate: true, appliedToObligation: false, pending: false };
  }

  // Event may already be recorded as pending (pre-billing-plan). Allow apply-through
  // once a billing plan exists; otherwise treat as duplicate.
  if (processed.includes(eventId) && !pendingExisting) {
    return { pkg, duplicate: true, appliedToObligation: false, pending: false };
  }

  if (!pkg.billingPlan) {
    if (pendingExisting) {
      pkg = {
        ...pkg,
        processedWebhookEventIds: markProcessed(processed),
      };
      return { pkg, duplicate: true, appliedToObligation: false, pending: true };
    }
    const pending: PendingVerifiedStripePayment = {
      stripeEventId: eventId,
      stripeInvoiceId: match.stripeInvoiceId,
      stripePaymentIntentId: match.stripePaymentIntentId,
      stripeChargeId: match.stripeChargeId,
      amountCents: match.amountCents,
      currency: match.currency,
      paidAt: match.paidAt,
      contractId: match.contractId,
      obligationId: match.obligationId,
      matchedBy: match.matchedBy,
      livemode: true,
      recordedAt: new Date().toISOString(),
    };
    pkg = {
      ...pkg,
      pendingVerifiedStripePayments: [...(pkg.pendingVerifiedStripePayments ?? []), pending],
      processedWebhookEventIds: markProcessed(processed),
    };
    pkg = appendAudit(pkg, {
      actor: "stripe-live-webhook",
      action: "stripe.live-invoice-paid.pending",
      reason: `${match.stripeInvoiceId} → obligation ${match.obligationId} (awaiting billing plan / execution)`,
    });
    pkg = applyOnboardingEligibility(pkg, input.contractStatus);
    return { pkg, duplicate: false, appliedToObligation: false, pending: true };
  }

  try {
    assertObligationTransition(obl?.status ?? "pending-trigger", "paid");
  } catch (err) {
    throw new Error(
      err instanceof Error ? err.message : "Invalid obligation transition to paid.",
    );
  }

  const now = new Date().toISOString();
  const nextObligations = pkg.billingPlan.obligations.map((o) => {
    if (o.id !== match.obligationId) return o;
    return {
      ...o,
      status: "paid" as const,
      paidAt: match.paidAt,
      stripeDraftInvoiceId: match.stripeInvoiceId,
      collectionChannel: "stripe-collected" as const,
      paymentReceipt: {
        status: "paid" as const,
        amountCents: match.amountCents,
        currency: match.currency,
        paidAt: match.paidAt,
        externalPaymentMethod: "other" as const,
        externalReference: match.stripeInvoiceId,
        operatorNote: `Verified live Stripe invoice (${match.matchedBy})`,
        recordedBy: "stripe-live-webhook",
        recordedAt: now,
        stripeInvoiceId: match.stripeInvoiceId,
        collectionChannel: "stripe-collected" as const,
        idempotencyKey: `stripe-live:${eventId}`,
      },
    };
  });

  pkg = {
    ...pkg,
    billingPlan: {
      ...pkg.billingPlan,
      obligations: nextObligations,
      updatedAt: now,
    },
    processedWebhookEventIds: markProcessed(processed),
    pendingVerifiedStripePayments: (pkg.pendingVerifiedStripePayments ?? []).filter(
      (p) => p.stripeInvoiceId !== match.stripeInvoiceId,
    ),
  };
  pkg = appendAudit(pkg, {
    actor: "stripe-live-webhook",
    action: "stripe.live-invoice-paid",
    reason: `${match.stripeInvoiceId} → obligation ${match.obligationId} (${match.matchedBy})`,
  });
  const wasEligible = Boolean(input.pkg.onboardingEligible);
  pkg = applyOnboardingEligibility(pkg, input.contractStatus);
  if (pkg.onboardingEligible && !wasEligible) {
    pkg = appendAudit(pkg, {
      actor: "system",
      action: "onboarding.eligible",
      reason: "Executed contract + verified initial obligation payment.",
    });
  }
  return { pkg, duplicate: false, appliedToObligation: true, pending: false };
}

/** After billing plan exists, apply any pending verified live payments. */
export function applyPendingVerifiedStripePayments(input: {
  pkg: ContractLifecyclePackage;
  contractStatus: string | null | undefined;
}): { pkg: ContractLifecyclePackage; appliedCount: number } {
  let pkg = input.pkg;
  if (!pkg.billingPlan) return { pkg, appliedCount: 0 };
  const pending = [...(pkg.pendingVerifiedStripePayments ?? [])];
  if (!pending.length) {
    return { pkg: applyOnboardingEligibility(pkg, input.contractStatus), appliedCount: 0 };
  }

  let appliedCount = 0;
  for (const item of pending) {
    const match: Extract<LiveMatchResult, { ok: true }> = {
      ok: true,
      contractId: item.contractId,
      obligationId: item.obligationId,
      matchedBy: item.matchedBy,
      amountCents: item.amountCents,
      currency: item.currency,
      stripeInvoiceId: item.stripeInvoiceId,
      stripePaymentIntentId: item.stripePaymentIntentId ?? null,
      stripeChargeId: item.stripeChargeId ?? null,
      paidAt: item.paidAt,
    };
    const result = applyVerifiedLiveInvoicePayment({
      pkg,
      contractStatus: input.contractStatus,
      match,
      eventId: item.stripeEventId,
    });
    pkg = result.pkg;
    if (result.appliedToObligation) appliedCount += 1;
  }
  return { pkg, appliedCount };
}

export function bindObligationStripeInvoice(input: {
  pkg: ContractLifecyclePackage;
  obligationId: string;
  stripeInvoiceId: string;
  actor: string;
  note?: string | null;
}): { pkg: ContractLifecyclePackage } | { error: string } {
  const invoiceId = input.stripeInvoiceId.trim();
  if (!/^in_[A-Za-z0-9]+$/.test(invoiceId)) {
    return { error: "Invalid Stripe invoice id." };
  }
  const knownIds = new Set<string>();
  for (const i of input.pkg.structuredPaymentTerms?.installments ?? []) {
    if (i.id) knownIds.add(i.id);
  }
  for (const o of input.pkg.billingPlan?.obligations ?? []) {
    knownIds.add(o.id);
  }
  if (!knownIds.has(input.obligationId)) {
    return { error: `Unknown obligation id ${input.obligationId} on this contract.` };
  }

  const bindings = [...(input.pkg.obligationStripeBindings ?? [])];
  const existingSameInvoice = bindings.find((b) => b.stripeInvoiceId === invoiceId);
  if (existingSameInvoice && existingSameInvoice.obligationId !== input.obligationId) {
    return {
      error: `Invoice ${invoiceId} is already bound to obligation ${existingSameInvoice.obligationId}.`,
    };
  }

  const nextBinding: ObligationStripeBinding = {
    obligationId: input.obligationId,
    stripeInvoiceId: invoiceId,
    linkedAt: new Date().toISOString(),
    linkedBy: input.actor,
    note: input.note ?? null,
  };
  const nextBindings = [
    ...bindings.filter((b) => b.obligationId !== input.obligationId),
    nextBinding,
  ];

  let pkg: ContractLifecyclePackage = {
    ...input.pkg,
    obligationStripeBindings: nextBindings,
  };

  if (pkg.billingPlan) {
    pkg = {
      ...pkg,
      billingPlan: {
        ...pkg.billingPlan,
        obligations: pkg.billingPlan.obligations.map((o) =>
          o.id === input.obligationId
            ? { ...o, stripeDraftInvoiceId: invoiceId }
            : o,
        ),
        updatedAt: new Date().toISOString(),
      },
    };
  }

  pkg = appendAudit(pkg, {
    actor: input.actor,
    action: "obligation.stripe-invoice-bound",
    reason: `${input.obligationId} ↔ ${invoiceId} (no Stripe mutation; linkage only)`,
  });

  return { pkg };
}
