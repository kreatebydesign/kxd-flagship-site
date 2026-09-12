/**
 * Offline verification: Platinum Growth $325 supersession of Care $250.
 * Does not touch the database.
 *
 *   npx tsx scripts/verify-platinum-growth-recurring-amendment.ts
 */
import assert from "node:assert/strict";
import {
  buildPlatinumFilmWorkzCommercialAmendments,
  isPlatinumGrowthRecurringAmendmentPresent,
  PLATINUM_CARE_AMOUNT_CENTS,
  PLATINUM_CARE_TITLE,
  PLATINUM_GROWTH_AMOUNT_CENTS,
  PLATINUM_GROWTH_EFFECTIVE_DATE,
  PLATINUM_GROWTH_TITLE,
  supersedePlatinumRecurringWithGrowth,
} from "../lib/proposal-lifecycle/commercial-amendments.ts";
import { previewRecurringObligationsThroughDate } from "../lib/proposal-lifecycle/ensure-recurring-obligations.ts";
import { emptyLifecyclePackage } from "../lib/proposal-lifecycle/package.ts";
import { overlayStructuredTermsWithRecurringService } from "../lib/proposal-lifecycle/platinum-growth-recurring-overlay.ts";
import { ensurePostAcceptanceMaterializationOnPackage } from "../lib/proposal-lifecycle/post-acceptance-materialization.ts";
import { resolveRecurringAuthority } from "../lib/proposal-lifecycle/recurring-authority.ts";
import type {
  ContractLifecyclePackage,
  InvoiceObligation,
  ProposedBillingPlan,
} from "../lib/proposal-lifecycle/types.ts";

function ok(label: string) {
  console.log(`✓ ${label}`);
}

function makePlan(obligations: InvoiceObligation[]): ProposedBillingPlan {
  return {
    schemaVersion: 1,
    id: "bplan-platinum-growth-verify",
    status: "ready-for-review",
    invoiceReadiness: "ready-for-review",
    contractId: 2,
    proposalId: 2,
    proposalNumber: "KXD-P-2026-0002",
    contractVersion: 1,
    contractHash: "verify",
    currency: "USD",
    oneTimeTotalCents: 250_000,
    monthlyTotalCents: 25_000,
    obligations,
    recurring: null,
    issues: [],
    reconciliation: {
      contractOneTimeCents: 250_000,
      obligationsSumCents: obligations.reduce((s, o) => s + o.amountCents, 0),
      differenceCents: 0,
      creditsAppliedOnce: false,
    },
    createdAt: "2026-08-20T00:00:00.000Z",
    updatedAt: "2026-09-12T00:00:00.000Z",
  };
}

const sepGrowth: InvoiceObligation = {
  id: "obl_c63e54f70f997f8a",
  kind: "recurring-period",
  label: "Website Growth & Management — 2026-09",
  amountCents: 32_500,
  currency: "USD",
  trigger: "on-date",
  dueTerms: "Website Growth & Management — period due 2026-09-01",
  status: "pending-trigger",
  dueDate: "2026-09-01",
  amountPaidCents: 0,
  paymentEvents: [],
  collectionChannel: null,
  paymentReceipt: null,
  sourceKey: "recurring:website-growth-management:2026-09",
  serviceTitle: "Website Growth & Management",
  serviceDefinitionKey: "Website Growth & Management",
  billingCadence: "monthly",
  billDay: 1,
};

const paidProject: InvoiceObligation = {
  id: "obl_paid_project",
  kind: "milestone",
  label: "Project paid aggregate stand-in",
  amountCents: 190_000,
  currency: "USD",
  trigger: "on-date",
  dueTerms: "paid",
  status: "paid",
  dueDate: "2026-08-20",
  amountPaidCents: 190_000,
  paymentEvents: [
    {
      id: "pe_1",
      paymentGroupId: "pg_1",
      amountCents: 190_000,
      currency: "USD",
      paidAt: "2026-08-20T00:00:00.000Z",
      externalPaymentMethod: "cash",
      operatorNote: "historical project payments",
      recordedBy: "verify",
      recordedAt: "2026-08-20T00:00:00.000Z",
      collectionChannel: "manual-external",
      idempotencyKey: "verify-paid-1900",
    },
  ],
  collectionChannel: "manual-external",
  paymentReceipt: null,
  sourceKey: "installment:verify",
};

