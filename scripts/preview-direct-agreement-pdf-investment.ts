/**
 * Offline preview — Direct Agreement sent PDF investment block (no DB writes).
 *   npx tsx scripts/preview-direct-agreement-pdf-investment.ts
 */
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { resolveDirectAgreementInvestmentLines } from "../lib/client-command/commercial/resolve-agreement-amount-kpi";
import { applyFinalizedDirectAgreementPresentationCopy } from "../lib/commercial-legal/compose-direct-agreement-document";
import { renderDirectAgreementSentPdf } from "../lib/proposal-lifecycle/documents/pdfs";

async function main() {
  const recurringTerms = {
    schemaVersion: 1 as const,
    commercialSource: "direct-agreement" as const,
    sourceProposalNumber: null,
    currency: "USD",
    oneTimeTotalCents: 0,
    monthlyTotalCents: 60000,
    depositCents: 0,
    recurring: { cadence: "monthly" as const, amountCents: 60000 },
    installments: [],
    initialPayment: { dueTerms: "First payment: $600 due September 1, 2026." },
    derivedAt: new Date().toISOString(),
    payerLegalName: "de Bois Entertainment",
    brandName: "de Bois Entertainment",
  };

  const lines = resolveDirectAgreementInvestmentLines({
    structuredPaymentTerms: recurringTerms,
  });
  assert.deepEqual(lines, ["$600.00 per month"]);

  const body = applyFinalizedDirectAgreementPresentationCopy(
    [
      "SERVICE INVESTMENT",
      "STANDARD KXD RATE",
      "$1,250 per month",
      "YOUR FRIENDS & FAMILY RATE",
      "$600 per month",
      "Payment terms",
      "No invoice, charge, or payment collection is initiated by this draft record alone.",
    ].join("\n"),
    "finalized",
  );
  assert.doesNotMatch(body, /draft record/i);

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

  console.log(
    JSON.stringify(
      {
        investmentLines: lines,
        contentHash: rendered.contentHash,
        bytes: rendered.buffer.byteLength,
        outputPath: outPath,
        draftRecordRemovedFromBody: !body.includes("draft record"),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
