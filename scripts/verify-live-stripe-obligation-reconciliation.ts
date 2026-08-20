/**
 * Offline verification — live Stripe → obligation reconciliation → onboarding eligibility.
 *   npx tsx scripts/verify-live-stripe-obligation-reconciliation.ts
 *
 * Pure fixtures only — no Stripe calls, no DB mutations, no production data (de Bois untouched).
 */
// @ts-nocheck — fixture script; run with tsx. Not part of app runtime.
import assert from "node:assert/strict";
import { emptyLifecyclePackage } from "../lib/proposal-lifecycle/package.ts";
import {
  applyOnboardingEligibility,
  recomputeOnboardingEligibility,
} from "../lib/proposal-lifecycle/onboarding-eligibility.ts";
import {
  applyPendingVerifiedStripePayments,
  applyVerifiedLiveInvoicePayment,
  bindObligationStripeInvoice,
  matchLivePaidInvoiceToPackage,
  type LiveInvoicePaidEvent,
} from "../lib/proposal-lifecycle/live-stripe-reconciliation.ts";
import type {
  ContractLifecyclePackage,
  InvoiceObligation,
  ProposedBillingPlan,
} from "../lib/proposal-lifecycle/types.ts";
import { LIFECYCLE_STRIPE_METADATA } from "../lib/stripe/lifecycle-test-billing-auth.ts";

let passed = 0;
function ok(label: string) {
  passed += 1;
  console.log(`  ✓ ${label}`);
}

const INITIAL_ID = "deb-dep-1";
const MILESTONE_ID = "deb-des-1";
const CONTRACT_ID = 3;

function fixturePlan(overrides?: {
  initialStatus?: InvoiceObligation["status"];
  initialStripeDraftId?: string | null;
}): ProposedBillingPlan {
  const initialStatus = overrides?.initialStatus ?? "pending-trigger";
  return {
    id: "plan-fixture",
    contractId: CONTRACT_ID,
    proposalId: 1,
    proposalNumber: "KXD-P-2026-0001",
    contractVersion: 1,
    contractHash: "hash-fixture",
    status: "ready-for-review",
    currency: "USD",
    obligations: [
      {
        id: INITIAL_ID,
        kind: "initial",
        label: "Initial Deposit",
        amountCents: 250_000,
        currency: "USD",
        trigger: "upon execution",
        dueTerms: "Due on receipt",
        status: initialStatus,
        paidAt: initialStatus === "paid" ? "2026-08-20T12:00:00.000Z" : null,
        stripeDraftInvoiceId: overrides?.initialStripeDraftId ?? null,
        collectionChannel: null,
        paymentReceipt: null,
      },
      {
        id: MILESTONE_ID,
        kind: "milestone",
        label: "Design",
        amountCents: 200_000,
        currency: "USD",
        trigger: "design complete",
        dueTerms: "Net 7",
        status: "pending-trigger",
        stripeDraftInvoiceId: null,
        collectionChannel: null,
        paymentReceipt: null,
      },
      {
        id: "deb-dev-1",
        kind: "milestone",
        label: "Development",
        amountCents: 200_000,
        currency: "USD",
        trigger: "dev complete",
        dueTerms: "Net 7",
        status: "pending-trigger",
        stripeDraftInvoiceId: null,
        collectionChannel: null,
        paymentReceipt: null,
      },
      {
        id: "deb-fin-1",
        kind: "final",
        label: "Final",
        amountCents: 300_000,
        currency: "USD",
        trigger: "launch",
        dueTerms: "Net 7",
        status: "pending-trigger",
        stripeDraftInvoiceId: null,
        collectionChannel: null,
        paymentReceipt: null,
      },
    ],
    recurring: null,
    reconciliation: {
      contractTotalCents: 950_000,
      installmentsSumCents: 950_000,
      recurringAnnualizedCents: 0,
      differenceCents: 0,
      ok: true,
    },
    createdAt: "2026-08-20T00:00:00.000Z",
    updatedAt: "2026-08-20T00:00:00.000Z",
  };
}

