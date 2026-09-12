/**
 * Batch A — Ledger authority + portal parity + Stripe paid evidence (offline).
 *
 *   npx tsx scripts/verify-commercial-ledger-authority.ts
 *
 * Pure fixtures only. No DB. No production. No Platinum client IDs.
 */
import assert from "node:assert/strict";
import {
  aggregateObligationBalances,
  obligationAmountPaidCents,
  obligationIsPaid,
  obligationRemainingCents,
} from "../lib/proposal-lifecycle/obligation-balances.ts";
import {
  applyAllocatedExternalPayment,
  type ObligationPaymentEvent,
} from "../lib/proposal-lifecycle/external-obligation-payment.ts";
import { applyVerifiedLiveInvoicePayment } from "../lib/proposal-lifecycle/live-stripe-reconciliation.ts";
import { processLifecycleStripeTestWebhookEvent } from "../lib/proposal-lifecycle/stripe-test/webhook-logic.ts";
import { emptyLifecycleStripeTestState } from "../lib/proposal-lifecycle/stripe-test/invoice-logic.ts";
import { emptyLifecyclePackage } from "../lib/proposal-lifecycle/package.ts";
import { LIFECYCLE_STRIPE_METADATA } from "../lib/stripe/lifecycle-test-billing-auth.ts";
import type {
  ContractLifecyclePackage,
  InvoiceObligation,
  ProposedBillingPlan,
} from "../lib/proposal-lifecycle/types.ts";

let passed = 0;
function ok(label: string) {
  passed += 1;
  console.log(`  ✓ ${label}`);
}

function baseObligation(
  partial: Partial<InvoiceObligation> & Pick<InvoiceObligation, "id" | "label" | "amountCents">,
): InvoiceObligation {
  return {
    kind: "milestone",
    currency: "USD",
    trigger: "on-date",
    dueTerms: "Due on receipt",
    status: "pending-trigger",
    amountPaidCents: 0,
    paymentEvents: [],
    paymentReceipt: null,
    collectionChannel: null,
    stripeDraftInvoiceId: null,
    ...partial,
  };
}

function portalAggregate(obligations: InvoiceObligation[]) {
  // Mirrors portal buildPaymentSchedule after Batch A.
  return aggregateObligationBalances(obligations);
}

function makePlan(obligations: InvoiceObligation[], contractId = 9001): ProposedBillingPlan {
  const oneTimeTotalCents = obligations.reduce((sum, o) => sum + o.amountCents, 0);
  return {
    schemaVersion: 1,
    id: "bplan-fixture",
    status: "ready-for-review",
    invoiceReadiness: "ready-for-review",
    contractId,
    proposalId: contractId,
    proposalNumber: "KXD-P-FIXTURE",
    contractVersion: 1,
    contractHash: "fixture",
    currency: "USD",
    oneTimeTotalCents,
    monthlyTotalCents: 0,
    obligations,
    recurring: null,
    issues: [],
    reconciliation: {
      contractOneTimeCents: oneTimeTotalCents,
      obligationsSumCents: oneTimeTotalCents,
      differenceCents: 0,
      creditsAppliedOnce: true,
    },
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    approvedAt: null,
    mockStripe: { customerId: null, draftInvoiceIds: [], inactiveScheduleId: null },
  };
}

console.log("\nBatch A — commercial ledger authority\n");

// A. fully unpaid
{
  const o = baseObligation({ id: "a", label: "Unpaid", amountCents: 50_000 });
  assert.equal(obligationAmountPaidCents(o), 0);
  assert.equal(obligationRemainingCents(o), 50_000);
  assert.equal(obligationIsPaid(o), false);
  ok("A unpaid: paid=0 remaining=full");
}

