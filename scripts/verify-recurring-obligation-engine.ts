/**
 * Batch C — Recurring commercial obligation engine.
 *
 *   npx tsx scripts/verify-recurring-obligation-engine.ts
 */

import assert from "node:assert/strict";
import { emptyLifecyclePackage } from "../lib/proposal-lifecycle/package";
import {
  buildRecurringOccurrenceSourceKey,
  ensureRecurringDueOccurrenceOnPlan,
  resolveMonthlyDueDate,
  slugifyServiceKey,
} from "../lib/proposal-lifecycle/ensure-payable-surfaces";
import {
  ensureRecurringObligationsThroughDateOnPlan,
  previewRecurringObligationsThroughDate,
} from "../lib/proposal-lifecycle/ensure-recurring-obligations";
import {
  resolveRecurringAuthority,
  periodYearMonthsForService,
} from "../lib/proposal-lifecycle/recurring-authority";
import { buildPlatinumFilmWorkzCommercialAmendments } from "../lib/proposal-lifecycle/commercial-amendments";
import type {
  ContractLifecyclePackage,
  InvoiceObligation,
  ProposedBillingPlan,
} from "../lib/proposal-lifecycle/types";

let passed = 0;
function check(label: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${label}`);
  } catch (error) {
    console.error(`  ✗ ${label}`);
    throw error;
  }
}

function makeObligation(
  partial: Pick<InvoiceObligation, "id" | "kind" | "label" | "amountCents"> &
    Partial<InvoiceObligation>,
): InvoiceObligation {
  return {
    currency: "USD",
    trigger: "on-date",
    dueTerms: "Fixture",
    status: "pending-trigger",
    dueDate: null,
    stripeDraftInvoiceId: null,
    amountPaidCents: 0,
    paymentEvents: [],
    collectionChannel: null,
    paymentReceipt: null,
    sourceKey: null,
    ...partial,
  };
}

function makePlan(obligations: InvoiceObligation[]): ProposedBillingPlan {
  return {
    schemaVersion: 1,
    id: "bplan-recurring-fixture",
    status: "ready-for-review",
    invoiceReadiness: "ready-for-review",
    contractId: 9100,
    proposalId: 9100,
    proposalNumber: "KXD-P-RECURRING",
    contractVersion: 1,
    contractHash: "fixture",
    currency: "USD",
    oneTimeTotalCents: 0,
    monthlyTotalCents: 0,
    obligations,
    recurring: null,
    issues: [],
    reconciliation: {
      contractOneTimeCents: 0,
      obligationsSumCents: 0,
      differenceCents: 0,
      creditsAppliedOnce: false,
    },
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };
}

function pkgWith(
  plan: ProposedBillingPlan,
  extras: Partial<ContractLifecyclePackage> = {},
): ContractLifecyclePackage {
  return {
    ...emptyLifecyclePackage(),
    billingPlan: plan,
    commercialStatus: "executed",
    ...extras,
  };
}

function growthOperator(active = true, effectiveDate: string | null = "2026-09-01") {
  return {
    serviceKey: "website-growth-management",
    title: "Website Growth & Management",
    description: "Growth management fixture",
    amountCents: 32_500,
    currency: "USD",
    cadence: "monthly" as const,
    billDay: 1,
    effectiveDate,
    active,
    updatedAt: "2026-09-01T00:00:00.000Z",
  };
}

console.log("Batch C — recurring obligation engine\n");

check("A. monthly service, first period missing → created", () => {
  const plan = makePlan([]);
  const pkg = pkgWith(plan, {
    operatorRecurringServices: [growthOperator(true, "2026-09-01")],
  });
  const result = ensureRecurringObligationsThroughDateOnPlan(plan, pkg, "2026-09-12");
  assert.equal(result.createdCount, 1);
  assert.equal(result.created[0]!.periodYearMonth, "2026-09");
  assert.equal(result.created[0]!.amountCents, 32_500);
  assert.equal(
    result.created[0]!.sourceKey,
    "recurring:website-growth-management:2026-09",
  );
});

check("B. same run twice → no duplicate", () => {
  const plan = makePlan([]);
  const pkg = pkgWith(plan, {
    operatorRecurringServices: [growthOperator()],
  });
  const first = ensureRecurringObligationsThroughDateOnPlan(plan, pkg, "2026-09-12");
  const second = ensureRecurringObligationsThroughDateOnPlan(first.plan, pkg, "2026-09-12");
  assert.equal(first.createdCount, 1);
  assert.equal(second.createdCount, 0);
  assert.equal(second.alreadyPresent.length, 1);
  const keys = second.plan.obligations
    .filter((o) => o.sourceKey?.startsWith("recurring:"))
    .map((o) => o.sourceKey);
  assert.equal(keys.length, 1);
});

check("C. prior period exists → preserved", () => {
  let plan = makePlan([]);
  plan = ensureRecurringDueOccurrenceOnPlan(plan, {
    sourceKey: "recurring:website-growth-management:2026-09",
    label: "Website Growth & Management — 2026-09",
    amountCents: 32_500,
    dueDate: "2026-09-01",
    serviceTitle: "Website Growth & Management",
    billingCadence: "monthly",
    billDay: 1,
    serviceDefinitionKey: "website-growth-management",
  });
  const sepId = plan.obligations.find(
    (o) => o.sourceKey === "recurring:website-growth-management:2026-09",
  )!.id;
  const pkg = pkgWith(plan, {
    operatorRecurringServices: [growthOperator()],
  });
  const result = ensureRecurringObligationsThroughDateOnPlan(plan, pkg, "2026-10-12");
  const sep = result.plan.obligations.find(
    (o) => o.sourceKey === "recurring:website-growth-management:2026-09",
  );
  assert.ok(sep);
  assert.equal(sep!.id, sepId);
  assert.equal(sep!.amountCents, 32_500);
});

check("D. through-date creates only missing periods through requested date", () => {
  const plan = makePlan([]);
  const pkg = pkgWith(plan, {
    operatorRecurringServices: [growthOperator(true, "2026-09-01")],
  });
  const result = ensureRecurringObligationsThroughDateOnPlan(plan, pkg, "2026-10-12");
  const periods = result.periods.map((p) => p.periodYearMonth).sort();
  assert.deepEqual(periods, ["2026-09", "2026-10"]);
  assert.equal(result.createdCount, 2);
});

check("E. future periods not created beyond through-date", () => {
  const plan = makePlan([]);
  const pkg = pkgWith(plan, {
    operatorRecurringServices: [growthOperator(true, "2026-09-01")],
  });
  const result = ensureRecurringObligationsThroughDateOnPlan(plan, pkg, "2026-10-12");
  assert.ok(!result.periods.some((p) => p.periodYearMonth === "2026-11"));
  assert.ok(
    !result.plan.obligations.some(
      (o) => o.sourceKey === "recurring:website-growth-management:2026-11",
    ),
  );
});

check("F. pending-trigger service → skipped", () => {
  const amendments = buildPlatinumFilmWorkzCommercialAmendments({
    recordedAt: "2026-08-20T00:00:00.000Z",
  });
  const plan = makePlan([]);
  const pkg = pkgWith(plan, {
    commercialAmendments: amendments,
    structuredPaymentTerms: {
      schemaVersion: 1,
      currency: "USD",
      oneTimeTotalCents: 250_000,
      monthlyTotalCents: 25_000,
      depositCents: 125_000,
      initialPayment: {
        type: "deposit",
        amountCents: 31_250,
        trigger: "on-date",
        dueTerms: "Due",
      },
      installments: [],
      recurring: {
        amountCents: 25_000,
        cadence: "monthly",
        startTrigger: "website-launch",
        minimumTermMonths: null,
        renewalBehavior: "Month-to-month beginning at website launch",
        status: "pending-trigger",
        startBillingDate: null,
        startBillingDateStatus: "milestone-confirmed",
        serviceTitle: "Website Care & Local Visibility",
        includes: [],
        excludes: [],
        rankingDisclaimer: null,
        commencementNotes: null,
      },
      credits: [],
      taxes: { treatment: "unspecified", notes: "" },
      commercialSource: "proposal",
      sourceProposalNumber: "KXD-P-PFW",
      sourceProposalVersion: 1,
      derivedAt: "2026-08-20T00:00:00.000Z",
    },
  });
  const authority = resolveRecurringAuthority(pkg);
  assert.equal(authority.services[0]!.activationStatus, "pending-trigger");
  const result = ensureRecurringObligationsThroughDateOnPlan(plan, pkg, "2026-10-12");
  assert.equal(result.createdCount, 0);
  assert.ok(result.skipped.some((s) => s.reason.includes("pending-trigger")));
});

check("G. inactive/canceled service → skipped after end", () => {
  const plan = makePlan([]);
  const pkg = pkgWith(plan, {
    operatorRecurringServices: [growthOperator(false, "2026-09-01")],
  });
  const result = ensureRecurringObligationsThroughDateOnPlan(plan, pkg, "2026-10-12");
  assert.equal(result.createdCount, 0);
  assert.ok(result.skipped.length >= 1);
});

check("H. monthly amount and due date correct", () => {
  const plan = makePlan([]);
  const pkg = pkgWith(plan, {
    operatorRecurringServices: [
      { ...growthOperator(true, "2026-09-01"), billDay: 1 },
    ],
  });
  const result = ensureRecurringObligationsThroughDateOnPlan(plan, pkg, "2026-09-15");
  assert.equal(result.created[0]!.amountCents, 32_500);
  assert.equal(result.created[0]!.dueDate, "2026-09-01");
  assert.equal(resolveMonthlyDueDate("2026-09", 1), "2026-09-01");
});

check("I. annual recurrence behavior where supported", () => {
  const plan = makePlan([]);
  const pkg = pkgWith(plan, {
    operatorRecurringServices: [
      {
        serviceKey: "kxd-managed-hosting",
        title: "KXD Managed Website Hosting",
        amountCents: 29_999,
        currency: "USD",
        cadence: "annual",
        billDay: 1,
        effectiveDate: "2026-09-01",
        active: true,
        updatedAt: "2026-09-01T00:00:00.000Z",
      },
    ],
  });
  const months = periodYearMonthsForService({
    cadence: "annual",
    effectiveDate: "2026-09-01",
    throughDate: "2027-09-12",
  });
  assert.deepEqual(months, ["2026-09", "2027-09"]);
  const result = ensureRecurringObligationsThroughDateOnPlan(plan, pkg, "2027-09-12");
  assert.equal(result.createdCount, 2);
  assert.deepEqual(
    result.created.map((c) => c.periodYearMonth).sort(),
    ["2026-09", "2027-09"],
  );
});

check("J. source key/idempotency stable", () => {
  const key = buildRecurringOccurrenceSourceKey(
    "Website Growth & Management",
    "2026-10",
  );
  assert.equal(key, "recurring:website-growth-management:2026-10");
  assert.equal(slugifyServiceKey("Website Growth & Management"), "website-growth-management");
  const plan = makePlan([]);
  const pkg = pkgWith(plan, { operatorRecurringServices: [growthOperator()] });
  const a = ensureRecurringObligationsThroughDateOnPlan(plan, pkg, "2026-10-12");
  const b = ensureRecurringObligationsThroughDateOnPlan(a.plan, pkg, "2026-10-12");
  const c = ensureRecurringObligationsThroughDateOnPlan(b.plan, pkg, "2026-10-12");
  assert.equal(a.createdCount, 2);
  assert.equal(b.createdCount, 0);
  assert.equal(c.createdCount, 0);
  assert.equal(
    c.plan.obligations.filter((o) => o.kind === "recurring-period").length,
    2,
  );
});

check("K. Platinum-shaped clean authority: Sep exists, Oct missing → one Oct", () => {
  let plan = makePlan([]);
  plan = ensureRecurringDueOccurrenceOnPlan(plan, {
    sourceKey: "recurring:website-growth-management:2026-09",
    label: "Website Growth & Management — 2026-09",
    amountCents: 32_500,
    dueDate: "2026-09-01",
    serviceTitle: "Website Growth & Management",
    billingCadence: "monthly",
    billDay: 1,
    serviceEffectiveDate: "2026-09-01",
    serviceDefinitionKey: "website-growth-management",
  });
  const pkg = pkgWith(plan, {
    operatorRecurringServices: [growthOperator(true, "2026-09-01")],
  });
  const preview = previewRecurringObligationsThroughDate(pkg, "2026-10-12");
  assert.equal(preview.alreadyPresent.length, 1);
  assert.equal(preview.alreadyPresent[0]!.periodYearMonth, "2026-09");
  assert.equal(preview.created.length, 1);
  assert.equal(preview.created[0]!.periodYearMonth, "2026-10");
  assert.equal(preview.created[0]!.amountCents, 32_500);
  assert.ok(!preview.created.some((c) => c.periodYearMonth === "2026-11"));
});

check("L. conflicting recurring definitions → explicit error/skip, not silent guess", () => {
  const amendments = buildPlatinumFilmWorkzCommercialAmendments();
  let plan = makePlan([
    makeObligation({
      id: "obl_growth_sep",
      kind: "recurring-period",
      label: "Website Growth & Management — 2026-09",
      amountCents: 32_500,
      status: "pending-trigger",
      dueDate: "2026-09-01",
      sourceKey: "recurring:website-growth-management:2026-09",
      serviceTitle: "Website Growth & Management",
      serviceDefinitionKey: "website-growth-management",
      billingCadence: "monthly",
    }),
  ]);
  const pkg = pkgWith(plan, {
    commercialAmendments: amendments,
    structuredPaymentTerms: {
      schemaVersion: 1,
      currency: "USD",
      oneTimeTotalCents: 250_000,
      monthlyTotalCents: 25_000,
      depositCents: 125_000,
      initialPayment: {
        type: "deposit",
        amountCents: 31_250,
        trigger: "on-date",
        dueTerms: "Due",
      },
      installments: [],
      recurring: {
        amountCents: 25_000,
        cadence: "monthly",
        startTrigger: "website-launch",
        minimumTermMonths: null,
        renewalBehavior: "at launch",
        status: "pending-trigger",
        startBillingDate: null,
        startBillingDateStatus: "milestone-confirmed",
        serviceTitle: "Website Care & Local Visibility",
        includes: [],
        excludes: [],
        rankingDisclaimer: null,
        commencementNotes: null,
      },
      credits: [],
      taxes: { treatment: "unspecified", notes: "" },
      commercialSource: "proposal",
      sourceProposalNumber: "KXD-P-PFW",
      sourceProposalVersion: 1,
      derivedAt: "2026-08-20T00:00:00.000Z",
    },
    operatorRecurringServices: [growthOperator(true, "2026-09-01")],
  });
  const authority = resolveRecurringAuthority(pkg);
  assert.ok(authority.conflicts.length > 0);
  assert.equal(authority.services[0]!.activationStatus, "conflict");
  assert.equal(authority.services[0]!.amountCents, 25_000);
  const result = ensureRecurringObligationsThroughDateOnPlan(plan, pkg, "2026-10-12");
  assert.equal(result.createdCount, 0);
  assert.ok(result.conflicts.length > 0);
  assert.equal(
    result.plan.obligations.filter((o) => o.kind === "recurring-period").length,
    1,
    "must not create October under conflict",
  );
});

console.log(`\n${passed} checks passed`);
