/**
 * Pure logic for commercial lifecycle Stripe TEST MODE invoices.
 * No network. No secrets.
 */

import { createHash } from "crypto";
import {
  LIFECYCLE_STRIPE_METADATA,
  LIFECYCLE_STRIPE_PURPOSE,
} from "../../stripe/lifecycle-test-billing-auth.ts";
import type { ProposedBillingPlan } from "../types.ts";

export type LifecycleStripeTestState = {
  mode: "test";
  livemode: false;
  accountId: string | null;
  customerId: string | null;
  invoiceId: string | null;
  invoiceStatus: string | null;
  /** Hosted invoice URL for operator payment — TEST MODE only. */
  hostedInvoiceUrl: string | null;
  paymentIntentId: string | null;
  amountCents: number | null;
  currency: string | null;
  obligationId: string | null;
  billingPlanId: string | null;
  processedEventIds: string[];
  eligibilitySource: "stripe-test-payment" | "mock" | null;
  lastError: string | null;
  preparedAt: string | null;
  paidAt: string | null;
};

export function emptyLifecycleStripeTestState(): LifecycleStripeTestState {
  return {
    mode: "test",
    livemode: false,
    accountId: null,
    customerId: null,
    invoiceId: null,
    invoiceStatus: null,
    hostedInvoiceUrl: null,
    paymentIntentId: null,
    amountCents: null,
    currency: null,
    obligationId: null,
    billingPlanId: null,
    processedEventIds: [],
    eligibilitySource: null,
    lastError: null,
    preparedAt: null,
    paidAt: null,
  };
}

export function selectInitialObligation(plan: ProposedBillingPlan) {
  return plan.obligations.find((o) => o.kind === "initial") ?? plan.obligations[0] ?? null;
}

export function assertPlanPayableForStripeTest(plan: ProposedBillingPlan): {
  ok: true;
  obligationId: string;
  amountCents: number;
  currency: string;
} | { ok: false; message: string } {
  if (plan.reconciliation.differenceCents !== 0) {
    return { ok: false, message: "Billing plan reconciliation difference is non-zero." };
  }
  if (plan.status === "blocked") {
    return { ok: false, message: "Billing plan is blocked — resolve readiness first." };
  }
  const obligation = selectInitialObligation(plan);
  if (!obligation) {
    return { ok: false, message: "No initial obligation on billing plan." };
  }
  if (obligation.status === "paid") {
    return { ok: false, message: "Initial obligation is already paid." };
  }
  if (obligation.amountCents <= 0) {
    return { ok: false, message: "Obligation amount must be positive." };
  }
  if (String(obligation.currency).toUpperCase() !== "USD") {
    return { ok: false, message: "Only USD is supported in this controlled pilot." };
  }
  return {
    ok: true,
    obligationId: obligation.id,
    amountCents: obligation.amountCents,
    currency: "USD",
  };
}

export function deriveLifecycleInvoiceIdempotencyKey(input: {
  contractId: number;
  contractVersion: number;
  obligationId: string;
  amountCents: number;
  currency: string;
  billingPlanId: string;
}): string {
  const material = [
    "lifecycle-invoice-v1",
    `c:${input.contractId}`,
    `v:${input.contractVersion}`,
    `o:${input.obligationId}`,
    `a:${input.amountCents}`,
    `cur:${input.currency}`,
    `bp:${input.billingPlanId}`,
  ].join("|");
  const hash = createHash("sha256").update(material).digest("hex").slice(0, 24);
  return `kxd_lc_inv_${hash}`;
}

export function deriveLifecycleCustomerIdempotencyKey(input: {
  contractId: number;
  clientId: number;
  billingEmail: string;
}): string {
  const material = [
    "lifecycle-customer-v1",
    `c:${input.contractId}`,
    `cl:${input.clientId}`,
    `e:${input.billingEmail.trim().toLowerCase()}`,
  ].join("|");
  const hash = createHash("sha256").update(material).digest("hex").slice(0, 24);
  return `kxd_lc_cus_${hash}`;
}

export function buildLifecycleInvoiceMetadata(input: {
  clientId: number;
  contractId: number;
  obligationId: string;
  billingPlanId: string;
}): Record<string, string> {
  return {
    [LIFECYCLE_STRIPE_METADATA.clientId]: String(input.clientId),
    [LIFECYCLE_STRIPE_METADATA.contractId]: String(input.contractId),
    [LIFECYCLE_STRIPE_METADATA.obligationId]: input.obligationId,
    [LIFECYCLE_STRIPE_METADATA.billingPlanId]: input.billingPlanId,
    [LIFECYCLE_STRIPE_METADATA.mode]: "test",
    [LIFECYCLE_STRIPE_METADATA.purpose]: LIFECYCLE_STRIPE_PURPOSE,
  };
}

export function reconcileInvoiceAgainstPlan(input: {
  invoice: {
    livemode: boolean;
    amountDue: number;
    amountPaid: number;
    currency: string;
    customerId: string;
    status: string;
    metadata: Record<string, string>;
  };
  expected: {
    customerId: string;
    amountCents: number;
    currency: string;
    clientId: number;
    contractId: number;
    obligationId: string;
  };
}): { ok: true } | { ok: false; message: string } {
  if (input.invoice.livemode !== false) {
    return { ok: false, message: "Rejecting livemode invoice in test processor." };
  }
  if (input.invoice.customerId !== input.expected.customerId) {
    return { ok: false, message: "Invoice customer does not match contract mapping." };
  }
  if (input.invoice.currency.toUpperCase() !== input.expected.currency.toUpperCase()) {
    return { ok: false, message: "Invoice currency mismatch." };
  }
  const amount =
    input.invoice.status === "paid" ? input.invoice.amountPaid : input.invoice.amountDue;
  if (amount !== input.expected.amountCents) {
    return { ok: false, message: "Invoice amount mismatch." };
  }
  const meta = input.invoice.metadata;
  if (meta[LIFECYCLE_STRIPE_METADATA.contractId] !== String(input.expected.contractId)) {
    return { ok: false, message: "Invoice contract metadata mismatch." };
  }
  if (meta[LIFECYCLE_STRIPE_METADATA.clientId] !== String(input.expected.clientId)) {
    return { ok: false, message: "Invoice client metadata mismatch." };
  }
  if (meta[LIFECYCLE_STRIPE_METADATA.obligationId] !== input.expected.obligationId) {
    return { ok: false, message: "Invoice obligation metadata mismatch." };
  }
  if (meta[LIFECYCLE_STRIPE_METADATA.mode] !== "test") {
    return { ok: false, message: "Invoice mode metadata must be test." };
  }
  return { ok: true };
}