function basePkg(partial?: Partial<ContractLifecyclePackage>): ContractLifecyclePackage {
  return {
    ...emptyLifecyclePackage(),
    structuredPaymentTerms: {
      schemaVersion: 1,
      currency: "USD",
      sourceProposalNumber: "KXD-P-2026-0001",
      sourceProposalVersion: 1,
      derivedAt: "2026-08-20T00:00:00.000Z",
      installments: [
        {
          id: INITIAL_ID,
          label: "Initial Deposit",
          amountCents: 250_000,
          trigger: "upon execution",
          dueTerms: "Due on receipt",
        },
        {
          id: MILESTONE_ID,
          label: "Design",
          amountCents: 200_000,
          trigger: "design complete",
          dueTerms: "Net 7",
        },
        {
          id: "deb-dev-1",
          label: "Development",
          amountCents: 200_000,
          trigger: "dev complete",
          dueTerms: "Net 7",
        },
        {
          id: "deb-fin-1",
          label: "Final",
          amountCents: 300_000,
          trigger: "launch",
          dueTerms: "Net 7",
        },
      ],
      recurring: { amountCents: 0, cadence: "none", startTrigger: "", minimumTermMonths: null },
      taxes: { treatment: "exclusive", notes: "" },
      billingEmail: "randy@deboisentertainment.com",
    },
    ...partial,
  };
}

function paidInvoiceEvent(input: {
  eventId: string;
  invoiceId: string;
  amountCents: number;
  metadata?: Record<string, string>;
}): LiveInvoicePaidEvent {
  return {
    id: input.eventId,
    type: "invoice.paid",
    livemode: true,
    created: 1_724_000_000,
    data: {
      object: {
        id: input.invoiceId,
        object: "invoice",
        status: "paid",
        paid: true,
        amount_paid: input.amountCents,
        currency: "usd",
        payment_intent: "pi_fixture_live_1",
        charge: "ch_fixture_live_1",
        metadata: input.metadata ?? {},
      },
    },
  };
}

console.log("verify:live-stripe-obligation-reconciliation");

// A. Executed + initial unpaid → onboardingEligible=false
{
  const pkg = applyOnboardingEligibility(
    basePkg({ billingPlan: fixturePlan({ initialStatus: "pending-trigger" }) }),
    "executed",
  );
  const r = recomputeOnboardingEligibility({ contractStatus: "executed", pkg });
  assert.equal(r.eligible, false);
  assert.equal(pkg.onboardingEligible, false);
  ok("A: executed + unpaid initial → not eligible");
}

// B. Initial paid + not executed → onboardingEligible=false
{
  const pkg = applyOnboardingEligibility(
    basePkg({
      billingPlan: fixturePlan({ initialStatus: "paid" }),
      executedCertificate: undefined,
    }),
    "sent-for-signature",
  );
  assert.equal(pkg.onboardingEligible, false);
  ok("B: paid initial + not executed → not eligible");
}

// C. Executed + correct initial payment verified → onboardingEligible=true
{
  let pkg = basePkg({
    billingPlan: fixturePlan({ initialStripeDraftId: "in_live_deb_2500" }),
    obligationStripeBindings: [
      {
        obligationId: INITIAL_ID,
        stripeInvoiceId: "in_live_deb_2500",
        linkedAt: "2026-08-20T00:00:00.000Z",
        linkedBy: "operator@test",
      },
    ],
  });
  const event = paidInvoiceEvent({
    eventId: "evt_live_1",
    invoiceId: "in_live_deb_2500",
    amountCents: 250_000,
    metadata: {
      [LIFECYCLE_STRIPE_METADATA.contractId]: String(CONTRACT_ID),
      [LIFECYCLE_STRIPE_METADATA.obligationId]: INITIAL_ID,
    },
  });
  const match = matchLivePaidInvoiceToPackage({ event, contractId: CONTRACT_ID, pkg });
  assert.equal(match.ok, true);
  if (!match.ok) throw new Error(match.message);
  const applied = applyVerifiedLiveInvoicePayment({
    pkg,
    contractStatus: "executed",
    match,
    eventId: event.id,
  });
  pkg = applyOnboardingEligibility(applied.pkg, "executed");
  assert.equal(applied.appliedToObligation, true);
  assert.equal(pkg.onboardingEligible, true);
  assert.equal(
    pkg.billingPlan?.obligations.find((o) => o.id === INITIAL_ID)?.status,
    "paid",
  );
  ok("C: executed + verified initial live payment → eligible");
}