const careAmendments = buildPlatinumFilmWorkzCommercialAmendments({
  recordedBy: "verify",
  recordedAt: "2026-08-20T18:18:05.088Z",
});

{
  assert.equal(careAmendments.recurringService?.title, PLATINUM_CARE_TITLE);
  assert.equal(careAmendments.recurringService?.amountCents, PLATINUM_CARE_AMOUNT_CENTS);
  ok("A. accepted/historical Care $250 term remains in original amendment builder");
}

const first = supersedePlatinumRecurringWithGrowth(careAmendments, {
  recordedBy: "verify-growth",
  recordedAt: "2026-09-12T18:00:00.000Z",
});
{
  assert.equal(first.status, "applied");
  assert.equal(first.priorRecurringTitle, PLATINUM_CARE_TITLE);
  assert.equal(first.priorRecurringAmountCents, PLATINUM_CARE_AMOUNT_CENTS);
  assert.equal(first.amendments.recurringService?.title, PLATINUM_GROWTH_TITLE);
  assert.equal(first.amendments.recurringService?.amountCents, PLATINUM_GROWTH_AMOUNT_CENTS);
  assert.equal(first.amendments.recurringService?.startBillingDate, PLATINUM_GROWTH_EFFECTIVE_DATE);
  assert.equal(first.amendments.recurringService?.startBillingDateStatus, "confirmed");
  assert.match(first.amendments.reason, /supersedes|Supersession/i);
  assert.match(first.amendments.reason, /Care/i);
  assert.equal(first.amendments.paymentScheduleOverride.length, 6);
  assert.equal(first.amendments.ancillaryCharges?.length, 2);
  assert.equal(first.amendments.projectOneTimeTotalCents, 250_000);
  ok("B. $325 Growth amendment becomes authoritative 2026-09-01; schedule preserved");
}

const replay = supersedePlatinumRecurringWithGrowth(first.amendments, {
  recordedBy: "verify-growth-replay",
});
{
  assert.equal(replay.status, "already-present");
  assert.equal(replay.amendments, first.amendments);
  assert.equal(isPlatinumGrowthRecurringAmendmentPresent(replay.amendments), true);
  ok("K. replay does not duplicate amendment");
}

const beforePkg: ContractLifecyclePackage = {
  ...emptyLifecyclePackage(),
  commercialStatus: "accepted",
  commercialAmendments: careAmendments,
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
      serviceTitle: PLATINUM_CARE_TITLE,
      includes: [],
      excludes: [],
      rankingDisclaimer: null,
      commencementNotes: null,
    },
    credits: [],
    taxes: { treatment: "unspecified", notes: "" },
    commercialSource: "proposal",
    sourceProposalNumber: "KXD-P-2026-0002",
    sourceProposalVersion: 1,
    derivedAt: "2026-08-20T00:00:00.000Z",
  },
  operatorRecurringServices: [
    {
      serviceKey: "Website Growth & Management",
      title: PLATINUM_GROWTH_TITLE,
      amountCents: 32_500,
      currency: "USD",
      cadence: "monthly",
      billDay: 1,
      effectiveDate: PLATINUM_GROWTH_EFFECTIVE_DATE,
      active: true,
      updatedAt: "2026-09-03T19:49:06.117Z",
      description:
        "Ongoing website management and updates, SEO, search indexing and visibility, performance optimization, technical website management, and management of Instagram and Facebook.",
    },
  ],
  billingPlan: makePlan([paidProject, sepGrowth]),
};

