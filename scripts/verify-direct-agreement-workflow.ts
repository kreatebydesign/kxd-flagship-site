/**
 * Focused verification — Direct Agreement workflow (static + pure logic).
 *   npx tsx scripts/verify-direct-agreement-workflow.ts
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  assertOneTimeHasNoRecurring,
  deriveStructuredPaymentTermsFromDirectAgreement,
  validateCreateDirectAgreementInput,
  validateExternalAcceptanceInput,
  validatePaymentAuthorizationInput,
  FORBIDDEN_CARD_FIELD_NAMES,
} from "../lib/direct-agreement";
import {
  getDefaultCommercialDocumentStorageAdapter,
  isCommercialDocumentBlobConfigured,
  isVercelRuntime,
} from "../lib/proposal-lifecycle/documents/storage";
import { deriveStructuredPaymentTerms } from "../lib/proposal-lifecycle/structured-payment-terms";
import { STRIPE_COMMERCIAL_EXECUTION_AUTHORIZED } from "../lib/stripe/integration-readiness-logic";

const root = process.cwd();
let passed = 0;
function ok(label: string) {
  passed += 1;
  console.log(`  ✓ ${label}`);
}

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

console.log("verify:direct-agreement-workflow");

// 1–3 create validation
{
  const bad = validateCreateDirectAgreementInput({
    clientId: 0,
    title: "Campaign Lite",
    contractType: "marketing-retainer",
    body: "Body",
    agreementTerms: {
      commercialStructure: "one-time",
      oneTimeAmountCents: 85000,
      monthlyAmountCents: 0,
      serviceStartDate: "2026-08-04",
      serviceEndDate: "2026-11-04",
      scope: "Campaign support",
      includedServices: "Hours + handout",
      exclusions: "Printing",
      capacityHoursPerMonth: 3,
      rolloverPolicy: "none",
      revisionAllowance: "Two rounds",
      overagePreapprovalRule: "Preapprove overages",
      paymentTerms: "Prepaid",
      cancellationRefundLanguage: "Non-refundable",
      intellectualPropertyLanguage: "IP",
      portfolioUseLanguage: "Portfolio",
      clientResponsibilities: "Provide content",
      renewalBehavior: "Ends unless extended",
      autoRenew: false,
    },
  });
  assert.equal(bad.ok, false);
  ok("1. Direct Agreement creation requires a client");
}

{
  const good = validateCreateDirectAgreementInput({
    clientId: 42,
    title: "Campaign Lite",
    contractType: "marketing-retainer",
    body: "Campaign Lite agreement body",
    agreementTerms: {
      commercialStructure: "one-time",
      oneTimeAmountCents: 85000,
      monthlyAmountCents: 0,
      serviceStartDate: "2026-08-04",
      serviceEndDate: "2026-11-04",
      scope: "Campaign support",
      includedServices: "Up to three hours per month; canvassing handout",
      exclusions: "Printing is not included",
      capacityHoursPerMonth: 3,
      rolloverPolicy: "none",
      revisionAllowance: "Up to two revision rounds",
      overagePreapprovalRule: "Work exceeding three hours must be approved",
      paymentTerms: "$850 prepaid",
      cancellationRefundLanguage: "Non-refundable prepaid term",
      intellectualPropertyLanguage: "Standard IP",
      portfolioUseLanguage: "Portfolio OK",
      clientResponsibilities: "Timely content",
      renewalBehavior: "Ends Nov 4 unless extended in writing",
      autoRenew: false,
    },
  });
  assert.equal(good.ok, true);
  ok("Campaign Lite shape validates");
}

{
  const src = read("lib/direct-agreement/services.ts");
  assert.match(src, /proposalCreated: false/);
  assert.match(src, /agreementSource: "direct-agreement"/);
  assert.doesNotMatch(src, /collection:\s*"proposals"/);
  ok("2–3. No proposal create; source is direct-agreement");
}

// 4 structured payment terms without proposal
{
  const terms = deriveStructuredPaymentTermsFromDirectAgreement(
    {
      schemaVersion: 1,
      commercialStructure: "one-time",
      oneTimeAmountCents: 85000,
      monthlyAmountCents: 0,
      currency: "USD",
      serviceStartDate: "2026-08-04",
      serviceEndDate: "2026-11-04",
      scope: "s",
      includedServices: "i",
      exclusions: "e",
      capacityHoursPerMonth: 3,
      rolloverPolicy: "none",
      revisionAllowance: "2",
      overagePreapprovalRule: "preapprove",
      paymentTerms: "prepaid",
      cancellationRefundLanguage: "c",
      intellectualPropertyLanguage: "ip",
      portfolioUseLanguage: "p",
      clientResponsibilities: "r",
      renewalBehavior: "none",
      autoRenew: false,
      termsVersion: 1,
    },
    99,
  );
  assert.equal(terms.commercialSource, "direct-agreement");
  assert.equal(terms.oneTimeTotalCents, 85000);
  assert.equal(terms.monthlyTotalCents, 0);
  assert.equal(terms.installments.length, 1);
  assert.equal(assertOneTimeHasNoRecurring(terms).ok, true);
  ok("4. Structured payment terms from Direct Agreement");
  ok("6. One-time prepaid does not create recurring billing");
}

// 5 proposal path still derives with commercialSource proposal
{
  // Ensure proposal derive still sets commercialSource
  const fn = read("lib/proposal-lifecycle/structured-payment-terms.ts");
  assert.match(fn, /commercialSource: "proposal"/);
  ok("5. Proposal conversion payment-term path preserved (commercialSource proposal)");
  void deriveStructuredPaymentTerms;
}

// 7 external acceptance
{
  const ext = validateExternalAcceptanceInput({
    acceptedBy: "Robin Cole",
    acceptedAt: "2026-08-05",
    method: "email",
    evidenceNotes: "Approved $850 Campaign Lite by email. Henry will provide card.",
    clientId: 1,
    contractId: 2,
  });
  assert.equal(ext.ok, true);
  if (ext.ok) {
    assert.equal(ext.record.label, "externally-recorded-acceptance");
  }
  const svc = read("lib/direct-agreement/services.ts");
  assert.match(svc, /not an electronic signature/i);
  assert.doesNotMatch(svc, /signatureImage/);
  assert.doesNotMatch(svc, /fake.?ip/i);
  ok("7. External acceptance records evidence without fabricating e-sign data");
}

// 8 mutation lock
{
  const svc = read("lib/direct-agreement/services.ts");
  assert.match(svc, /cannot be silently mutated/i);
  ok("8. Accepted/executed terms mutation guard present");
}

// 9–10 PDF states
{
  const file = read("lib/proposal-lifecycle/documents/file.ts");
  assert.match(file, /generateAndFileDirectAgreementSentSnapshot/);
  assert.match(file, /kind: "direct-agreement"/);
  assert.match(file, /kind: "executed-contract"/);
  assert.match(file, /externalAcceptance/);
  assert.match(file, /if \(input\.canonical && proposalId\)/);
  ok("9–10. Sent and executed PDF paths; Direct Agreement filing without proposal");
}

// 11 proposal package still present
{
  const file = read("lib/proposal-lifecycle/documents/file.ts");
  assert.match(file, /accepted-proposal/);
  assert.match(file, /renderProposalPdf/);
  ok("11. Proposal executed-package filing still present");
}

// 12 client linkage
{
  const file = read("lib/proposal-lifecycle/documents/file.ts");
  assert.match(file, /Commercial documents require an existing client/);
  ok("12. New filing paths require client linkage");
}

// 13–15 storage
{
  delete process.env.VERCEL;
  delete process.env.VERCEL_ENV;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.BLOB_STORE_ID;
  assert.equal(isVercelRuntime(), false);
  assert.equal(isCommercialDocumentBlobConfigured(), false);
  assert.equal(getDefaultCommercialDocumentStorageAdapter().provider, "local");
  ok("13. Local storage selected in development");

  process.env.BLOB_STORE_ID = "store_example";
  assert.equal(isCommercialDocumentBlobConfigured(), true);
  assert.equal(getDefaultCommercialDocumentStorageAdapter().provider, "vercel-blob");
  ok("14. Blob storage selected when configured");
  delete process.env.BLOB_STORE_ID;

  process.env.VERCEL = "1";
  assert.throws(() => getDefaultCommercialDocumentStorageAdapter(), /not configured on Vercel/);
  ok("15. Production cannot silently use ephemeral local storage");
  delete process.env.VERCEL;
}

// 16 download auth
{
  const adminDl = read("app/api/admin/commercial-documents/[id]/download/route.ts");
  assert.match(adminDl, /requirePayloadAdminApi/);
  assert.match(adminDl, /readCommercialDocumentBytes/);
  const clientDl = read("app/api/contract/package/[documentId]/download/route.ts");
  assert.match(clientDl, /completionTokenHash/);
  ok("16. Authenticated download/preview remains protected");
}

// 17 commercial workspace filter (UI links by clientId)
{
  const panel = read(
    "components/admin/operations/client-command/commercial/CommercialWorkspace.tsx",
  );
  assert.match(panel, /Create Direct Agreement/);
  assert.match(panel, /client-command\/\$\{data\.clientId\}/);
  const agreements = read(
    "components/admin/operations/client-command/commercial/CommercialAgreements.tsx",
  );
  assert.match(agreements, /Create Direct Agreement/);
  const sections = read("lib/client-command/commercial/sections.ts");
  assert.match(sections, /commercial\/agreements/);
  ok("17. Commercial workspace surfaces are client-scoped");
}

// 18 no raw card fields
{
  for (const name of FORBIDDEN_CARD_FIELD_NAMES) {
    const hit = [
      "lib/direct-agreement/types.ts",
      "lib/direct-agreement/services.ts",
      "lib/direct-agreement/validate.ts",
    ].some((f) => {
      const src = read(f);
      return new RegExp(`\\b${name}\\b\\s*:`).test(src);
    });
    assert.equal(hit, false, `forbidden field ${name}`);
  }
  const auth = validatePaymentAuthorizationInput({
    authorizationType: "card-charge-authorization",
    authorizedBy: "Henry Cole",
    authorizationMethod: "email",
    authorizedAt: "2026-08-06",
    scope: "Campaign Lite $850",
    amountAuthorizedCents: 85000,
    evidenceNotes: "Card to be provided; no PAN stored",
    cardBrand: "visa",
    cardLast4: "4242",
    cardNumber: "4242424242424242",
  } as never);
  assert.equal(auth.ok, false);
  ok("18. No raw card fields; sensitive payload rejected");
}

// 19 permissions — routes use requirePayloadAdminApi
{
  const createRoute = read("app/api/admin/sales/contracts/direct-agreement/route.ts");
  const lifeRoute = read("app/api/admin/sales/contracts/[id]/lifecycle/route.ts");
  assert.match(createRoute, /requirePayloadAdminApi/);
  assert.match(lifeRoute, /requirePayloadAdminApi/);
  ok("19. Operator permissions enforced on Direct Agreement routes");
}

// 20 no live stripe charge
{
  assert.equal(STRIPE_COMMERCIAL_EXECUTION_AUTHORIZED, false);
  const svc = read("lib/direct-agreement/services.ts");
  assert.doesNotMatch(svc, /paymentIntents\.create/);
  assert.doesNotMatch(svc, /charges\.create/);
  ok("20. No live Stripe charge path enabled");
}

// migration + collection presence
{
  assert.equal(
    existsSync(join(root, "migrations/20260817_direct_agreement_workflow.ts")),
    true,
  );
  const index = read("migrations/index.ts");
  assert.match(index, /20260817_direct_agreement_workflow/);
  const contracts = read("payload/collections/Contracts.ts");
  assert.match(contracts, /agreementSource/);
  assert.match(contracts, /directAgreementTerms/);
  const docs = read("payload/collections/CommercialDocuments.ts");
  assert.match(docs, /storageProvider/);
  assert.match(docs, /direct-agreement/);
  ok("Migration registered and schema fields present");
}

console.log(`\nPassed ${passed} checks.`);
