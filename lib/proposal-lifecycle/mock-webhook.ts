/**
 * Mock/test webhook processing for lifecycle billing.
 * Fail closed on livemode mismatches. Never activates live billing or onboarding work.
 */

import { assertObligationTransition } from "./transitions.ts";
import type { ProposedBillingPlan } from "./types.ts";

export type MockWebhookEventType =
  | "invoice.paid"
  | "invoice.payment_failed"
  | "invoice.voided"
  | "customer.subscription.updated";

export interface MockWebhookEvent {
  id: string;
  type: MockWebhookEventType;
  livemode: boolean;
  contractId: number;
  obligationId?: string;
  amountCents?: number;
  currency?: string;
  clientId?: number;
  receivedAt: string;
}

export interface MockWebhookResult {
  ok: boolean;
  duplicate?: boolean;
  error?: string;
  plan?: ProposedBillingPlan;
  processedEventIds: string[];
}

export function assertMockEnvironment(event: MockWebhookEvent): void {
  // Fail closed unless livemode is explicitly false.
  if (event.livemode !== false) {
    throw new Error("Rejecting event without explicit livemode=false in mock processor.");
  }
  if (!event.id?.startsWith("evt_mock_") && !event.id?.startsWith("evt_test_")) {
    throw new Error("Mock webhook event IDs must use evt_mock_ or evt_test_ prefix.");
  }
  // Real-looking Stripe IDs must never enter this processor.
  if (event.id.startsWith("evt_") && !event.id.startsWith("evt_mock_") && !event.id.startsWith("evt_test_")) {
    throw new Error("Rejecting non-mock Stripe-style event id.");
  }
}

export function processMockWebhookEvent(input: {
  event: MockWebhookEvent;
  plan: ProposedBillingPlan;
  processedEventIds: string[];
  expectedContractId: number;
  expectedClientId?: number | null;
}): MockWebhookResult {
  const { event, plan, processedEventIds, expectedContractId, expectedClientId } = input;

  try {
    assertMockEnvironment(event);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Invalid mock event",
      processedEventIds,
    };
  }

  if (processedEventIds.includes(event.id)) {
    return { ok: true, duplicate: true, plan, processedEventIds };
  }

  if (event.contractId !== expectedContractId) {
    return {
      ok: false,
      error: "Webhook contractId does not match billing plan contract.",
      processedEventIds,
    };
  }

  if (
    expectedClientId != null &&
    event.clientId != null &&
    event.clientId !== expectedClientId
  ) {
    return {
      ok: false,
      error: "Webhook clientId does not match contract client.",
      processedEventIds,
    };
  }

  if (event.type === "invoice.paid") {
    const obligation = plan.obligations.find((o) => o.id === event.obligationId);
    if (!obligation) {
      return { ok: false, error: "Unknown obligation for payment event.", processedEventIds };
    }
    if (event.amountCents != null && event.amountCents !== obligation.amountCents) {
      return {
        ok: false,
        error: `Amount mismatch: event ${event.amountCents}¢ vs obligation ${obligation.amountCents}¢.`,
        processedEventIds,
      };
    }
    if (event.currency && event.currency !== obligation.currency) {
      return { ok: false, error: "Currency mismatch on payment event.", processedEventIds };
    }
    if (obligation.status === "paid") {
      return {
        ok: true,
        duplicate: true,
        plan,
        processedEventIds: [...processedEventIds, event.id],
      };
    }
    assertObligationTransition(obligation.status, "paid");
    const next: ProposedBillingPlan = {
      ...plan,
      updatedAt: new Date().toISOString(),
      obligations: plan.obligations.map((o) =>
        o.id === obligation.id
          ? { ...o, status: "paid" as const, paidAt: event.receivedAt }
          : o,
      ),
    };
    return {
      ok: true,
      plan: next,
      processedEventIds: [...processedEventIds, event.id],
    };
  }

  if (event.type === "invoice.payment_failed") {
    return {
      ok: true,
      plan,
      processedEventIds: [...processedEventIds, event.id],
    };
  }

  if (event.type === "invoice.voided") {
    const obligation = plan.obligations.find((o) => o.id === event.obligationId);
    if (obligation && obligation.status !== "paid") {
      assertObligationTransition(obligation.status, "void");
      const next: ProposedBillingPlan = {
        ...plan,
        updatedAt: new Date().toISOString(),
        obligations: plan.obligations.map((o) =>
          o.id === obligation.id ? { ...o, status: "void" as const } : o,
        ),
      };
      return {
        ok: true,
        plan: next,
        processedEventIds: [...processedEventIds, event.id],
      };
    }
  }

  return {
    ok: true,
    plan,
    processedEventIds: [...processedEventIds, event.id],
  };
}