{
  const beforeAuth = resolveRecurringAuthority(beforePkg);
  assert.ok(beforeAuth.conflicts.length >= 1);
  assert.equal(beforeAuth.services[0]?.amountCents, 25_000);
  ok("pre-state conflict Care vs Growth detected");
}

const afterTerms = overlayStructuredTermsWithRecurringService(
  beforePkg.structuredPaymentTerms!,
  first.amendments.recurringService!,
);
const afterPkg: ContractLifecyclePackage = {
  ...beforePkg,
  commercialAmendments: first.amendments,
  structuredPaymentTerms: afterTerms,
};

{
  const afterAuth = resolveRecurringAuthority(afterPkg);
  assert.equal(afterAuth.conflicts.length, 0);
  assert.equal(afterAuth.services[0]?.title, PLATINUM_GROWTH_TITLE);
  assert.equal(afterAuth.services[0]?.amountCents, PLATINUM_GROWTH_AMOUNT_CENTS);
  assert.equal(afterAuth.services[0]?.effectiveDate, PLATINUM_GROWTH_EFFECTIVE_DATE);
  assert.equal(afterAuth.services[0]?.source, "commercial-amendment");
  assert.notEqual(afterAuth.services[0]?.activationStatus, "conflict");
  ok("C. recurring authority resolves without conflict");
}

{
  const preview = previewRecurringObligationsThroughDate(afterPkg, "2026-09-30");
  assert.equal(preview.createdCount, 0);
  const sep = (afterPkg.billingPlan?.obligations ?? []).filter(
    (o) => o.kind === "recurring-period" && String(o.dueDate || "").startsWith("2026-09"),
  );
  assert.equal(sep.length, 1);
  assert.equal(sep[0]!.amountCents, 32_500);
  assert.equal(sep[0]!.id, "obl_c63e54f70f997f8a");
  ok("D/E. existing September $325 obligation reused; no duplicate");
}

{
  const beforeOct = (afterPkg.billingPlan?.obligations ?? []).filter((o) =>
    String(o.sourceKey || "").includes(":2026-10"),
  );
  assert.equal(beforeOct.length, 0);
  const preview = previewRecurringObligationsThroughDate(afterPkg, "2026-10-31");
  assert.ok(preview.createdCount >= 1);
  assert.ok(
    preview.created.some(
      (o) =>
        o.amountCents === 32_500 &&
        String(o.sourceKey || "").includes("2026-10") &&
        o.serviceTitle === PLATINUM_GROWTH_TITLE,
    ),
  );
  // Reconciliation itself must not create October — preview only.
  assert.equal(
    (afterPkg.billingPlan?.obligations ?? []).filter((o) =>
      String(o.sourceKey || "").includes(":2026-10"),
    ).length,
    0,
  );
  ok("F. October eligible under Batch C preview; not created by reconciliation");
}

{
  const paid = (afterPkg.billingPlan?.obligations ?? []).reduce(
    (s, o) => s + Number(o.amountPaidCents || 0),
    0,
  );
  const events = (afterPkg.billingPlan?.obligations ?? []).reduce(
    (s, o) => s + ((o.paymentEvents || []).length),
    0,
  );
  assert.equal(paid, 190_000);
  assert.equal(events, 1);
  ok("G/I. $1,900 payment history unchanged; no new payment events");
}

{
  const dry = ensurePostAcceptanceMaterializationOnPackage({
    pkg: afterPkg,
    contractStatus: "executed",
    contractId: 2,
    proposalId: 2,
    proposalNumber: "KXD-P-2026-0002",
    clientId: 18,
    clientName: "Platinum Film Workz",
    actor: "verify",
    now: "2026-09-12T18:00:00.000Z",
  });
  const recurringConflicts = (dry.conflicts || []).filter(
    (c) => c.area === "recurring-definitions" || /Care|Growth|authority/i.test(c.message),
  );
  assert.equal(recurringConflicts.length, 0);
  ok("J. Batch D dry-run clean for recurring authority");
}

console.log("\nAll Platinum Growth recurring amendment verifications passed.");