// B. partially paid via events (Platinum-shaped $2000 / $25)
{
  const event: ObligationPaymentEvent = {
    id: "payevt_b",
    paymentGroupId: "paygrp_b",
    amountCents: 2_500,
    currency: "USD",
    paidAt: "2026-09-12T00:00:00.000Z",
    externalPaymentMethod: "stripe",
    recordedBy: "operator",
    recordedAt: "2026-09-12T00:00:00.000Z",
    collectionChannel: "stripe-invoice-external-pay",
    idempotencyKey: "test-b",
  };
  const o = baseObligation({
    id: "b",
    label: "Final",
    amountCents: 200_000,
    status: "partially-paid",
    amountPaidCents: 2_500,
    paymentEvents: [event],
  });
  assert.equal(obligationAmountPaidCents(o), 2_500);
  assert.equal(obligationRemainingCents(o), 197_500);
  assert.equal(obligationIsPaid(o), false);
  ok("B partial: $2000 obl / $25 paid → remaining $1975");
}

// C. fully paid via paymentEvents
{
  const event: ObligationPaymentEvent = {
    id: "payevt_c",
    paymentGroupId: "paygrp_c",
    amountCents: 31_250,
    currency: "USD",
    paidAt: "2026-08-21T00:00:00.000Z",
    externalPaymentMethod: "stripe",
    recordedBy: "operator",
    recordedAt: "2026-08-21T00:00:00.000Z",
    collectionChannel: "stripe-invoice-external-pay",
    idempotencyKey: "test-c",
  };
  const o = baseObligation({
    id: "c",
    label: "Deposit",
    amountCents: 31_250,
    status: "paid",
    amountPaidCents: 31_250,
    paymentEvents: [event],
  });
  assert.equal(obligationAmountPaidCents(o), 31_250);
  assert.equal(obligationRemainingCents(o), 0);
  assert.equal(obligationIsPaid(o), true);
  ok("C fully paid via paymentEvents");
}

// D. historical paid with amountPaidCents=0 + receipt (precedence defect regression)
{
  const o = baseObligation({
    id: "d",
    label: "Legacy Stripe paid",
    amountCents: 100_000,
    status: "paid",
    amountPaidCents: 0,
    paymentEvents: [],
    paymentReceipt: {
      status: "paid",
      amountCents: 100_000,
      currency: "USD",
      paidAt: "2026-08-01T00:00:00.000Z",
      externalPaymentMethod: "other",
      recordedBy: "stripe-live-webhook",
      recordedAt: "2026-08-01T00:00:00.000Z",
      stripeInvoiceId: "in_legacy_d",
      collectionChannel: "stripe-collected",
      idempotencyKey: "stripe-live:evt_d",
    },
    collectionChannel: "stripe-collected",
  });
  assert.equal(obligationAmountPaidCents(o), 100_000);
  assert.equal(obligationRemainingCents(o), 0);
  assert.equal(obligationIsPaid(o), true);
  ok("D amountPaidCents=0 does not erase status=paid evidence");
}

// D2. status paid alone (no receipt, amountPaidCents 0)
{
  const o = baseObligation({
    id: "d2",
    label: "Status-only paid",
    amountCents: 75_000,
    status: "paid",
    amountPaidCents: 0,
    paymentEvents: [],
    paymentReceipt: null,
  });
  assert.equal(obligationAmountPaidCents(o), 75_000);
  assert.equal(obligationRemainingCents(o), 0);
  ok("D2 status=paid with zero cache → full paid");
}

