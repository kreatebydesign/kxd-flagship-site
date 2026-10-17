/**
 * Operator agreement review preview — wiring + parity with client-facing sanitizer.
 *   npx tsx scripts/verify-agreement-operator-preview.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { toClientFacingContractBody } from "../lib/proposal-lifecycle/client-facing-contract.ts";
import { resolveClientFacingAgreementBody } from "../lib/proposal-lifecycle/resolve-client-facing-agreement-body.ts";
import { isSectionHeading } from "../components/agreement/AgreementDocumentBody.tsx";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

let passed = 0;
function ok(label: string) {
  passed += 1;
  console.log(`  ✓ ${label}`);
}

const sample =
  "DRAFT FOR INTERNAL REVIEW\n\nPARTIES\nClient: Example\n\nSCOPE\n• One item";

const sanitized = toClientFacingContractBody(sample);
assert.match(sanitized, /PARTIES/);
assert.doesNotMatch(sanitized, /DRAFT FOR INTERNAL REVIEW/);
ok("toClientFacingContractBody strips internal banners");

const resolved = resolveClientFacingAgreementBody(
  { body: sample, agreementSource: "proposal", directAgreementTerms: null },
  { commercialStatus: "draft", commercialSource: null },
);
assert.equal(resolved, sanitized);
ok("resolveClientFacingAgreementBody matches sanitizer for proposal-linked contracts");

assert.equal(isSectionHeading("PARTIES"), true);
assert.equal(isSectionHeading("Not a heading."), false);
ok("AgreementDocumentBody heading detection");

const page = read(
  "app/admin/operations/client-command/[clientId]/commercial/agreements/[contractId]/page.tsx",
);
assert.match(page, /resolveClientFacingAgreementBody/);
assert.match(page, /clientFacingAgreementBody/);
ok("Agreement detail page resolves client-facing body server-side");

const detail = read(
  "components/admin/operations/client-command/commercial/CommercialAgreementDetail.tsx",
);
assert.match(detail, /Review Agreement/);
assert.match(detail, /#review-agreement/);
assert.match(detail, /CommercialAgreementReviewSection/);
ok("Agreement detail exposes Review Agreement action and section");

const review = read(
  "components/admin/operations/client-command/commercial/CommercialAgreementReviewSection.tsx",
);
assert.match(review, /AgreementDocumentBody/);
assert.match(review, /variant="workspace"/);
assert.doesNotMatch(review, /signingToken/);
ok("Review section renders full document without signing metadata");

const signing = read("app/contract/[publicToken]/page.tsx");
assert.match(signing, /resolveClientFacingAgreementBody/);
ok("Public signing page uses shared client-facing resolver");

console.log(`\nPassed ${passed} checks.`);