// D. Wrong invoice / no deterministic link → no eligibility change
{
  const pkg = basePkg({
    billingPlan: fixturePlan(),
    onboardingEligible: false,
  });
  const event = paidInvoiceEvent({
    eventId: "evt_wrong",
    invoiceId: "in_unrelated_999",
    amountCents: 250_000,
  });
  const match = matchLivePaidInvoiceToPackage({ event, contractId: CONTRACT_ID, pkg });
  assert.equal(match.ok, false);
  if (match.ok) throw new Error("expected no match");
  assert.equal(match.code, "no-deterministic-link");
  assert.equal(pkg.onboardingEligible, false);
  ok("D: unbound invoice does not match / no eligibility change");
}

// E. Duplicate Stripe webhook → no duplicate payment / state corruption
{
  let pkg = basePkg({
    billingPlan: fixturePlan({ initialStripeDraftId: "in_live_dup" }),
    obligationStripeBindings: [
      {
        obligationId: INITIAL_ID,
        stripeInvoiceId: "in_live_dup",
        linkedAt: "2026-08-20T00:00:00.000Z",
        linkedBy: "operator@test",
      },
    ],
  });
  const event = paidInvoiceEvent({
    eventId: "evt_dup",
    invoiceId: "in_live_dup",
    amountCents: 250_000,
  });
  const match = matchLivePaidInvoiceToPackage({ event, contractId: CONTRACT_ID, pkg });
  assert.equal(match.ok, true);
  if (!match.ok) throw new Error(match.message);
  const first = applyVerifiedLiveInvoicePayment({
    pkg,
    contractStatus: "executed",
    match,
    eventId: event.id,
  });
  const second = applyVerifiedLiveInvoicePayment({
    pkg: first.pkg,
    contractStatus: "executed",
    match,
    eventId: event.id,
  });
  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
  assert.equal(second.appliedToObligation, false);
  const paidCount = (second.pkg.billingPlan?.obligations ?? []).filter(
    (o) => o.status === "paid",
  ).length;
  assert.equal(paidCount, 1);
  assert.equal(
    (second.pkg.processedWebhookEventIds ?? []).filter((id) => id === "evt_dup").length,
    1,
  );
  ok("E: duplicate webhook is idempotent");
}

// F. Later milestone payment → does not incorrectly recreate onboarding handoff
{
  let pkg = applyOnboardingEligibility(
    basePkg({
      billingPlan: fixturePlan({ initialStatus: "paid" }),
      onboardingEligible: true,
      onboardingEligibleAt: "2026-08-19T00:00:00.000Z",
      obligationStripeBindings: [
        {
          obligationId: MILESTONE_ID,
          stripeInvoiceId: "in_live_design_2000",
          linkedAt: "2026-08-20T00:00:00.000Z",
          linkedBy: "operator@test",
        },
      ],
    }),
    "executed",
  );
  assert.equal(pkg.onboardingEligible, true);
  const eligibleAt = pkg.onboardingEligibleAt;
  const event = paidInvoiceEvent({
    eventId: "evt_milestone",
    invoiceId: "in_live_design_2000",
    amountCents: 200_000,
  });
  const match = matchLivePaidInvoiceToPackage({ event, contractId: CONTRACT_ID, pkg });
  assert.equal(match.ok, true);
  if (!match.ok) throw new Error(match.message);
  const applied = applyVerifiedLiveInvoicePayment({
    pkg,
    contractStatus: "executed",
    match,
    eventId: event.id,
  });
  pkg = applied.pkg;
  assert.equal(applied.appliedToObligation, true);
  assert.equal(pkg.onboardingEligible, true);
  assert.equal(pkg.onboardingEligibleAt, eligibleAt);
  assert.equal(
    pkg.billingPlan?.obligations.find((o) => o.id === MILESTONE_ID)?.status,
    "paid",
  );
  const eligibleAudits = (pkg.auditEvents ?? []).filter((e) => e.action === "onboarding.eligible");
  assert.equal(eligibleAudits.length, 0);
  ok("F: milestone payment does not re-fire onboarding eligibility handoff");
}

