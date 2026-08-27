/**
 * Offline verification for Direct Agreement PDF investment presentation.
 *   npx tsx scripts/verify-agreement-value-presentation.ts
 */
import assert from "node:assert/strict";
import { parseAgreementDocumentSections } from "../lib/commercial-legal/agreement-document-sections";
import {
  resolveAgreementAmountKpi,
  resolveDirectAgreementInvestmentLines,
} from "../lib/client-command/commercial/resolve-agreement-amount-kpi";
import { applyFinalizedDirectAgreementPresentationCopy, resolveDirectAgreementPaymentSummaryCopy } from "../lib/commercial-legal/compose-direct-agreement-document";
import type { StructuredPaymentTerms } from "../lib/proposal-lifecycle/types";

function mockTerms(
  overrides: Pick<
    StructuredPaymentTerms,
    "oneTimeTotalCents" | "monthlyTotalCents" | "commercialSource" | "sourceProposalNumber"
  > &
    Partial<StructuredPaymentTerms>,
): StructuredPaymentTerms {
  return {
    schemaVersion: 1,
    currency: "USD",
    depositCents: overrides.oneTimeTotalCents,
    initialPayment: {
      type: overrides.oneTimeTotalCents > 0 ? "full" : "none",
      amountCents: overrides.oneTimeTotalCents,
      trigger: "at-contract",
      dueTerms: "",
    },
    installments: [],
    recurring: {
      amountCents: overrides.monthlyTotalCents,
      cadence: overrides.monthlyTotalCents > 0 ? "monthly" : "none",
      startTrigger: "after-launch-verified",
      minimumTermMonths: null,
      renewalBehavior: "none",
      status: overrides.monthlyTotalCents > 0 ? "pending-trigger" : "cancelled",
    },
    credits: [],
    taxes: { treatment: "unspecified", notes: "" },
    billingContactName: "",
    billingEmail: "",
    sourceProposalVersion: 1,
    derivedAt: "2026-08-27T00:00:00.000Z",
    ...overrides,
  };
}

const sampleBody = [
  "SERVICE INVESTMENT",
  "",
  "STANDARD KXD RATE",
  "$1,250 per month",
  "",
  "YOUR FRIENDS & FAMILY RATE",
  "$600 per month",
  "",
  "MONTHLY SERVICE SCOPE",
  "",
  "WEBSITE MANAGEMENT",
  "• Ongoing website content updates",
].join("\n");

const sections = parseAgreementDocumentSections(sampleBody);
assert.ok(sections.some((s) => s.title === "SERVICE INVESTMENT"));
assert.ok(sections.some((s) => s.title === "MONTHLY SERVICE SCOPE"));

const recurringKpi = resolveAgreementAmountKpi({
  daTerms: {
    schemaVersion: 1,
    commercialStructure: "recurring",
    oneTimeAmountCents: 0,
    monthlyAmountCents: 60000,
    currency: "USD",
    serviceStartDate: "2026-09-01",
    serviceEndDate: null,
    scope: "x",
    includedServices: "x",
    exclusions: "x",
    capacityHoursPerMonth: 4,
    rolloverPolicy: "none",
    revisionAllowance: "x",
    overagePreapprovalRule: "x",
    paymentTerms: "x",
    cancellationRefundLanguage: "x",
    intellectualPropertyLanguage: "x",
    portfolioUseLanguage: "x",
    clientResponsibilities: "x",
    renewalBehavior: "x",
    autoRenew: false,
    termsVersion: 1,
  },
});
assert.equal(recurringKpi.label, "Monthly rate");
assert.equal(recurringKpi.value, "$600.00");

const recurringPdfLines = resolveDirectAgreementInvestmentLines({
  structuredPaymentTerms: mockTerms({
    commercialSource: "direct-agreement",
    sourceProposalNumber: "DIRECT-4",
    oneTimeTotalCents: 0,
    monthlyTotalCents: 60000,
  }),
});
assert.deepEqual(recurringPdfLines, ["$600.00 per month"]);

const oneTimePdfLines = resolveDirectAgreementInvestmentLines({
  structuredPaymentTerms: mockTerms({
    commercialSource: "proposal",
    sourceProposalNumber: "KXD-P-2026-0001",
    oneTimeTotalCents: 950000,
    monthlyTotalCents: 0,
  }),
});
assert.deepEqual(oneTimePdfLines, ["$9,500.00 prepaid"]);

const sanitized = applyFinalizedDirectAgreementPresentationCopy(
  "No invoice, charge, or payment collection is initiated by this draft record alone.",
  "finalized",
);
assert.match(sanitized, /does not itself constitute payment collection/);
assert.doesNotMatch(sanitized, /draft record/i);

const draftDueTerms =
  "First payment: $600.00 due September 1, 2026. No invoice, charge, or payment collection is initiated by this draft record alone.";
const sanitizedDueTerms = resolveDirectAgreementPaymentSummaryCopy(draftDueTerms, "finalized");
assert.match(sanitizedDueTerms, /does not itself constitute payment collection/);
assert.doesNotMatch(sanitizedDueTerms, /draft record/i);

console.log("verify-agreement-value-presentation: OK");
