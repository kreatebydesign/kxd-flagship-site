/**
 * Batch D — Post-acceptance commercial materialization.
 *
 *   npx tsx scripts/verify-post-acceptance-materialization.ts
 */

import assert from "node:assert/strict";
import { emptyLifecyclePackage } from "../lib/proposal-lifecycle/package";
import { ensurePostAcceptanceMaterializationOnPackage } from "../lib/proposal-lifecycle/post-acceptance-materialization";
import { buildPlatinumFilmWorkzCommercialAmendments } from "../lib/proposal-lifecycle/commercial-amendments";
import { obligationAmountPaidCents } from "../lib/proposal-lifecycle/obligation-balances";
import type {
  ContractLifecyclePackage,
  InvoiceObligation,
  ProposedBillingPlan,
  StructuredPaymentTerms,
} from "../lib/proposal-lifecycle/types";
import type { CanonicalProposal } from "../lib/proposal-builder/types";

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

function makePlan(obligations: InvoiceObligation[]): ProposedBillingPlan {
  return {
    schemaVersion: 1,
    id: "bplan-batch-d",
    status: "ready-for-review",
    invoiceReadiness: "ready-for-review",
    contractId: 501,
    proposalId: 501,
    proposalNumber: "KXD-P-BATCH-D",
    contractVersion: 1,
    contractHash: "hash",
    currency: "USD",
    oneTimeTotalCents: obligations
      .filter((o) => o.kind !== "addon" && o.kind !== "recurring-period")
      .reduce((s, o) => s + o.amountCents, 0),
    monthlyTotalCents: 0,
    obligations,
    recurring: null,
    issues: [],
    reconciliation: {
      contractOneTimeCents: 380_000,
      obligationsSumCents: obligations.reduce((s, o) => s + o.amountCents, 0),
      differenceCents: 0,
      creditsAppliedOnce: false,
    },
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };
}

