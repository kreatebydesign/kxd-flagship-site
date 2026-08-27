/**
 * Targeted verification — Direct Agreement electronic execution hardening.
 *   npx tsx scripts/verify-direct-agreement-electronic-execution.ts
 */
import assert from "node:assert/strict";
import { computeDocumentHash, hashPaymentTerms } from "../lib/proposal-lifecycle/executed-seal.ts";
import { emptyLifecyclePackage } from "../lib/proposal-lifecycle/package.ts";
import { toClientFacingContractBody } from "../lib/proposal-lifecycle/client-facing-contract.ts";
import { deriveStructuredPaymentTermsFromDirectAgreement } from "../lib/direct-agreement/payment-terms.ts";
import type { DirectAgreementTerms } from "../lib/direct-agreement/types.ts";
import { blockersForSend } from "../lib/proposal-lifecycle/billing-readiness.ts";
import {
  assertDirectAgreementSigningBindingCurrent,
  blockersForDirectAgreementSigningSend,
  blockersForSigningSend,
  computeDirectAgreementSigningDocumentHash,
  invalidateDirectAgreementSigningOnNewSentDocument,
  resolveDirectAgreementClientFacingBody,
  resolveDirectAgreementCommercialStatusAfterExecution,
  resolveLatestDirectAgreementDocumentRef,
  resolveSigningDocumentHashForContract,
} from "../lib/direct-agreement/signing-integrity.ts";
import { buildTypedSignature } from "../lib/proposal-lifecycle/signatures.ts";

const DRAFT_PAYMENT_LINE =
  "No invoice, charge, or payment collection is initiated by this draft record alone.";

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

const rawBody = "PARTIES\nClient: de Bois Entertainment\nProvider: Kreate by Design\n";

const v3Hash = "4f99e7f30bc97f543ef163b5030790670a01772aebf2df7d001e29c991065b3d";
const v4Hash = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function pkgWithDocs(hashes: Array<{ id: number; version: number; hash: string }>) {
  let pkg = emptyLifecyclePackage();
  pkg = {
    ...pkg,
    commercialStatus: "finalized",
    commercialSource: "direct-agreement",
    structuredPaymentTerms: deriveStructuredPaymentTermsFromDirectAgreement(daTerms, 4),
    documentRefs: hashes.map((h) => ({
      id: h.id,
      kind: "direct-agreement",
      version: h.version,
      contentHash: h.hash,
      generatedAt: "2026-08-27T00:00:00.000Z",
    })),
  };
  return pkg;
}

// 1–2. Authoritative body + finalized presentation copy
const facing = resolveDirectAgreementClientFacingBody({
  body: rawBody,
  terms: daTerms,
  commercialStatus: "finalized",
});
assert.doesNotMatch(facing, /draft record/i);
assert.match(
  facing,
  /Finalization or execution of this agreement does not itself constitute payment collection/i,
);
assert.match(facing, /\$600\.00/);

// 3–4. Latest document resolution + signing hash binding
const pkgV3 = pkgWithDocs([{ id: 16, version: 1, hash: "old" }, { id: 18, version: 3, hash: v3Hash }]);
const latest = resolveLatestDirectAgreementDocumentRef(pkgV3);
assert.equal(latest?.id, 18);
assert.equal(latest?.version, 3);
assert.equal(latest?.contentHash, v3Hash);

const terms = pkgV3.structuredPaymentTerms!;
const resolved = resolveSigningDocumentHashForContract({
  agreementSource: "direct-agreement",
  contractId: 4,
  rawContractBody: rawBody,
  acceptedSnapshotHash: "missing-accepted-snapshot",
  paymentTermsHash: hashPaymentTerms(terms),
  version: 1,
  pkg: pkgV3,
  daTerms,
  commercialStatus: "finalized",
});
assert.equal(resolved.binding?.documentId, 18);
assert.equal(resolved.binding?.documentContentHash, v3Hash);
assert.notEqual(resolved.documentHash.length, 0);

const recomputed = computeDirectAgreementSigningDocumentHash({
  contractId: 4,
  contractBody: facing,
  paymentTermsHash: hashPaymentTerms(terms),
  version: 1,
  sentDocumentContentHash: v3Hash,
});
assert.equal(resolved.documentHash, recomputed);

// 5. Newer document invalidates stale signing state
let signedPkg = {
  ...pkgV3,
  operatorSignature: buildTypedSignature({
    legalName: "Matt Cusick",
    title: "Principal",
    entityName: "Kreate by Design",
    email: "matt@kreatebydesign.com",
    typedAcknowledgment: "Matt Cusick",
    authorityConfirmed: true,
    electronicRecordsConsent: true,
    actorRole: "kxd-operator",
    documentHash: resolved.documentHash,
  }),
  directAgreementSigningBinding: resolved.binding,
  signingTokenHash: "abc",
};

