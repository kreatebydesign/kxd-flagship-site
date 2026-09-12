/**
 * Platinum Film Workz — Batch C dry-run only.
 * No production DB writes. Reconstructs the known authority conflict in-memory.
 *
 *   npx tsx scripts/dry-run-platinum-recurring-ensure.ts
 */

import { emptyLifecyclePackage } from "../lib/proposal-lifecycle/package";
import { buildPlatinumFilmWorkzCommercialAmendments } from "../lib/proposal-lifecycle/commercial-amendments";
import { previewRecurringObligationsThroughDate } from "../lib/proposal-lifecycle/ensure-recurring-obligations";
import { resolveRecurringAuthority } from "../lib/proposal-lifecycle/recurring-authority";
import type {
  InvoiceObligation,
  ProposedBillingPlan,
} from "../lib/proposal-lifecycle/types";

function makePlan(obligations: InvoiceObligation[]): ProposedBillingPlan {
  return {
    schemaVersion: 1,
    id: "bplan-platinum-dryrun",
    status: "ready-for-review",
    invoiceReadiness: "ready-for-review",
    contractId: 2,
    proposalId: 1,
    proposalNumber: "KXD-P-PLATINUM",
    contractVersion: 1,
    contractHash: "dry-run",
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

const amendments = buildPlatinumFilmWorkzCommercialAmendments();
const existingSep: InvoiceObligation = {
  id: "obl_c63e54f70f997f8a",
  kind: "recurring-period",
  label: "Website Growth & Management — 2026-09",
  amountCents: 32_500,
  currency: "USD",
  trigger: "on-date",
  dueTerms: "Website Growth & Management — period due 2026-09-01",
  status: "pending-trigger",
  dueDate: "2026-09-01",
  stripeDraftInvoiceId: "in_1UBhgZH7v7C2pv8kAggKGDP0",
  amountPaidCents: 0,
  paymentEvents: [],
  collectionChannel: null,
  paymentReceipt: null,
  sourceKey: "recurring:website-growth-management:2026-09",
  serviceTitle: "Website Growth & Management",
  serviceDefinitionKey: "website-growth-management",
  billingCadence: "monthly",
  billDay: 1,
};

const plan = makePlan([existingSep]);
const pkg = {
  ...emptyLifecyclePackage(),
  billingPlan: plan,
  commercialAmendments: amendments,
  commercialStatus: "accepted",
  structuredPaymentTerms: {
    schemaVersion: 1 as const,
    currency: "USD",
    oneTimeTotalCents: 250_000,
    monthlyTotalCents: 25_000,
    depositCents: 125_000,
    initialPayment: {
      type: "deposit" as const,
      amountCents: 31_250,
      trigger: "on-date" as const,
      dueTerms: "Due",
    },
    installments: [],
    recurring: {
      amountCents: 25_000,
      cadence: "monthly" as const,
      startTrigger: "website-launch",
      minimumTermMonths: null,
      renewalBehavior: "Month-to-month beginning at website launch",
      status: "pending-trigger" as const,
      startBillingDate: null,
      startBillingDateStatus: "milestone-confirmed" as const,
      serviceTitle: "Website Care & Local Visibility",
      includes: [],
      excludes: [],
      rankingDisclaimer: null,
      commencementNotes: null,
    },
    credits: [],
    taxes: { treatment: "unspecified" as const, notes: "" },
    commercialSource: "proposal" as const,
    sourceProposalNumber: "KXD-P-PLATINUM",
    sourceProposalVersion: 1,
    derivedAt: "2026-08-20T00:00:00.000Z",
  },
  operatorRecurringServices: [
    {
      serviceKey: "website-growth-management",
      title: "Website Growth & Management",
      amountCents: 32_500,
      currency: "USD",
      cadence: "monthly" as const,
      billDay: 1,
      effectiveDate: "2026-09-01",
      active: true,
      updatedAt: "2026-09-01T00:00:00.000Z",
    },
  ],
};

const authority = resolveRecurringAuthority(pkg);
const preview = previewRecurringObligationsThroughDate(pkg, "2026-10-12");

console.log("PLATINUM RECURRING DRY-RUN (in-memory authority reconstruction)");
console.log("============================================================");
console.log("Legal authority:", {
  title: authority.services[0]?.title,
  amountCents: authority.services[0]?.amountCents,
  activationStatus: authority.services[0]?.activationStatus,
  source: authority.services[0]?.source,
});
console.log("Conflicts:", authority.conflicts.map((c) => c.message));
console.log("Existing periods:", [
  {
    period: "2026-09",
    title: "Website Growth & Management",
    amountCents: 32_500,
    note: "operator-registered; not legal Care $250",
  },
]);
console.log("Would create:", preview.created);
console.log("Created count:", preview.createdCount);
console.log("Skipped:", preview.skipped);
console.log("PRODUCTION WRITE: BLOCKED — resolve $250 Care vs $325 Growth first.");
