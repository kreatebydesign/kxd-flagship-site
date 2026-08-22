/**
 * Verify agreement Payment Status display resolution (billing-plan authoritative).
 *   npx tsx scripts/verify-agreement-payment-status-display.ts
 */
// @ts-nocheck — fixture script; run with tsx. Not part of app runtime.
import assert from "node:assert/strict";
import { emptyLifecyclePackage } from "../lib/proposal-lifecycle/package.ts";
import type { ContractLifecyclePackage } from "../lib/proposal-lifecycle/types.ts";
import {
  AGREEMENT_PAYMENT_AWAITING_EXECUTION_LABEL,
  resolveAgreementPaymentStatusLabel,
} from "../lib/client-command/commercial/payment-status-display.ts";
import { buildOverviewFromPrimary } from "../lib/client-command/commercial/map-agreement.ts";

let passed = 0;
function ok(label: string) {
  passed += 1;
  console.log(`  ✓ ${label}`);
}

function paidInitialPkg(): ContractLifecyclePackage {
  return {
    ...emptyLifecyclePackage(),
    commercialStatus: "accepted",
    paymentReferences: null,
    billingPlan: {
      id: "plan-test",
      contractId: 3,
      proposalId: 1,
      proposalNumber: "KXD-P-2026-0001",
      contractVersion: 1,
      contractHash: "hash",
      status: "blocked",
      currency: "USD",
      obligations: [
        {
          id: "deb-dep-1",
          kind: "initial",
          label: "Initial Deposit",
          amountCents: 250_000,
          currency: "USD",
          trigger: "at-contract",
          dueTerms: "Due at contract signing",
          status: "paid",
          paidAt: "2026-08-21T14:13:56.000Z",
          stripeDraftInvoiceId: "in_1U6bs4H7v7C2pv8k3pZuRHDy",
          collectionChannel: "stripe-collected",
          paymentReceipt: {
            status: "paid",
            amountCents: 250_000,
            currency: "USD",
            paidAt: "2026-08-21T14:13:56.000Z",
            stripeInvoiceId: "in_1U6bs4H7v7C2pv8k3pZuRHDy",
            collectionChannel: "stripe-collected",
            externalPaymentMethod: "other",
            externalReference: "in_1U6bs4H7v7C2pv8k3pZuRHDy",
            recordedBy: "stripe-live-webhook",
            recordedAt: "2026-08-21T14:14:03.142Z",
            idempotencyKey: "stripe-live:evt_test",
          },
        },
      ],
      recurring: null,
      reconciliation: {
        contractOneTimeCents: 950_000,
        obligationsSumCents: 950_000,
        differenceCents: 0,
        creditsAppliedOnce: true,
      },
      createdAt: "2026-08-21T00:00:00.000Z",
      updatedAt: "2026-08-21T00:00:00.000Z",
    },
    onboardingEligible: true,
  };
}

// A. Billing-plan initial obligation paid → Paid
{
  const label = resolveAgreementPaymentStatusLabel(paidInitialPkg(), "executed");
  assert.equal(label, "Paid");
  ok("A: billing-plan initial paid → Paid");
}

// B. Pending verified Stripe payment awaiting application → awaiting execution label
{
  const pkg: ContractLifecyclePackage = {
    ...emptyLifecyclePackage(),
    commercialStatus: "accepted",
    structuredPaymentTerms: {
      schemaVersion: 1,
      currency: "USD",
      sourceProposalNumber: "KXD-P-2026-0001",
      sourceProposalVersion: 1,
      derivedAt: "2026-08-20T00:00:00.000Z",
      installments: [
        {
          id: "deb-dep-1",
          label: "Initial Deposit",
          amountCents: 250_000,
          trigger: "at-contract",
          dueTerms: "Due at contract signing",
          status: "pending-trigger",
        },
      ],
      oneTimeTotalCents: 250_000,
      monthlyTotalCents: 0,
    },
    pendingVerifiedStripePayments: [
      {
        stripeEventId: "evt_pending",
        stripeInvoiceId: "in_pending",
        amountCents: 250_000,
        currency: "USD",
        paidAt: "2026-08-20T12:00:00.000Z",
        contractId: 3,
        obligationId: "deb-dep-1",
        matchedBy: "obligation-binding",
        livemode: true,
        recordedAt: "2026-08-20T12:00:00.000Z",
      },
    ],
  };
  const label = resolveAgreementPaymentStatusLabel(pkg, "sent-for-signature");
  assert.equal(label, AGREEMENT_PAYMENT_AWAITING_EXECUTION_LABEL);
  ok("B: pending verified payment → Payment received — awaiting contract execution");
}

// C. No verified payment → Pending
{
  const pkg: ContractLifecyclePackage = {
    ...emptyLifecyclePackage(),
    commercialStatus: "accepted",
    paymentReferences: null,
  };
  const label = resolveAgreementPaymentStatusLabel(pkg, "accepted");
  assert.equal(label, "Pending");
  ok("C: no verified payment → Pending");
}

// D. Legacy without billing plan → existing fallback (paymentReferences paid)
{
  const pkg: ContractLifecyclePackage = {
    ...emptyLifecyclePackage(),
    commercialStatus: "accepted",
    paymentReferences: {
      paymentStatus: "paid",
      stripeInvoiceId: "in_legacy",
      linkedAt: "2026-01-01T00:00:00.000Z",
      source: "manual-non-stripe",
    },
  };
  const label = resolveAgreementPaymentStatusLabel(pkg, "accepted");
  assert.equal(label, "Paid");
  ok("D: legacy paymentReferences paid → Paid");
}

// E. de Bois Contract 3 fixture
{
  const pkg = paidInitialPkg();
  const label = resolveAgreementPaymentStatusLabel(pkg, "executed");
  assert.equal(label, "Paid");
  assert.equal(pkg.billingPlan?.obligations[0]?.amountCents, 250_000);
  assert.equal(pkg.onboardingEligible, true);
  ok("E: de Bois fixture ($2,500 initial) → Paid");
}

// Overview outstanding copy skips "Payment not yet marked" when billing plan shows paid
{
  const pkg = paidInitialPkg();
  const overview = buildOverviewFromPrimary({
    clientId: 19,
    agreement: {
      id: 3,
      title: "Agreement — de Bois Entertainment Website Rebuild",
      status: "accepted",
      statusLabel: "Accepted",
      typeLabel: "website agreement",
      sourceLabel: "From proposal",
      valueLabel: "$9,500.00",
      projectAmountCents: 950_000,
      monthlyAmountCents: null,
      serviceStartDate: null,
      serviceEndDate: null,
      createdAt: "2026-08-20T17:46:00.171Z",
      acceptedAt: "2026-08-21T06:21:50.102Z",
      href: "/admin/operations/client-command/19/commercial/agreements/3",
      proposalId: 1,
    },
    pkg,
    daTerms: null,
    documentKinds: ["Agreement"],
    lastActivityLabel: null,
  });
  assert.equal(overview.paymentStatusLabel, "Paid");
  assert.equal(
    overview.outstandingItems.includes("Payment not yet marked"),
    false,
  );
  ok("overview: paid initial obligation → Paid, no 'Payment not yet marked'");
}

console.log(`\n${passed} checks passed.\n`);