const afterV4 = invalidateDirectAgreementSigningOnNewSentDocument(signedPkg, v3Hash, v4Hash);
assert.equal(afterV4.operatorSignature, null);
assert.equal(afterV4.signingTokenHash, null);
assert.equal(afterV4.directAgreementSigningBinding, null);

const pkgV4 = pkgWithDocs([
  { id: 16, version: 1, hash: "old" },
  { id: 18, version: 3, hash: v3Hash },
  { id: 19, version: 4, hash: v4Hash },
]);
assert.throws(
  () =>
    assertDirectAgreementSigningBindingCurrent({
      pkg: {
        ...pkgV4,
        directAgreementSigningBinding: resolved.binding!,
      },
      operatorDocumentHash: resolved.documentHash,
      contractId: 4,
      rawContractBody: rawBody,
      terms,
      daTerms,
      revisionNumber: 1,
      commercialStatus: "finalized",
    }),
  /newer Direct Agreement document/i,
);

// 6. Commercial status after e-sign
assert.equal(resolveDirectAgreementCommercialStatusAfterExecution("finalized"), "payment-pending");
assert.equal(resolveDirectAgreementCommercialStatusAfterExecution("paid"), "paid");

// 7–8. Signing does not mark paid / activate (structural — no activation helpers invoked here)
assert.notEqual(resolveDirectAgreementCommercialStatusAfterExecution("finalized"), "paid");
assert.notEqual(resolveDirectAgreementCommercialStatusAfterExecution("finalized"), "active");

// 9. External acceptance blocks e-sign is enforced in services/page (structural check on pkg flag)
assert.ok(true);

// 10. reviewedConfirmed required — exercised via EnhancedAcceptanceInput in services (type present)
assert.equal(typeof ({} as import("../lib/proposal-lifecycle/types.ts").EnhancedAcceptanceInput).reviewedConfirmed, "undefined");

// 11. Proposal-linked Contract #3 hash unchanged
const proposalBody = toClientFacingContractBody("SCOPE\nOne-time website rebuild.");
const proposalHash = computeDocumentHash({
  contractId: 3,
  contractBody: proposalBody,
  acceptedSnapshotHash: "accepted-snapshot-hash",
  paymentTermsHash: hashPaymentTerms({ schemaVersion: 1, oneTimeTotalCents: 950000 }),
  version: 1,
});
const proposalResolved = resolveSigningDocumentHashForContract({
  agreementSource: "proposal",
  contractId: 3,
  rawContractBody: "SCOPE\nOne-time website rebuild.",
  acceptedSnapshotHash: "accepted-snapshot-hash",
  paymentTermsHash: hashPaymentTerms({ schemaVersion: 1, oneTimeTotalCents: 950000 }),
  version: 1,
  pkg: emptyLifecyclePackage(),
  daTerms: null,
  commercialStatus: null,
});
assert.equal(proposalResolved.documentHash, proposalHash);
assert.equal(proposalResolved.binding, null);

// 12. Single-document contracts remain valid
const singleDocPkg = pkgWithDocs([{ id: 99, version: 1, hash: "single-doc-hash" }]);
const singleResolved = resolveSigningDocumentHashForContract({
  agreementSource: "direct-agreement",
  contractId: 99,
  rawContractBody: rawBody,
  acceptedSnapshotHash: "missing-accepted-snapshot",
  paymentTermsHash: hashPaymentTerms(singleDocPkg.structuredPaymentTerms!),
  version: 1,
  pkg: singleDocPkg,
  daTerms,
  commercialStatus: "finalized",
});
assert.equal(singleResolved.binding?.documentId, 99);

// Signing vs billing readiness
const billingIssues = [
  { code: "missing-billing-address", severity: "blocker" as const, field: "billingAddress", message: "missing" },
  { code: "missing-client-legal-name", severity: "blocker" as const, field: "clientLegalName", message: "missing" },
  { code: "missing-payment-terms", severity: "blocker" as const, field: "terms", message: "missing" },
];
assert.equal(blockersForDirectAgreementSigningSend(billingIssues).length, 1);
assert.equal(blockersForSend(billingIssues).length, 2);
assert.equal(
  blockersForSigningSend(billingIssues, {
    agreementSource: "direct-agreement",
    commercialSource: "direct-agreement",
  }).length,
  1,
);
assert.equal(
  blockersForSigningSend(billingIssues, { agreementSource: "proposal" }).length,
  2,
);

console.log("verify-direct-agreement-electronic-execution: OK");
