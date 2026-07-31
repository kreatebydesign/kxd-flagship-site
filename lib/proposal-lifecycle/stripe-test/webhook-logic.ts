/**
 * Pure commercial lifecycle Stripe TEST webhook processing.
 * Signature verification happens in the route before this module runs.
 */

import { LIFECYCLE_STRIPE_METADATA } from "../../stripe/lifecycle-test-billing-auth.ts";
import type { ProposedBillingPlan } from "../types.ts";
import { assertObligationTransition } from "../transitions.ts";
import type { LifecycleStripeTestState } from "./invoice-logic.ts";

export type LifecycleStripeWebhookEvent = {
  id: string;
  type: string;
  livemode: boolean;
  created?: number;
  data: {
    object: {
      id: string;
      object?: string;
      customer?: string | null;
      amount_paid?: number;
      amount_due?: number;
      currency?: string;
      status?: string | null;
      metadata?: Record<string, string> | null;
      payment_intent?: string | { id?: string } | null;
    };
  };
};

export type LifecycleStripeWebhookResult = {
  ok: boolean;
  duplicate?: boolean;
  error?: string;
  plan?: ProposedBillingPlan;
  stripeTest?: LifecycleStripeTestState;
  onboardingEligible?: boolean;
};

export function assertLifecycleStripeTestEvent(
  event: LifecycleStripeWebhookEvent,
): void {
  if (event.livemode !== false) {
    throw new Error("Rejecting event without explicit livemode=false.");
  }
  if (!event.id || typeof event.id !== "string") {
    throw new Error("Missing Stripe event id.");
  }
  // Real live-looking events without test prefix are still allowed if livemode=false
  // (Stripe test events use evt_...). Fail closed only on livemode.
}

export function processLifecycleStripeTestWebhookEvent(input: {
  event: LifecycleStripeWebhookEvent;
  plan: ProposedBillingPlan;
  stripeTest: LifecycleStripeTestState;
  expectedContractId: number;
  expectedClientId: number;
}): LifecycleStripeWebhookResult {
  const { event, plan, stripeTest, expectedContractId, expectedClientId } = input;
  const processed = [...(stripeTest.processedEventIds ?? [])];

  try {
    assertLifecycleStripeTestEvent(event);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Invalid event",
      plan,
      stripeTest,
    };
  }

  if (processed.includes(event.id)) {
    return {
      ok: true,
      duplicate: true,
      plan,
      stripeTest,
      onboardingEligible: stripeTest.eligibilitySource === "stripe-test-payment",
    };
  }

  const supported = new Set([
    "invoice.paid",
    "invoice.payment_succeeded",
    "invoice.payment_failed",
    "invoice.voided",
    "invoice.marked_uncollectible",
  ]);
  if (!supported.has(event.type)) {
    // Acknowledge without mutation.
    return {
      ok: true,
      plan,
      stripeTest: {
        ...stripeTest,
        processedEventIds: [...processed, event.id],
        lastError: null,
      },
    };
  }

  const obj = event.data.object;
  const meta = obj.metadata ?? {};
  if (meta[LIFECYCLE_STRIPE_METADATA.contractId] !== String(expectedContractId)) {
    return { ok: false, error: "Webhook contract metadata mismatch.", plan, stripeTest };
  }
  if (meta[LIFECYCLE_STRIPE_METADATA.clientId] !== String(expectedClientId)) {
    return { ok: false, error: "Webhook client metadata mismatch.", plan, stripeTest };
  }
  if (stripeTest.invoiceId && obj.id !== stripeTest.invoiceId) {
    return { ok: false, error: "Webhook invoice id does not match prepared invoice.", plan, stripeTest };
  }
  if (stripeTest.customerId && obj.customer && obj.customer !== stripeTest.customerId) {
    return { ok: false, error: "Webhook customer does not match mapping.", plan, stripeTest };
  }

  if (event.type === "invoice.payment_failed" || event.type === "invoice.voided" || event.type === "invoice.marked_uncollectible") {
    // Never regress a verified paid invoice / established eligibility on stale failure events.
    if (
      stripeTest.invoiceStatus === "paid" ||
      stripeTest.eligibilitySource === "stripe-test-payment" ||
      stripeTest.paidAt
    ) {
      return {
        ok: true,
        duplicate: true,
        plan,
        stripeTest: {
          ...stripeTest,
          processedEventIds: [...processed, event.id],
          lastError: `ignored_stale_${event.type}`,
        },
        onboardingEligible: stripeTest.eligibilitySource === "stripe-test-payment",
      };
    }
    return {
      ok: true,
      plan,
      stripeTest: {
        ...stripeTest,
        invoiceStatus: String(obj.status ?? event.type),
        processedEventIds: [...processed, event.id],
        lastError: event.type,
        // Never establish eligibility on failure/void.
      },
      onboardingEligible: false,
    };
  }

  // Paid paths
  const amountPaid = obj.amount_paid ?? 0;
  const currency = String(obj.currency ?? "").toUpperCase();
  if (stripeTest.amountCents != null && amountPaid !== stripeTest.amountCents) {
    return { ok: false, error: "Paid amount does not match prepared invoice.", plan, stripeTest };
  }
  if (stripeTest.currency && currency && currency !== stripeTest.currency.toUpperCase()) {
    return { ok: false, error: "Paid currency mismatch.", plan, stripeTest };
  }

  const obligationId =
    meta[LIFECYCLE_STRIPE_METADATA.obligationId] || stripeTest.obligationId;
  if (!obligationId) {
    return { ok: false, error: "Missing obligation id on paid event.", plan, stripeTest };
  }

  const obligation = plan.obligations.find((o) => o.id === obligationId);
  if (!obligation) {
    return { ok: false, error: "Unknown obligation for paid event.", plan, stripeTest };
  }

  let nextPlan = plan;
  if (obligation.status !== "paid") {
    assertObligationTransition(obligation.status, "paid");
    const now = new Date().toISOString();
    nextPlan = {
      ...plan,
      updatedAt: now,
      obligations: plan.obligations.map((o) =>
        o.id === obligationId ? { ...o, status: "paid" as const, paidAt: now } : o,
      ),
    };
  }

  const alreadyEligible = stripeTest.eligibilitySource === "stripe-test-payment";
  const now = new Date().toISOString();
  const nextStripe: LifecycleStripeTestState = {
    ...stripeTest,
    invoiceStatus: "paid",
    paidAt: stripeTest.paidAt ?? now,
    processedEventIds: [...processed, event.id],
    eligibilitySource: "stripe-test-payment",
    lastError: null,
    paymentIntentId:
      typeof obj.payment_intent === "string"
        ? obj.payment_intent
        : obj.payment_intent && typeof obj.payment_intent === "object"
          ? obj.payment_intent.id ?? stripeTest.paymentIntentId
          : stripeTest.paymentIntentId,
  };

  return {
    ok: true,
    duplicate: alreadyEligible && obligation.status === "paid",
    plan: nextPlan,
    stripeTest: nextStripe,
    onboardingEligible: true,
  };
}
