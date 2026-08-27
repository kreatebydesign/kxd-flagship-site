/**
 * Offline verification for agreement value presentation + section parsing.
 *   npx tsx scripts/verify-agreement-value-presentation.ts
 */
import assert from "node:assert/strict";
import { parseAgreementDocumentSections } from "../lib/commercial-legal/agreement-document-sections";
import { parsePreferredRatePresentation } from "../lib/commercial-legal/agreement-value-presentation";
import {
  resolveAgreementAmountKpi,
  resolveDirectAgreementInvestmentLines,
} from "../lib/client-command/commercial/resolve-agreement-amount-kpi";
import { applyFinalizedDirectAgreementPresentationCopy } from "../lib/commercial-legal/compose-direct-agreement-document";

const sampleBody = [
  "SERVICE INVESTMENT",
  "",
  "STANDARD KXD RATE",
  "$1,250 per month",
  "",
  "YOUR FRIENDS & FAMILY RATE",
  "$600 per month",
  "",
  "ONGOING CLIENT SAVINGS",
  "$650 per month",
  "",
  "ANNUAL VALUE SUMMARY",
  "Standard annual service value: $15,000 per year",
  "Your annual management rate: $7,200 per year",
  "Annual preferred-rate savings: $7,800 per year",
  "",
  "MONTHLY SERVICE SCOPE",
  "",
  "WEBSITE MANAGEMENT",
  "• Ongoing website content updates",
].join("\n");

const parsed = parsePreferredRatePresentation(sampleBody);
assert.ok(parsed);
assert.equal(parsed?.standardRateAmount, "$1,250 per month");
assert.equal(parsed?.preferredRateAmount, "$600 per month");
assert.match(parsed?.supportingLine ?? "", /7,800/);

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
  structuredPaymentTerms: {
    schemaVersion: 1,
    commercialSource: "direct-agreement",
    sourceProposalNumber: null,
    currency: "USD",
    oneTimeTotalCents: 0,
    monthlyTotalCents: 60000,
    depositCents: 0,
    recurring: { cadence: "monthly", amountCents: 60000 },
    installments: [],
    initialPayment: { dueTerms: "First payment due September 1, 2026." },
    derivedAt: "2026-08-27T00:00:00.000Z",
  },
});
assert.deepEqual(recurringPdfLines, ["$600.00 per month"]);

const oneTimePdfLines = resolveDirectAgreementInvestmentLines({
  structuredPaymentTerms: {
    schemaVersion: 1,
    commercialSource: "proposal",
    sourceProposalNumber: "KXD-P-2026-0001",
    currency: "USD",
    oneTimeTotalCents: 950000,
    monthlyTotalCents: 0,
    depositCents: 0,
    recurring: { cadence: "none", amountCents: 0 },
    installments: [],
    initialPayment: { dueTerms: "" },
    derivedAt: "2026-08-27T00:00:00.000Z",
  },
});
assert.deepEqual(oneTimePdfLines, ["$9,500.00 prepaid"]);

const sanitized = applyFinalizedDirectAgreementPresentationCopy(
  "No invoice, charge, or payment collection is initiated by this draft record alone.",
  "finalized",
);
assert.match(sanitized, /does not itself constitute payment collection/);
assert.doesNotMatch(sanitized, /draft record/i);

console.log("verify-agreement-value-presentation: OK");
