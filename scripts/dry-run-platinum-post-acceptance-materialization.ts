/**
 * Platinum Film Workz — Batch D materialization dry-run (in-memory).
 * No production DB writes.
 *
 *   npx tsx scripts/dry-run-platinum-post-acceptance-materialization.ts
 */

import { emptyLifecyclePackage } from "../lib/proposal-lifecycle/package";
import { buildPlatinumFilmWorkzCommercialAmendments } from "../lib/proposal-lifecycle/commercial-amendments";
import { ensurePostAcceptanceMaterializationOnPackage } from "../lib/proposal-lifecycle/post-acceptance-materialization";
import { obligationAmountPaidCents } from "../lib/proposal-lifecycle/obligation-balances";
import type {
  InvoiceObligation,
  ProposedBillingPlan,
} from "../lib/proposal-lifecycle/types";

function makePlan(obligations: InvoiceObligation[]): ProposedBillingPlan {
  return {
    schemaVersion: 1,
    id: "bplan-pfw",
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

function paid(
  id: string,
  label: string,
  amount: number,
  paid: number,
): InvoiceObligation {
  return {
    id,
    kind: id.includes("dep-1") ? "initial" : id.includes("rem-2") ? "final" : "milestone",
    label,
    amountCents: amount,
    currency: "USD",
    trigger: "on-date",
    dueTerms: "Due",
    status: paid >= amount ? "paid" : paid > 0 ? "partially-paid" : "pending-trigger",
    dueDate: null,
    stripeDraftInvoiceId: null,
    amountPaidCents: paid,
    paymentEvents:
      paid > 0
        ? [
            {
              id: `pe-${id}`,
              paymentGroupId: `grp-${id}`,
              amountCents: paid,
              currency: "USD",
              paidAt: "2026-08-21T00:00:00.000Z",
              externalPaymentMethod: "cash-app",
              recordedBy: "ops",
              recordedAt: "2026-08-21T00:00:00.000Z",
              collectionChannel: "manual-external",
              idempotencyKey: `idem-${id}`,
            },
          ]
        : [],
    collectionChannel: null,
    paymentReceipt: null,
    sourceKey: `installment:${id}`,
  };
}

const amendments = buildPlatinumFilmWorkzCommercialAmendments();
const obligations: InvoiceObligation[] = [
  paid("pfw-dep-1", "Deposit 1 of 4", 31_250, 31_250),
  paid("pfw-dep-2", "Deposit 2 of 4", 31_250, 31_250),
  paid("pfw-dep-3", "Deposit 3 of 4", 31_250, 31_250),
  paid("pfw-dep-4", "Deposit 4 of 4", 31_250, 31_250),
  paid("pfw-rem-1", "Progress Payment", 62_500, 62_500),
  paid("pfw-rem-2", "Final Payment", 62_500, 2_500),
  {
    id: "obl_c63e54f70f997f8a",
    kind: "recurring-period",
    label: "Website Growth & Management — 2026-09",
    amountCents: 32_500,
    currency: "USD",
    trigger: "on-date",
    dueTerms: "Due",
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
  },
  {
    id: "pfw-hosting-y1",
    kind: "addon",
    label: "KXD Managed Website Hosting",
    amountCents: 29_999,
    currency: "USD",
    trigger: "website-launch",
    dueTerms: "Annual",
    status: "pending-trigger",
    stripeDraftInvoiceId: "in_1UBhgZH7v7C2pv8kAggKGDP0",
    amountPaidCents: 0,
    paymentEvents: [],
    collectionChannel: null,
    paymentReceipt: null,
    sourceKey: "ancillary:pfw-hosting-y1",
  },
  {
    id: "pfw-domain-y1",
    kind: "addon",
    label: ".com Domain Registration",
    amountCents: 1_019,
    currency: "USD",
    trigger: "on-date",
    dueTerms: "Annual",
    status: "pending-trigger",
    stripeDraftInvoiceId: "in_1UBhgZH7v7C2pv8kAggKGDP0",
    amountPaidCents: 0,
    paymentEvents: [],
    collectionChannel: null,
    paymentReceipt: null,
    sourceKey: "ancillary:pfw-domain-y1",
  },
];

const pkg = {
  ...emptyLifecyclePackage(),
  billingPlan: makePlan(obligations),
  commercialAmendments: amendments,
  commercialStatus: "accepted" as const,
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
    installments: amendments.paymentScheduleOverride.map((item) => ({
      id: item.id,
      label: item.label,
      amountCents: item.amountCents,
      trigger: item.due,
      dueTerms: item.dueDate ?? String(item.due),
      dueDate: item.dueDate ?? null,
      status: "pending-trigger" as const,
    })),
    recurring: {
      amountCents: 25_000,
      cadence: "monthly" as const,
      startTrigger: "website-launch",
      minimumTermMonths: null,
      renewalBehavior: "at launch",
      status: "pending-trigger" as const,
      startBillingDate: null,
      startBillingDateStatus: "milestone-confirmed" as const,
      serviceTitle: "Website Care & Local Visibility",
      includes: [],
      excludes: [],
      rankingDisclaimer: null,
      commencementNotes: null,
    },
    ancillaryCharges: (amendments.ancillaryCharges ?? []).map((c) => ({
      id: c.id,
      kind: c.kind,
      title: c.title,
      amountCents: c.amountCents,
      cadence: c.cadence,
      dueTrigger: c.dueTrigger,
      dueDate: c.dueDate ?? null,
      termNotes: c.termNotes,
      renewalNotes: c.renewalNotes ?? null,
      status: "pending-trigger" as const,
    })),
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

const beforePaid = pkg.billingPlan.obligations.reduce(
  (s, o) => s + obligationAmountPaidCents(o),
  0,
);
const result = ensurePostAcceptanceMaterializationOnPackage({
  pkg,
  contractStatus: "executed",
  contractId: 2,
  clientId: 18,
  clientName: "Platinum Film Workz by HJ",
  actor: "dry-run",
});
const afterPaid = result.pkg.billingPlan!.obligations.reduce(
  (s, o) => s + obligationAmountPaidCents(o),
  0,
);

console.log("PLATINUM POST-ACCEPTANCE MATERIALIZATION DRY-RUN");
console.log("================================================");
console.log("Areas:");
for (const area of result.areas) {
  console.log(`  [${area.status}] ${area.area}: ${area.summary}`);
}
console.log("Conflicts:", result.conflicts.length);
for (const c of result.conflicts) console.log(`  - ${c.message}`);
console.log("Created counts:", result.createdCounts);
console.log("Paid before/after (must match):", beforePaid, afterPaid);
console.log(
  "October Growth created?",
  result.pkg.billingPlan!.obligations.some(
    (o) => o.sourceKey === "recurring:website-growth-management:2026-10",
  ),
);
console.log("PRODUCTION WRITE: NONE (in-memory dry-run only)");