function obl(
  partial: Pick<InvoiceObligation, "id" | "kind" | "label" | "amountCents"> &
    Partial<InvoiceObligation>,
): InvoiceObligation {
  return {
    currency: "USD",
    trigger: "on-date",
    dueTerms: "Due",
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

function cleanWebsiteTerms(): StructuredPaymentTerms {
  return {
    schemaVersion: 1,
    currency: "USD",
    oneTimeTotalCents: 380_000,
    monthlyTotalCents: 32_500,
    depositCents: 190_000,
    initialPayment: {
      type: "deposit",
      amountCents: 190_000,
      trigger: "at-acceptance",
      dueTerms: "Due on acceptance",
    },
    installments: [
      {
        id: "init-1900",
        label: "Initiation payment",
        amountCents: 190_000,
        trigger: "at-acceptance",
        dueTerms: "Due on acceptance",
        dueDate: null,
        status: "pending-trigger",
      },
      {
        id: "final-1900",
        label: "Completion payment",
        amountCents: 190_000,
        trigger: "milestone",
        dueTerms: "Due on completion",
        dueDate: null,
        status: "pending-trigger",
      },
    ],
    recurring: {
      amountCents: 32_500,
      cadence: "monthly",
      startTrigger: "website-launch",
      minimumTermMonths: null,
      renewalBehavior: "Month-to-month beginning at website launch",
      status: "pending-trigger",
      startBillingDate: null,
      startBillingDateStatus: "milestone-confirmed",
      serviceTitle: "Website Growth & Management",
      includes: ["Ongoing website management"],
      excludes: [],
      rankingDisclaimer: null,
      commencementNotes: "Begins at website launch.",
    },
    ancillaryCharges: [
      {
        id: "host-y1",
        kind: "managed-hosting",
        title: "KXD Managed Website Hosting",
        amountCents: 29_900,
        cadence: "annual",
        dueTrigger: "website-launch",
        dueDate: null,
        termNotes: "Annual hosting",
        renewalNotes: null,
        status: "pending-trigger",
      },
    ],
    credits: [],
    taxes: { treatment: "unspecified", notes: "" },
    commercialSource: "proposal",
    sourceProposalNumber: "KXD-P-CLEAN",
    sourceProposalVersion: 1,
    derivedAt: "2026-09-01T00:00:00.000Z",
  };
}

function minimalCanonical(): CanonicalProposal {
  return {
    schemaVersion: 1,
    proposalNumber: "KXD-P-CLEAN",
    version: 1,
    title: "Website Experience",
    status: "accepted-contract-pending",
    currency: "USD",
    primaryOrganization: "Clean Client Co",
    totals: {
      oneTimeTotalCents: 380_000,
      monthlyTotalCents: 32_500,
      depositCents: 190_000,
      remainingCents: 190_000,
    },
    paymentSchedule: [],
    credits: [],
    organizations: [{ name: "Clean Client Co" }],
    primaryContact: { name: "Ada", email: "ada@example.com" },
    executive: { headline: "", summary: "" },
    scopeGroups: [],
    terms: { payment: "", timeline: "", assumptions: "" },
    selectedLineIds: [],
    selectedPackageKeys: [],
  } as unknown as CanonicalProposal;
}

console.log("Batch D — post-acceptance materialization\n");

check("A. clean accepted website contract materializes required projections", () => {
  const pkg = {
    ...emptyLifecyclePackage(),
    structuredPaymentTerms: cleanWebsiteTerms(),
    commercialStatus: "accepted" as const,
  };
  const result = ensurePostAcceptanceMaterializationOnPackage({
    pkg,
    contractStatus: "executed",
    contractId: 501,
    proposalId: 501,
    clientId: 42,
    clientName: "Clean Client Co",
    canonical: minimalCanonical(),
    actor: "test",
  });
  assert.ok(result.pkg.billingPlan);
  const kinds = result.pkg.billingPlan!.obligations.map((o) => o.kind);
  assert.ok(kinds.includes("initial"));
  assert.ok(kinds.includes("final"));
  assert.ok(kinds.includes("addon"));
  assert.equal(
    result.pkg.billingPlan!.obligations.find((o) => o.kind === "initial")!.amountCents,
    190_000,
  );
  assert.equal(
    result.pkg.billingPlan!.obligations.find((o) => o.kind === "final")!.amountCents,
    190_000,
  );
  assert.ok(
    result.pkg.operatorRecurringServices?.some(
      (d) => d.amountCents === 32_500 && !d.effectiveDate,
    ),
  );
  assert.ok((result.materialization.onboardingRequirements?.length ?? 0) > 0);
  assert.equal(result.materialization.portalReadiness.invitationBlocked, true);
});

check("B. replay creates nothing duplicate", () => {
  const pkg0 = {
    ...emptyLifecyclePackage(),
    structuredPaymentTerms: cleanWebsiteTerms(),
  };
  const first = ensurePostAcceptanceMaterializationOnPackage({
    pkg: pkg0,
    contractStatus: "executed",
    contractId: 501,
    clientId: 42,
    actor: "test",
  });
  const second = ensurePostAcceptanceMaterializationOnPackage({
    pkg: first.pkg,
    contractStatus: "executed",
    contractId: 501,
    clientId: 42,
    actor: "test",
  });
  assert.equal(
    first.pkg.billingPlan!.obligations.length,
    second.pkg.billingPlan!.obligations.length,
  );
  assert.equal(second.createdCounts.obligations, 0);
  assert.equal(second.createdCounts.ancillaryObligations, 0);
  assert.equal(second.createdCounts.recurringDefinitions, 0);
});

check("C/D. existing + payment-bearing obligations preserved", () => {
  const plan = makePlan([
    obl({
      id: "init-1900",
      kind: "initial",
      label: "Initiation payment",
      amountCents: 190_000,
      status: "paid",
      amountPaidCents: 190_000,
      sourceKey: "installment:init-1900",
      paymentEvents: [
        {
          id: "pe1",
          paymentGroupId: "g1",
          amountCents: 190_000,
          currency: "USD",
          paidAt: "2026-09-01T00:00:00.000Z",
          externalPaymentMethod: "cash-app",
          recordedBy: "ops",
          recordedAt: "2026-09-01T00:00:00.000Z",
          collectionChannel: "manual-external",
          idempotencyKey: "k1",
        },
      ],
    }),
  ]);
  const pkg: ContractLifecyclePackage = {
    ...emptyLifecyclePackage(),
    billingPlan: plan,
    structuredPaymentTerms: cleanWebsiteTerms(),
  };
  const result = ensurePostAcceptanceMaterializationOnPackage({
    pkg,
    contractStatus: "executed",
    contractId: 501,
    clientId: 42,
    actor: "test",
  });
  const initial = result.pkg.billingPlan!.obligations.find((o) => o.id === "init-1900")!;
  assert.equal(obligationAmountPaidCents(initial), 190_000);
  assert.equal(initial.paymentEvents?.length, 1);
  assert.ok(result.pkg.billingPlan!.obligations.some((o) => o.id === "final-1900" || o.sourceKey === "installment:final-1900"));
});

check("E/F. recurring definition pending; no period before trigger", () => {
  const result = ensurePostAcceptanceMaterializationOnPackage({
    pkg: {
      ...emptyLifecyclePackage(),
      structuredPaymentTerms: cleanWebsiteTerms(),
    },
    contractStatus: "executed",
    contractId: 501,
    clientId: 42,
    actor: "test",
  });
  const def = result.pkg.operatorRecurringServices![0]!;
  assert.equal(def.amountCents, 32_500);
  assert.equal(def.effectiveDate, null);
  assert.ok(
    !result.pkg.billingPlan!.obligations.some((o) => o.kind === "recurring-period"),
  );
  assert.ok(
    result.areas.some(
      (a) => a.area === "recurring-periods" && a.status === "not-applicable",
    ),
  );
});

check("G. hosting/annual service represented as ancillary obligation", () => {
  const result = ensurePostAcceptanceMaterializationOnPackage({
    pkg: {
      ...emptyLifecyclePackage(),
      structuredPaymentTerms: cleanWebsiteTerms(),
    },
    contractStatus: "executed",
    contractId: 501,
    clientId: 42,
    actor: "test",
  });
  const hosting = result.pkg.billingPlan!.obligations.find(
    (o) => o.sourceKey === "ancillary:host-y1" || o.id === "host-y1",
  );
  assert.ok(hosting);
  assert.equal(hosting!.amountCents, 29_900);
  assert.equal(hosting!.kind, "addon");
});

check("H. onboarding initialized once", () => {
  const first = ensurePostAcceptanceMaterializationOnPackage({
    pkg: {
      ...emptyLifecyclePackage(),
      structuredPaymentTerms: cleanWebsiteTerms(),
    },
    contractStatus: "executed",
    contractId: 501,
    clientId: 42,
    actor: "test",
  });
  assert.ok(first.createdCounts.onboardingRequirements > 0);
  const second = ensurePostAcceptanceMaterializationOnPackage({
    pkg: first.pkg,
    contractStatus: "executed",
    contractId: 501,
    clientId: 42,
    actor: "test",
  });
  assert.equal(second.createdCounts.onboardingRequirements, 0);
  assert.equal(
    first.materialization.onboardingRequirements.length,
    second.materialization.onboardingRequirements.length,
  );
});

check("I. client reused instead of duplicated", () => {
  const result = ensurePostAcceptanceMaterializationOnPackage({
    pkg: {
      ...emptyLifecyclePackage(),
      structuredPaymentTerms: cleanWebsiteTerms(),
    },
    contractStatus: "executed",
    contractId: 501,
    clientId: 42,
    clientName: "Clean Client Co",
    actor: "test",
  });
  const clientArea = result.areas.find((a) => a.area === "client")!;
  assert.equal(clientArea.status, "already-present");
  assert.match(clientArea.summary, /#42/);
});

check("J. portal readiness without invitation", () => {
  const result = ensurePostAcceptanceMaterializationOnPackage({
    pkg: {
      ...emptyLifecyclePackage(),
      structuredPaymentTerms: cleanWebsiteTerms(),
    },
    contractStatus: "draft",
    contractId: 501,
    clientId: 42,
    actor: "test",
  });
  assert.equal(result.materialization.portalReadiness.invitationBlocked, true);
  assert.ok(
    result.materialization.portalReadiness.status === "not-eligible" ||
      result.materialization.portalReadiness.status === "eligible",
  );
});

check("K/L. conflicting recurring blocks that area only; other projections continue", () => {
  const amendments = buildPlatinumFilmWorkzCommercialAmendments();
  const plan = makePlan([
    obl({
      id: "obl_growth_sep",
      kind: "recurring-period",
      label: "Website Growth & Management — 2026-09",
      amountCents: 32_500,
      sourceKey: "recurring:website-growth-management:2026-09",
      serviceTitle: "Website Growth & Management",
      serviceDefinitionKey: "website-growth-management",
    }),
    obl({
      id: "pfw-dep-1",
      kind: "initial",
      label: "Deposit",
      amountCents: 31_250,
      sourceKey: "installment:pfw-dep-1",
      status: "paid",
      amountPaidCents: 31_250,
      paymentEvents: [
        {
          id: "e",
          paymentGroupId: "g",
          amountCents: 31_250,
          currency: "USD",
          paidAt: "2026-08-20T00:00:00.000Z",
          externalPaymentMethod: "cash-app",
          recordedBy: "ops",
          recordedAt: "2026-08-20T00:00:00.000Z",
          collectionChannel: "manual-external",
          idempotencyKey: "k",
        },
      ],
    }),
  ]);
  const terms = {
    ...cleanWebsiteTerms(),
    oneTimeTotalCents: 250_000,
    monthlyTotalCents: 25_000,
    installments: amendments.paymentScheduleOverride.map((item) => ({
      id: item.id,
      label: item.label,
      amountCents: item.amountCents,
      trigger: item.due,
      dueTerms: item.dueDate ?? item.due,
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
  };
  const pkg: ContractLifecyclePackage = {
    ...emptyLifecyclePackage(),
    billingPlan: plan,
    structuredPaymentTerms: terms,
    commercialAmendments: amendments,
    operatorRecurringServices: [
      {
        serviceKey: "website-growth-management",
        title: "Website Growth & Management",
        amountCents: 32_500,
        currency: "USD",
        cadence: "monthly",
        billDay: 1,
        effectiveDate: "2026-09-01",
        active: true,
        updatedAt: "2026-09-01T00:00:00.000Z",
      },
    ],
  };
  const result = ensurePostAcceptanceMaterializationOnPackage({
    pkg,
    contractStatus: "executed",
    contractId: 2,
    clientId: 18,
    actor: "test",
  });
  assert.ok(result.conflicts.length > 0);
  assert.ok(
    result.areas.some(
      (a) => a.area === "recurring-service-definition" && a.status === "conflict",
    ),
  );
  // Payment preserved
  assert.equal(
    obligationAmountPaidCents(
      result.pkg.billingPlan!.obligations.find((o) => o.id === "pfw-dep-1")!,
    ),
    31_250,
  );
  // Ancillary can still materialize
  assert.ok(
    result.pkg.billingPlan!.obligations.some(
      (o) => o.id === "pfw-hosting-y1" || o.sourceKey === "ancillary:pfw-hosting-y1",
    ),
  );
  // No October period created
  assert.ok(
    !result.pkg.billingPlan!.obligations.some(
      (o) => o.sourceKey === "recurring:website-growth-management:2026-10",
    ),
  );
});

check("M. source lineage retained on obligations", () => {
  const result = ensurePostAcceptanceMaterializationOnPackage({
    pkg: {
      ...emptyLifecyclePackage(),
      structuredPaymentTerms: cleanWebsiteTerms(),
    },
    contractStatus: "executed",
    contractId: 501,
    clientId: 42,
    actor: "test",
  });
  for (const o of result.pkg.billingPlan!.obligations) {
    if (o.kind === "initial" || o.kind === "final" || o.kind === "milestone") {
      assert.ok(o.sourceKey?.startsWith("installment:"));
    }
    if (o.kind === "addon") {
      assert.ok(o.sourceKey?.startsWith("ancillary:"));
    }
  }
  assert.ok(result.pkg.commercialMaterialization?.lastEnsuredAt);
});

check("N. Platinum-shaped messy fixture reports conflict without destructive mutation", () => {
  // covered by K/L — assert operator growth def not overwritten to $250
  const amendments = buildPlatinumFilmWorkzCommercialAmendments();
  const plan = makePlan([
    obl({
      id: "obl_growth_sep",
      kind: "recurring-period",
      label: "Growth Sep",
      amountCents: 32_500,
      sourceKey: "recurring:website-growth-management:2026-09",
      serviceDefinitionKey: "website-growth-management",
      serviceTitle: "Website Growth & Management",
    }),
  ]);
  const beforeOps = [
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
  ];
  const result = ensurePostAcceptanceMaterializationOnPackage({
    pkg: {
      ...emptyLifecyclePackage(),
      billingPlan: plan,
      commercialAmendments: amendments,
      structuredPaymentTerms: {
        ...cleanWebsiteTerms(),
        monthlyTotalCents: 25_000,
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
      },
      operatorRecurringServices: beforeOps,
    },
    contractStatus: "executed",
    contractId: 2,
    clientId: 18,
    actor: "test",
  });
  assert.ok(result.conflicts.length > 0);
  assert.equal(result.pkg.operatorRecurringServices![0]!.amountCents, 32_500);
  assert.equal(
    result.pkg.billingPlan!.obligations.find((o) => o.id === "obl_growth_sep")!
      .amountCents,
    32_500,
  );
});

check("O. open invoice never counted as payment", () => {
  const plan = makePlan([
    obl({
      id: "svc",
      kind: "recurring-period",
      label: "Growth",
      amountCents: 32_500,
      stripeDraftInvoiceId: "in_open",
      sourceKey: "recurring:website-growth-management:2026-09",
    }),
  ]);
  const result = ensurePostAcceptanceMaterializationOnPackage({
    pkg: {
      ...emptyLifecyclePackage(),
      billingPlan: plan,
      structuredPaymentTerms: cleanWebsiteTerms(),
    },
    contractStatus: "executed",
    contractId: 501,
    clientId: 42,
    actor: "test",
  });
  const svc = result.pkg.billingPlan!.obligations.find((o) => o.id === "svc")!;
  assert.equal(obligationAmountPaidCents(svc), 0);
  assert.equal(svc.amountPaidCents ?? 0, 0);
});

console.log(`\n${passed} checks passed`);
