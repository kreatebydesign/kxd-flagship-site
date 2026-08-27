/**
 * Offline preview — Direct Agreement sent PDF investment + payment summary copy.
 *   npx tsx scripts/preview-direct-agreement-pdf-investment.ts
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { resolveDirectAgreementInvestmentLines } from "../lib/client-command/commercial/resolve-agreement-amount-kpi";
import {
  applyFinalizedDirectAgreementPresentationCopy,
  composeDirectAgreementDocumentBody,
} from "../lib/commercial-legal/compose-direct-agreement-document";
import { renderDirectAgreementSentPdf } from "../lib/proposal-lifecycle/documents/pdfs";
import type { DirectAgreementTerms } from "../lib/direct-agreement/types";
import type { StructuredPaymentTerms } from "../lib/proposal-lifecycle/types";

const DRAFT_PAYMENT_LINE =
  "No invoice, charge, or payment collection is initiated by this draft record alone.";
const FINALIZED_PAYMENT_LINE =
  "Finalization or execution of this agreement does not itself constitute payment collection; invoices and charges occur according to the billing schedule stated in this agreement.";

function extractPdfText(buffer: Buffer): string | null {
  const outPath = join(process.cwd(), "report-output", "contract-4-investment-preview.pdf");
  try {
    return execFileSync("pdftotext", ["-layout", outPath, "-"], {
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
    });
  } catch {
    return null;
  }
}

async function main() {
  const daTerms: DirectAgreementTerms = {
    schemaVersion: 1,
    commercialStructure: "recurring",
    oneTimeAmountCents: 0,
    monthlyAmountCents: 60000,
    currency: "USD",
    serviceStartDate: "2026-09-01",
    serviceEndDate: null,
    scope: "Digital management",
    includedServices: "Website management",
    exclusions: "Hosting billed separately",
    capacityHoursPerMonth: 4,
    rolloverPolicy: "none",
    revisionAllowance: "Standard",
    overagePreapprovalRule: "Pre-approval required",
    paymentTerms: [
      "Recurring management fee: $600.00 USD per month.",
      "First payment: $600.00 due September 1, 2026.",
      DRAFT_PAYMENT_LINE,
    ].join(" "),
    cancellationRefundLanguage: "Standard cancellation applies.",
    intellectualPropertyLanguage: "Client retains IP.",
    portfolioUseLanguage: "Portfolio use allowed.",
    clientResponsibilities: "Timely approvals.",
    renewalBehavior: "Month-to-month",
    autoRenew: false,
    termsVersion: 1,
    payerLegalName: "de Bois Entertainment",
    brandName: "de Bois Entertainment",
  };

  const recurringTerms: StructuredPaymentTerms = {
    schemaVersion: 1,
    commercialSource: "direct-agreement",
    sourceProposalNumber: "DIRECT-4",
    currency: "USD",
    oneTimeTotalCents: 0,
    monthlyTotalCents: 60000,
    depositCents: 0,
    initialPayment: {
      type: "none",
      amountCents: 0,
      trigger: "at-contract",
      dueTerms: daTerms.paymentTerms,
    },
    installments: [],
    recurring: {
      amountCents: 60000,
      cadence: "monthly",
      startTrigger: "after-launch-verified",
      minimumTermMonths: null,
      renewalBehavior: "none",
      status: "pending-trigger",
    },
    credits: [],
    taxes: { treatment: "unspecified", notes: "" },
    billingContactName: "",
    billingEmail: "",
    payerLegalName: "de Bois Entertainment",
    brandName: "de Bois Entertainment",
    sourceProposalVersion: 1,
    derivedAt: "2026-08-27T00:00:00.000Z",
  };

  const lines = resolveDirectAgreementInvestmentLines({
    structuredPaymentTerms: recurringTerms,
  });
  assert.deepEqual(lines, ["$600.00 per month"]);

  const rawBody = composeDirectAgreementDocumentBody({
    body: [
      "SERVICE INVESTMENT",
      "STANDARD KXD RATE",
      "$1,250 per month",
      "YOUR FRIENDS & FAMILY RATE",
      "$600 per month",
    ].join("\n"),
    terms: daTerms,
  });
  const body = applyFinalizedDirectAgreementPresentationCopy(rawBody, "finalized");
  assert.doesNotMatch(body, /draft record/i);
  assert.match(body, /does not itself constitute payment collection/);

  const rendered = await renderDirectAgreementSentPdf({
    title: "KXD Digital Management & Growth Partnership",
    body,
    contractId: 4,
    terms: recurringTerms,
    termsVersion: 1,
    statusLabel: "Finalized",
    commercialStatus: "finalized",
    clientName: "de Bois Entertainment",
    serviceStartDate: "2026-09-01",
    serviceEndDate: null,
  });

  const outDir = join(process.cwd(), "report-output");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "contract-4-investment-preview.pdf");
  writeFileSync(outPath, rendered.buffer);

  const oneTimeTerms = {
    schemaVersion: 1 as const,
    commercialSource: "proposal" as const,
    sourceProposalNumber: "KXD-P-2026-0001",
    currency: "USD",
    oneTimeTotalCents: 950000,
    monthlyTotalCents: 0,
    depositCents: 950000,
    initialPayment: {
      type: "full" as const,
      amountCents: 950000,
      trigger: "at-contract" as const,
      dueTerms: "Due upon acceptance.",
    },
    installments: [],
    recurring: {
      amountCents: 0,
      cadence: "none" as const,
      startTrigger: "not-applicable" as const,
      minimumTermMonths: null,
      renewalBehavior: "none",
      status: "cancelled" as const,
    },
    credits: [],
    taxes: { treatment: "unspecified", notes: "" },
    billingContactName: "",
    billingEmail: "",
    sourceProposalVersion: 1,
    derivedAt: "2026-08-27T00:00:00.000Z",
  };
  const oneTimeLines = resolveDirectAgreementInvestmentLines({
    structuredPaymentTerms: oneTimeTerms,
  });
  assert.deepEqual(oneTimeLines, ["$9,500.00 prepaid"]);

  const pdfText = extractPdfText(rendered.buffer);
  const checks = pdfText
    ? {
        has600PerMonth: /\$600\.00 per month/i.test(pdfText),
        hasZeroDollar: /\$0\.00/.test(pdfText),
        hasDraftRecord: /draft record/i.test(pdfText),
        hasFinalizedPaymentLine: pdfText.includes(FINALIZED_PAYMENT_LINE),
        has1250: /\$1,250/.test(pdfText),
        hasFriendsFamily: /friends\s*&\s*family/i.test(pdfText),
      }
    : { pdfTextExtraction: "pdftotext unavailable — inspect PDF manually" };

  console.log(
    JSON.stringify(
      {
        investmentLines: lines,
        oneTimeInvestmentLines: oneTimeLines,
        contentHash: rendered.contentHash,
        bytes: rendered.buffer.byteLength,
        outputPath: outPath,
        pdfChecks: checks,
      },
      null,
      2,
    ),
  );

  if (pdfText) {
    assert.ok(checks.has600PerMonth);
    assert.ok(!checks.hasZeroDollar);
    assert.ok(!checks.hasDraftRecord);
    assert.ok(checks.hasFinalizedPaymentLine);
    assert.ok(checks.has1250);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
