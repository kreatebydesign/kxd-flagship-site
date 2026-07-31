/**
 * Fully mocked Stripe billing adapter for local lifecycle QA.
 * Never contacts live Stripe. Deterministic IDs from contract/obligation keys.
 */

import { createHash } from "crypto";
import type { ProposedBillingPlan } from "./types.ts";
import { attachMockStripeDrafts } from "./billing-plan.ts";

export type MockStripeDraftBundle = {
  customerId: string;
  draftInvoiceIds: string[];
  inactiveScheduleId: string | null;
  livemode: false;
  mode: "mock";
};

function mockId(kind: string, seed: string): string {
  const h = createHash("sha256").update(`${kind}:${seed}`).digest("hex").slice(0, 14);
  return `${kind}_mock_${h}`;
}

export function prepareMockStripeDrafts(
  plan: ProposedBillingPlan,
  options?: { allowWhileBlockedForLocalMock?: boolean },
): {
  plan: ProposedBillingPlan;
  bundle: MockStripeDraftBundle;
} {
  const allowBlocked = Boolean(options?.allowWhileBlockedForLocalMock);
  if (plan.reconciliation.differenceCents !== 0) {
    throw new Error("Cannot prepare Stripe drafts while reconciliation difference is non-zero.");
  }
  if (plan.status === "blocked" && !allowBlocked) {
    throw new Error("Cannot prepare Stripe drafts while billing plan is blocked.");
  }

  const customerId = mockId("cus", `contract:${plan.contractId}`);
  const draftInvoiceIds = plan.obligations.map((o) =>
    mockId("in", `${plan.contractId}:${plan.contractVersion}:${o.id}:draft`),
  );
  const inactiveScheduleId = plan.recurring
    ? mockId("sub_sched", `${plan.contractId}:${plan.contractVersion}:recurring`)
    : null;

  const bundle: MockStripeDraftBundle = {
    customerId,
    draftInvoiceIds,
    inactiveScheduleId,
    livemode: false,
    mode: "mock",
  };

  const next = attachMockStripeDrafts(plan, {
    customerId,
    invoiceIds: draftInvoiceIds,
    scheduleId: inactiveScheduleId,
  });

  return {
    bundle,
    // Keep blocked status when readiness blockers remain — mock IDs are review-only.
    plan: allowBlocked && plan.status === "blocked" ? { ...next, status: "blocked" } : next,
  };
}

/** Simulated verified payment webhook — local QA only. */
export function applyMockInvoicePaid(
  plan: ProposedBillingPlan,
  obligationId: string,
): ProposedBillingPlan {
  const now = new Date().toISOString();
  return {
    ...plan,
    updatedAt: now,
    obligations: plan.obligations.map((o) =>
      o.id === obligationId
        ? { ...o, status: "paid", paidAt: now }
        : o,
    ),
  };
}