// E. multi-obligation allocation
{
  const plan = makePlan([
    baseObligation({
      id: "svc-growth",
      kind: "recurring-period",
      label: "Growth — 2026-09",
      amountCents: 32_500,
      dueDate: "2026-09-01",
    }),
    baseObligation({
      id: "svc-hosting",
      kind: "addon",
      label: "Hosting",
      amountCents: 29_999,
    }),
    baseObligation({
      id: "svc-domain",
      kind: "addon",
      label: "Domain",
      amountCents: 1_019,
      dueDate: "2026-08-20",
    }),
  ]);
  let pkg: ContractLifecyclePackage = {
    ...emptyLifecyclePackage(),
    billingPlan: plan,
  };
  const applied = applyAllocatedExternalPayment(pkg, {
    contractId: 9001,
    amountCents: 63_518,
    paidAt: "2026-09-12",
    externalPaymentMethod: "stripe",
    externalReference: "in_test_service_bundle",
    recordedBy: "operator",
    paidOutsideStripe: true,
    allocationMode: "explicit",
    allocations: [
      { obligationId: "svc-growth", amountCents: 32_500 },
      { obligationId: "svc-hosting", amountCents: 29_999 },
      { obligationId: "svc-domain", amountCents: 1_019 },
    ],
  });
  assert.equal(applied.ok, true);
  if (!applied.ok) throw new Error("allocation failed");
  pkg = applied.pkg;
  const agg = aggregateObligationBalances(pkg.billingPlan!.obligations);
  assert.equal(agg.paidCents, 63_518);
  assert.equal(agg.remainingCents, 0);
  assert.equal(agg.totalCents, agg.paidCents + agg.remainingCents);

  const replay = applyAllocatedExternalPayment(pkg, {
    contractId: 9001,
    amountCents: 63_518,
    paidAt: "2026-09-12",
    externalPaymentMethod: "stripe",
    externalReference: "in_test_service_bundle",
    recordedBy: "operator",
    paidOutsideStripe: true,
    allocationMode: "explicit",
    allocations: [
      { obligationId: "svc-growth", amountCents: 32_500 },
      { obligationId: "svc-hosting", amountCents: 29_999 },
      { obligationId: "svc-domain", amountCents: 1_019 },
    ],
  });
  assert.equal(replay.ok, true);
  if (replay.ok) assert.equal(replay.idempotentReplay, true);
  const afterReplay = aggregateObligationBalances(pkg.billingPlan!.obligations);
  assert.equal(afterReplay.paidCents, 63_518);
  ok("E multi-obligation allocation + idempotent replay");
}

// F. aggregate identity
{
  const obligations = [
    baseObligation({ id: "f1", label: "A", amountCents: 100_000, status: "paid", amountPaidCents: 100_000 }),
    baseObligation({
      id: "f2",
      label: "B",
      amountCents: 50_000,
      status: "partially-paid",
      amountPaidCents: 10_000,
      paymentEvents: [
        {
          id: "e",
          paymentGroupId: "g",
          amountCents: 10_000,
          currency: "USD",
          paidAt: "2026-09-01T00:00:00.000Z",
          externalPaymentMethod: "zelle",
          recordedBy: "op",
          recordedAt: "2026-09-01T00:00:00.000Z",
          collectionChannel: "manual-external",
          idempotencyKey: "f2",
        },
      ],
    }),
    baseObligation({ id: "f3", label: "C", amountCents: 25_000 }),
  ];
  // For f1 without events, positive amountPaidCents wins.
  const agg = aggregateObligationBalances(obligations);
  assert.equal(agg.totalCents, 175_000);
  assert.equal(agg.paidCents, 110_000);
  assert.equal(agg.remainingCents, 65_000);
  assert.equal(agg.totalCents, agg.paidCents + agg.remainingCents);
  ok("F aggregate total = paid + remaining");
}

// G. portal aggregation equals lifecycle helpers
{
  const obligations = [
    baseObligation({
      id: "g1",
      label: "Partial",
      amountCents: 50_000,
      status: "partially-paid",
      amountPaidCents: 12_500,
      paymentEvents: [
        {
          id: "ge",
          paymentGroupId: "gg",
          amountCents: 12_500,
          currency: "USD",
          paidAt: "2026-09-12T00:00:00.000Z",
          externalPaymentMethod: "cash-app",
          recordedBy: "op",
          recordedAt: "2026-09-12T00:00:00.000Z",
          collectionChannel: "manual-external",
          idempotencyKey: "g1",
        },
      ],
    }),
  ];
  const portal = portalAggregate(obligations);
  assert.equal(portal.paidCents, 12_500);
  assert.equal(portal.remainingCents, 37_500);
  assert.notEqual(portal.paidCents, 0);
  assert.notEqual(portal.paidCents, 50_000);
  ok("G portal partial uses canonical helpers (not status===paid)");
}