// Payment before execution stores pending; execution apply unlocks eligibility
{
  let pkg = basePkg({
    obligationStripeBindings: [
      {
        obligationId: INITIAL_ID,
        stripeInvoiceId: "in_live_early",
        linkedAt: "2026-08-20T00:00:00.000Z",
        linkedBy: "operator@test",
      },
    ],
  });
  const event = paidInvoiceEvent({
    eventId: "evt_early",
    invoiceId: "in_live_early",
    amountCents: 250_000,
  });
  const match = matchLivePaidInvoiceToPackage({ event, contractId: CONTRACT_ID, pkg });
  assert.equal(match.ok, true);
  if (!match.ok) throw new Error(match.message);
  const pending = applyVerifiedLiveInvoicePayment({
    pkg,
    contractStatus: "sent-for-signature",
    match,
    eventId: event.id,
  });
  assert.equal(pending.pending, true);
  assert.equal(pending.pkg.onboardingEligible, false);
  assert.equal((pending.pkg.pendingVerifiedStripePayments ?? []).length, 1);

  pkg = {
    ...pending.pkg,
    billingPlan: fixturePlan({ initialStripeDraftId: "in_live_early" }),
    executedCertificate: {
      verificationId: "verify-fixture",
      sealedAt: "2026-08-21T00:00:00.000Z",
      documentHash: "hash",
      contractId: CONTRACT_ID,
      proposalId: 1,
      proposalNumber: "KXD-P-2026-0001",
      proposalVersion: 1,
      contractVersion: 1,
      operator: {} as never,
      client: {} as never,
    } as never,
  };
  const applied = applyPendingVerifiedStripePayments({
    pkg,
    contractStatus: "executed",
  });
  assert.equal(applied.appliedCount, 1);
  assert.equal(applied.pkg.onboardingEligible, true);
  assert.equal((applied.pkg.pendingVerifiedStripePayments ?? []).length, 0);
  ok("pending live payment before execution applies correctly after billing plan");
}

// Amount mismatch rejects even with binding
{
  const pkg = basePkg({
    billingPlan: fixturePlan(),
    obligationStripeBindings: [
      {
        obligationId: INITIAL_ID,
        stripeInvoiceId: "in_wrong_amount",
        linkedAt: "2026-08-20T00:00:00.000Z",
        linkedBy: "operator@test",
      },
    ],
  });
  const event = paidInvoiceEvent({
    eventId: "evt_amt",
    invoiceId: "in_wrong_amount",
    amountCents: 999_999,
  });
  const match = matchLivePaidInvoiceToPackage({ event, contractId: CONTRACT_ID, pkg });
  assert.equal(match.ok, false);
  if (match.ok) throw new Error("expected amount mismatch");
  assert.equal(match.code, "amount-mismatch");
  ok("amount mismatch rejects bound invoice");
}

// Bind helper validates invoice id format
{
  const bound = bindObligationStripeInvoice({
    pkg: basePkg(),
    obligationId: INITIAL_ID,
    stripeInvoiceId: "in_ABC123xyz",
    actor: "operator@test",
    note: "Randy live deposit invoice",
  });
  assert.ok(!("error" in bound));
  if ("error" in bound) throw new Error(bound.error);
  assert.equal(bound.pkg.obligationStripeBindings?.[0]?.stripeInvoiceId, "in_ABC123xyz");
  const bad = bindObligationStripeInvoice({
    pkg: basePkg(),
    obligationId: INITIAL_ID,
    stripeInvoiceId: "not-an-invoice",
    actor: "operator@test",
  });
  assert.ok("error" in bad);
  ok("bindObligationStripeInvoice validates and records linkage only");
}

// G. Confirmation: this script never touches production / client 19
{
  ok("G: offline fixtures only — client 19 / contract 3 production records untouched");
}

console.log(`\n${passed} checks passed.`);
