/**
 * Focused verification — Direct Agreement courtesy branded restatement.
 *   npm run verify:direct-agreement-restatement
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  canGenerateCourtesyBrandedRestatement,
  deriveCourtesyRestatementPaymentPresentation,
  formatExternalAcceptanceMethodLabel,
} from "../lib/direct-agreement/restatement.ts";

const root = process.cwd();
let passed = 0;
function ok(label: string) {
  passed += 1;
  console.log(`  ✓ ${label}`);
}
function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

console.log("verify:direct-agreement-restatement");

{
  assert.equal(
    canGenerateCourtesyBrandedRestatement({
      agreementSource: "direct-agreement",
      commercialStatus: "active",
      hasExternalAcceptance: true,
      hasExecutedCertificate: true,
    }),
    true,
  );
  assert.equal(
    canGenerateCourtesyBrandedRestatement({
      agreementSource: "direct-agreement",
      commercialStatus: "paid",
      hasExternalAcceptance: true,
      hasExecutedCertificate: true,
    }),
    true,
  );
  assert.equal(
    canGenerateCourtesyBrandedRestatement({
      agreementSource: "direct-agreement",
      commercialStatus: "payment-pending",
      hasExternalAcceptance: true,
      hasExecutedCertificate: true,
    }),
    false,
  );
  assert.equal(
    canGenerateCourtesyBrandedRestatement({
      agreementSource: "proposal",
      commercialStatus: "active",
      hasExternalAcceptance: true,
      hasExecutedCertificate: true,
    }),
    false,
  );
  ok("Eligibility: executed paid/active DA only");
}

{
  const paid = deriveCourtesyRestatementPaymentPresentation({
    commercialStatus: "active",
    paymentReferences: {
      paymentStatus: "paid",
      amountCents: 85000,
      paidAt: "2026-08-05",
    },
    oneTimeAmountCents: 85000,
  });
  assert.equal(paid.collected, true);
  assert.equal(paid.collectedAmountCents, 85000);
  assert.equal(paid.balanceDueCents, 0);
  const pending = deriveCourtesyRestatementPaymentPresentation({
    commercialStatus: "payment-pending",
    paymentReferences: null,
    oneTimeAmountCents: 85000,
  });
  assert.equal(pending.collected, false);
  assert.equal(pending.balanceDueCents, 85000);
  ok("Payment presentation comes from commercial state, not paymentTerms rewrite");
}

{
  assert.equal(formatExternalAcceptanceMethodLabel("email"), "email");
  ok("Email acceptance method label is client-facing");
}

{
  const pdfs = read("lib/proposal-lifecycle/documents/pdfs.tsx");
  const start = pdfs.indexOf("export async function renderDirectAgreementCourtesyRestatementPdf");
  const end = pdfs.indexOf("export async function renderExternalAcceptanceExecutedPdf");
  assert.ok(start > 0 && end > start);
  const fn = pdfs.slice(start, end);
  assert.match(fn, /resolveKxdReportLogoAsset/);
  assert.match(fn, /<Image /);
  assert.match(fn, /Courtesy restatement/);
  assert.match(fn, /already executed agreement/);
  assert.match(fn, /not a new offer/);
  assert.match(fn, /No new signature or acceptance is required/);
  assert.match(fn, /Prepaid amount collected/);
  assert.match(fn, /Balance due/);
  assert.doesNotMatch(fn, /not executed until/);
  assert.doesNotMatch(fn, /Commercial source: direct-agreement/);
  assert.doesNotMatch(fn, /No proposal record/);
  assert.doesNotMatch(fn, /renderCertificatePdf/);
  ok("Restatement PDF is branded, executed, and does not request new acceptance");
}

{
  const billing = read("lib/proposal-lifecycle/documents/pdfs.tsx");
  const start = billing.indexOf("export async function renderBillingSummaryPdf");
  const fn = billing.slice(start, start + 800);
  assert.match(fn, /const testMode = input\.testMode === true/);
  assert.doesNotMatch(fn, /testMode !== false/);
  ok("Billing summary TEST MODE is opt-in only");
}

{
  const file = read("lib/proposal-lifecycle/documents/file.ts");
  assert.match(file, /generateAndFileCourtesyBrandedRestatement/);
  assert.match(file, /courtesy-restatement:/);
  assert.match(file, /lineageParentId/);
  assert.doesNotMatch(
    file.slice(
      file.indexOf("export async function generateAndFileCourtesyBrandedRestatement"),
      file.indexOf("export async function generateAndFileExecutedPackage"),
    ),
    /renderCertificatePdf/,
  );
  ok("Filing uses lineage and does not generate a certificate");
}

{
  const svc = read("lib/direct-agreement/services.ts");
  const start = svc.indexOf("export async function generateCourtesyBrandedRestatement");
  const fn = svc.slice(start);
  assert.match(fn, /commercialStatus: before\.commercialStatus/);
  assert.match(fn, /externalAcceptance: before\.externalAcceptance/);
  assert.match(fn, /executedCertificate: before\.executedCertificate/);
  assert.match(fn, /paymentReferences: before\.paymentReferences/);
  assert.doesNotMatch(fn, /recordExternalAcceptance\(/);
  assert.doesNotMatch(fn, /recordExternalPayment\(/);
  assert.doesNotMatch(fn, /activateDirectAgreementService\(/);
  ok("Service restores acceptance, payment, and certificate; does not re-run those paths");
}

{
  const route = read("app/api/admin/sales/contracts/[id]/lifecycle/route.ts");
  assert.match(route, /generate-courtesy-branded-restatement/);
  assert.match(route, /noCertificateGenerated: true/);
  const detail = read(
    "components/admin/operations/client-command/commercial/CommercialAgreementDetail.tsx",
  );
  assert.match(detail, /GenerateBrandedRestatementAction/);
  const actions = read("components/admin/sales/ContractLifecycleActions.tsx");
  assert.match(actions, /Generate Branded Restatement/);
  ok("Operator action is wired on agreement detail + lifecycle controls");
}

console.log(`\nPassed ${passed} checks.`);
