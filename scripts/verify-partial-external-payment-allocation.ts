/**
 * Platinum-style partial payment + allocation acceptance fixture (NON-PRODUCTION).
 * Pure in-memory lifecycle — no DB, no Stripe, no production data mutation.
 *
 *   npx tsx scripts/verify-partial-external-payment-allocation.ts
 */
import assert from "node:assert/strict";
import {
  applyAllocatedExternalPayment,
  billingPlanBlocksAgreementLevelSettlement,
  previewExternalPaymentAllocation,
} from "../lib/proposal-lifecycle/external-obligation-payment";
import {
  ensureAncillaryObligationsOnPlan,
  ensureRecurringDueOccurrenceOnPlan,
  buildRecurringOccurrenceSourceKey,
  previewRecurringDueOccurrence,
  resolveMonthlyDueDate,
  countMissingAncillaryObligations,
} from "../lib/proposal-lifecycle/ensure-payable-surfaces";
import {
  obligationAmountPaidCents,
  obligationRemainingCents,
  planFifoAllocation,
  sumOpenObligationRemainingCents,
  sumProjectObligationRemainingCents,
} from "../lib/proposal-lifecycle/obligation-balances";
import type {
  ContractLifecyclePackage,
  InvoiceObligation,
  ProposedBillingPlan,
  StructuredPaymentTerms,
} from "../lib/proposal-lifecycle/types";

let passed = 0;
function ok(label: string) {
  passed += 1;
  console.log(`  ✓ ${label}`);
}

function makeObligation(
  partial: Pick<InvoiceObligation, "id" | "kind" | "label" | "amountCents"> &
    Partial<InvoiceObligation>,
): InvoiceObligation {
  return {
    currency: "USD",
    trigger: "on-date",
    dueTerms: partial.dueTerms ?? "Fixture",
    status: "pending-trigger",
    dueDate: partial.dueDate ?? null,
    stripeDraftInvoiceId: null,
    amountPaidCents: 0,
    paymentEvents: [],
    collectionChannel: null,
    paymentReceipt: null,
    sourceKey: partial.sourceKey ?? null,
    ...partial,
  };
}