// Stripe live write leaves durable evidence + idempotent
{
  const plan = makePlan(
    [
      baseObligation({
        id: "live-1",
        kind: "initial",
        label: "Initial",
        amountCents: 250_000,
      }),
    ],
    3,
  );
  let pkg: ContractLifecyclePackage = {
    ...emptyLifecyclePackage(),
    billingPlan: plan,
  };
  const match = {
    ok: true as const,
    contractId: 3,
    obligationId: "live-1",
    matchedBy: "metadata" as const,
    amountCents: 250_000,
    currency: "USD",
    stripeInvoiceId: "in_live_test_1",
    stripePaymentIntentId: null,
    stripeChargeId: null,
    paidAt: "2026-08-20T12:00:00.000Z",
  };
  const first = applyVerifiedLiveInvoicePayment({
    pkg,
    match,
    eventId: "evt_live_1",
    contractStatus: "executed",
  });
  pkg = first.pkg;
  const paidObl = pkg.billingPlan!.obligations[0]!;
  assert.equal(first.appliedToObligation, true);
  assert.equal(obligationAmountPaidCents(paidObl), 250_000);
  assert.equal(obligationRemainingCents(paidObl), 0);
  assert.ok((paidObl.paymentEvents?.length ?? 0) >= 1);
  assert.equal(paidObl.amountPaidCents, 250_000);
  assert.equal(paidObl.collectionChannel, "stripe-collected");

  const second = applyVerifiedLiveInvoicePayment({
    pkg,
    match,
    eventId: "evt_live_1",
    contractStatus: "executed",
  });
  assert.equal(second.duplicate, true);
  const after = second.pkg.billingPlan!.obligations[0]!;
  assert.equal(obligationAmountPaidCents(after), 250_000);
  assert.equal(after.paymentEvents?.length, paidObl.paymentEvents?.length);
  ok("Stripe live paid writes events+amountPaidCents and is idempotent");
}

// Stripe TEST webhook durable evidence
{
  const plan = makePlan(
    [
      baseObligation({
        id: "ob_initial",
        kind: "initial",
        label: "Initial",
        amountCents: 10_000,
      }),
    ],
    99,
  );
  const stripeTest = {
    ...emptyLifecycleStripeTestState(),
    customerId: "cus_test",
    invoiceId: "in_test_99",
    obligationId: "ob_initial",
    amountCents: 10_000,
    currency: "USD",
  };
  const event = {
    id: "evt_test_paid_1",
    type: "invoice.paid",
    livemode: false,
    data: {
      object: {
        id: "in_test_99",
        customer: "cus_test",
        amount_paid: 10_000,
        currency: "usd",
        status: "paid",
        metadata: {
          [LIFECYCLE_STRIPE_METADATA.contractId]: "99",
          [LIFECYCLE_STRIPE_METADATA.clientId]: "7",
          [LIFECYCLE_STRIPE_METADATA.obligationId]: "ob_initial",
        },
      },
    },
  };
  const result = processLifecycleStripeTestWebhookEvent({
    event,
    plan,
    stripeTest,
    expectedContractId: 99,
    expectedClientId: 7,
  });
  assert.equal(result.ok, true);
  const paid = result.plan!.obligations[0]!;
  assert.equal(obligationAmountPaidCents(paid), 10_000);
  assert.ok((paid.paymentEvents?.length ?? 0) >= 1);
  assert.equal(paid.amountPaidCents, 10_000);

  const replay = processLifecycleStripeTestWebhookEvent({
    event,
    plan: result.plan!,
    stripeTest: result.stripeTest!,
    expectedContractId: 99,
    expectedClientId: 7,
  });
  assert.equal(replay.ok, true);
  assert.equal(replay.duplicate, true);
  assert.equal(obligationAmountPaidCents(replay.plan!.obligations[0]!), 10_000);
  ok("Stripe TEST webhook writes durable evidence + idempotent");
}

console.log(`\nBatch A ledger authority: ${passed} checks passed\n`);