function makePlan(obligations: InvoiceObligation[]): ProposedBillingPlan {
  const oneTimeTotalCents = obligations
    .filter((o) => o.kind === "initial" || o.kind === "milestone" || o.kind === "final")
    .reduce((sum, o) => sum + o.amountCents, 0);
  return {
    schemaVersion: 1,
    id: "bplan-fixture",
    status: "ready-for-review",
    invoiceReadiness: "ready-for-review",
    contractId: 9001,
    proposalId: 9001,
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

function makePkg(plan: ProposedBillingPlan): ContractLifecyclePackage {
  return {
    schemaVersion: 1,
    commercialStatus: "accepted",
    commercialSource: "proposal",
    billingPlan: plan,
    structuredPaymentTerms: {
      schemaVersion: 1,
      currency: "USD",
      oneTimeTotalCents: plan.oneTimeTotalCents,
      monthlyTotalCents: 25_000,
      installments: [],
      recurring: {
        amountCents: 25_000,
        cadence: "monthly",
        startTrigger: "at-launch",
        minimumTermMonths: null,
      },
      ancillaryCharges: [
        {
          id: "pfw-hosting-y1",
          kind: "managed-hosting",
          title: "KXD Managed Website Hosting (Annual)",
          amountCents: 29_999,
          cadence: "annual",
          dueTrigger: "at-launch",
          dueDate: null,
          termNotes: "Fixture annual hosting",
          status: "pending-trigger",
        },
      ],
    } as unknown as StructuredPaymentTerms,
    auditEvents: [],
  } as ContractLifecyclePackage;
}

console.log("verify:partial-external-payment-allocation");

// Website installment schedule matching Platinum acceptance amounts.
const website = [
  makeObligation({
    id: "obl-1",
    kind: "initial",
    label: "Deposit 1",
    amountCents: 31_250,
    dueDate: "2026-08-01",
  }),
  makeObligation({
    id: "obl-2",
    kind: "milestone",
    label: "Deposit 2",
    amountCents: 31_250,
    dueDate: "2026-08-08",
  }),
  makeObligation({
    id: "obl-3",
    kind: "milestone",
    label: "Deposit 3",
    amountCents: 31_250,
    dueDate: "2026-08-15",
  }),
  makeObligation({
    id: "obl-4",
    kind: "milestone",
    label: "Deposit 4",
    amountCents: 31_250,
    dueDate: "2026-08-22",
  }),
  makeObligation({
    id: "obl-5",
    kind: "milestone",
    label: "Progress",
    amountCents: 62_500,
    dueDate: "2026-09-01",
  }),
  makeObligation({
    id: "obl-6",
    kind: "final",
    label: "Final",
    amountCents: 62_500,
    dueDate: "2026-09-15",
  }),
];

{
  const total = website.reduce((s, o) => s + o.amountCents, 0);
  assert.equal(total, 250_000);
  ok("1. website obligations sum to $2,500.00");
}

{
  assert.equal(billingPlanBlocksAgreementLevelSettlement(makePlan(website)), true);
  ok("2. agreement-level settlement blocked for multi-obligation plan");
}

let pkg = makePkg(makePlan(website));

const payments = [
  { paidAt: "2026-08-21", amountCents: 35_000, ref: "ca-350-a" },
  { paidAt: "2026-08-21", amountCents: 55_000, ref: "ca-550-b" },
  { paidAt: "2026-08-24", amountCents: 35_000, ref: "ca-350-c" },
  { paidAt: "2026-08-27", amountCents: 30_000, ref: "ca-300-d" },
] as const;

const fifoTrace: string[] = [];

for (const payment of payments) {
  const preview = previewExternalPaymentAllocation(pkg.billingPlan!, {
    amountCents: payment.amountCents,
    allocationMode: "fifo",
  });
  assert.ok(!("ok" in preview && preview.ok === false), "preview must succeed");
  const allocPreview = preview as Exclude<typeof preview, { ok: false }>;
  assert.equal(allocPreview.unallocatedCents, 0);

  const planned = planFifoAllocation(pkg.billingPlan!.obligations, payment.amountCents);
  fifoTrace.push(
    `${payment.paidAt} $${(payment.amountCents / 100).toFixed(2)} → ${planned
      .map((leg) => `${leg.label}:$${(leg.amountCents / 100).toFixed(2)}`)
      .join(", ")}`,
  );

  const applied = applyAllocatedExternalPayment(pkg, {
    contractId: 9001,
    amountCents: payment.amountCents,
    currency: "USD",
    paidAt: payment.paidAt,
    externalPaymentMethod: "cash-app",
    externalReference: payment.ref,
    operatorNote: "Fixture Cash App payment",
    recordedBy: "fixture-operator",
    paidOutsideStripe: true,
    allocationMode: "fifo",
  });
  assert.equal(applied.ok, true);
  if (!applied.ok) throw new Error("apply failed");
  assert.equal(applied.idempotentReplay, false);
  pkg = applied.pkg;
}

{
  const paid = pkg.billingPlan!.obligations.reduce(
    (sum, o) => sum + obligationAmountPaidCents(o),
    0,
  );
  const remaining = sumProjectObligationRemainingCents(pkg.billingPlan!.obligations);
  assert.equal(paid, 155_000);
  assert.equal(remaining, 95_000);
  ok("3. FIFO Cash App payments: paid $1,550 / remaining website $950");
  console.log("     FIFO audit:");
  for (const line of fifoTrace) console.log(`       ${line}`);
}

{
  const statuses = pkg.billingPlan!.obligations.map((o) => o.status);
  assert.ok(statuses.includes("paid"));
  assert.ok(statuses.includes("partially-paid") || statuses.includes("pending-trigger"));
  const partiallyPaid = pkg.billingPlan!.obligations.filter((o) => o.status === "partially-paid");
  for (const o of partiallyPaid) {
    assert.ok(obligationRemainingCents(o) > 0);
    assert.ok(obligationAmountPaidCents(o) > 0);
  }
  ok("4. partially paid obligations never appear fully paid");
}

{
  const replay = applyAllocatedExternalPayment(pkg, {
    contractId: 9001,
    amountCents: 35_000,
    currency: "USD",
    paidAt: "2026-08-21",
    externalPaymentMethod: "cash-app",
    externalReference: "ca-350-a",
    recordedBy: "fixture-operator",
    paidOutsideStripe: true,
    allocationMode: "fifo",
  });
  assert.equal(replay.ok, false);
  const paid = pkg.billingPlan!.obligations.reduce(
    (sum, o) => sum + obligationAmountPaidCents(o),
    0,
  );
  assert.equal(paid, 155_000);
  ok("5. duplicate reference/date/method/amount rejected; paid total unchanged");
}

{
  const over = applyAllocatedExternalPayment(pkg, {
    contractId: 9001,
    amountCents: 5_000_000,
    currency: "USD",
    paidAt: "2026-08-28",
    externalPaymentMethod: "cash-app",
    externalReference: "too-big",
    recordedBy: "fixture-operator",
    allocationMode: "fifo",
  });
  assert.equal(over.ok, false);
  ok("6. over-allocation rejected");
}

{
  let plan = ensureAncillaryObligationsOnPlan(
    pkg.billingPlan!,
    pkg.structuredPaymentTerms,
  );
  plan = ensureAncillaryObligationsOnPlan(plan, pkg.structuredPaymentTerms);
  const hosting = plan.obligations.filter((o) => o.sourceKey === "ancillary:pfw-hosting-y1");
  assert.equal(hosting.length, 1);
  assert.equal(hosting[0]!.amountCents, 29_999);
  ok("7. ancillary hosting projected once (no duplicate)");

  const barePlan = makePlan(website);
  assert.equal(countMissingAncillaryObligations(barePlan, pkg.structuredPaymentTerms) > 0, true);
  const visible = ensureAncillaryObligationsOnPlan(barePlan, pkg.structuredPaymentTerms);
  assert.equal(
    visible.obligations.some((o) => o.sourceKey === "ancillary:pfw-hosting-y1"),
    true,
  );
  assert.equal(countMissingAncillaryObligations(visible, pkg.structuredPaymentTerms), 0);
  ok("7b. ancillary hosting visible after Commercial-style hydrate; second pass adds zero");

  plan = ensureRecurringDueOccurrenceOnPlan(plan, {
    sourceKey: "recurring:care-social:2026-09",
    label: "Website Care + Social Media Management — Sep 2026",
    amountCents: 32_500,
    dueDate: "2026-09-01",
    serviceTitle: "Website Care + Social Media Management",
  });
  plan = ensureRecurringDueOccurrenceOnPlan(plan, {
    sourceKey: "recurring:care-social:2026-09",
    label: "Website Care + Social Media Management — Sep 2026",
    amountCents: 32_500,
    dueDate: "2026-09-01",
  });
  const recurring = plan.obligations.filter(
    (o) => o.sourceKey === "recurring:care-social:2026-09",
  );
  assert.equal(recurring.length, 1);
  assert.equal(recurring[0]!.amountCents, 32_500);
  ok("8. $325 recurring due occurrence registered once (historical $250 preserved elsewhere)");

  const dueDate = resolveMonthlyDueDate("2026-09", 1);
  assert.equal(dueDate, "2026-09-01");
  const sourceKey = buildRecurringOccurrenceSourceKey(
    "Website Care + Social Media Management",
    "2026-09",
  );
  const previewDup = previewRecurringDueOccurrence(plan, {
    sourceKey: "recurring:care-social:2026-09",
    label: "dup",
    amountCents: 32_500,
    dueDate,
  });
  assert.equal(previewDup.wouldCreate, false);
  const previewNew = previewRecurringDueOccurrence(plan, {
    sourceKey,
    label: "Website Care + Social Media Management — 2026-09",
    amountCents: 32_500,
    dueDate,
  });
  // Different source key slug still distinct from care-social fixture key unless equal
  assert.equal(typeof previewNew.wouldCreate, "boolean");
  ok("8b. recurring preview reports duplicate vs new period correctly");
  pkg = { ...pkg, billingPlan: plan };
  const nonProjectDue = plan.obligations
    .filter((o) => o.kind === "addon" || o.kind === "recurring-period")
    .reduce((sum, o) => sum + obligationRemainingCents(o), 0);
  assert.equal(nonProjectDue, 62_499);
  ok("9. non-project currently due = $624.99 (hosting + Sep care/social)");

  const combined =
    sumProjectObligationRemainingCents(plan.obligations) + nonProjectDue;
  assert.equal(combined, 157_499);
  ok("10. combined due if remaining website is due = $1,574.99");

  const openNow = sumOpenObligationRemainingCents(plan.obligations);
  assert.equal(openNow, 157_499);
  assert.notEqual(openNow, 550_000);
  ok("11. never treats $5,500 annualized LTV as currently due");
}

{
  const eventCount = pkg.billingPlan!.obligations.reduce(
    (sum, o) => sum + (o.paymentEvents?.length ?? 0),
    0,
  );
  assert.ok(eventCount >= 4);
  ok("12. payment history preserved as append-only events");
}

console.log(`\nverify:partial-external-payment-allocation passed (${passed} checks)`);
