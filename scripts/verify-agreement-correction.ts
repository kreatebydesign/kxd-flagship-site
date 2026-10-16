/**
 * Agreement correction + signing hash checks (no DB).
 *   npx tsx scripts/verify-agreement-correction.ts
 */
import { buildCanonicalProposal } from "../lib/proposal-builder/canonicalize.ts";
import { normalizeProposalDocument } from "../lib/proposal-builder/document.ts";
import { mapAcceptedProposalToContractDraft } from "../lib/proposal-builder/contract-draft.ts";
import { dollarsToCents } from "../lib/proposal-builder/money.ts";
import {
  containsInternalDraftBanner,
  toClientFacingContractBody,
} from "../lib/proposal-lifecycle/client-facing-contract.ts";
import {
  computeDocumentHash,
  hashPaymentTerms,
  invalidateSignaturesOnMaterialEdit,
} from "../lib/proposal-lifecycle/executed-seal.ts";
import { emptyLifecyclePackage, normalizeLifecyclePackage } from "../lib/proposal-lifecycle/package.ts";
import { deriveStructuredPaymentTerms } from "../lib/proposal-lifecycle/structured-payment-terms.ts";
import { stableJsonHash } from "../lib/proposal-lifecycle/hash.ts";

let passed = 0;
let failed = 0;
function check(label: string, ok: boolean) {
  if (ok) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
}

const PROJECT = dollarsToCents("7000");
const CREDIT = dollarsToCents("5500");
const HALF = dollarsToCents("3500");

const doc = normalizeProposalDocument({
  organizations: [{ id: "org1", name: "Rethwill Chiropractic", isPrimary: true }],
  contacts: [
    {
      id: "c1",
      name: "Dr. Kurt Rethwill, D.C.",
      title: "Doctor of Chiropractic",
      phone: "(541) 672-8984",
      isPrimary: true,
    },
  ],
  scopeGroups: [
    {
      id: "s1",
      title: "01 - Discovery",
      estimatedTimeline: "Weeks 1-2 of the project window",
      deliverables: [{ id: "d1", title: "Kickoff", sortOrder: 1 }],
    },
  ],
  lineItems: [
    {
      id: "line_1",
      label: "Website project",
      amountCents: PROJECT,
      cadence: "one-time",
      inclusion: "included",
    },
  ],
  credits: [
    {
      id: "cr1",
      kind: "discount",
      label: "Preferred Referral Courtesy",
      amountCents: CREDIT,
      appliesTo: "one-time",
    },
  ],
  paymentSchedule: [
    {
      id: "p1",
      label: "50% project initiation",
      amountCents: HALF,
      due: "at-contract",
      sortOrder: 1,
    },
    {
      id: "p2",
      label: "50% upon approved completion before launch",
      amountCents: HALF,
      due: "remaining",
      sortOrder: 2,
    },
  ],
  terms: {
    timelineAssumptions:
      "Estimated 6-8 week project window following kickoff.\n\nPhases: discovery; design; development; launch.",
    exclusions: "Excluded: custom EHR.",
    changeRequestLanguage: "Two revision rounds included.",
    clientResponsibilities: "Timely feedback.",
    paymentAssumptions: "Total $7,000.",
  },
  options: { mode: "recommended-package", clientCanSelect: false, packages: [] },
});

const canonical = buildCanonicalProposal(
  {
    id: 8,
    proposalNumber: "KXD-P-2026-0008",
    title: "Digital Experience & Website Transformation",
    status: "accepted-contract-pending",
    proposalDate: "2026-10-01",
    expiresAt: "2026-10-29",
    revisionNumber: 1,
    builderDocument: doc,
  },
  {},
);

const accepted = { ...canonical, status: "accepted-contract-pending" as const };
const draft = mapAcceptedProposalToContractDraft(accepted);
const clientFacing = toClientFacingContractBody(draft.body);

console.log("\nAgreement correction verification\n");

check("courtesy credit preserved", draft.creditsSummary.includes("5,500"));
check(
  "client-facing shows $3,500 initial payment",
  clientFacing.includes("Initial payment due upon execution of this Agreement: $3,500.00"),
);
check("client-facing omits Deposit: $0.00", !clientFacing.includes("Deposit: $0.00"));
check(
  "client-facing includes timeline assumptions",
  clientFacing.includes("Estimated 6-8 week project window"),
);
check(
  "client-facing proposal reference is professional",
  clientFacing.includes("incorporates the commercial terms of Proposal KXD-P-2026-0008"),
);
check(
  "no internal draft snapshot reference",
  !clientFacing.includes("accepted snapshot controls commercial intent"),
);
check("legal section uses human heading", clientFacing.includes("TERM AND TERMINATION"));
check("no camelCase legal keys in body", !clientFacing.includes("termAndTermination:"));
check("tax disclosure present", clientFacing.includes("TAXES"));
check("sanitized body has no internal banner", !containsInternalDraftBanner(clientFacing));

const terms = deriveStructuredPaymentTerms(accepted, "test-hash", null);
check(
  "structured installments sum to $7,000",
  terms.installments.reduce((s, i) => s + i.amountCents, 0) === PROJECT,
);
check("initial installment $3,500", terms.installments[0]?.amountCents === HALF);

const acceptanceHash = stableJsonHash(accepted);
const hashA = computeDocumentHash({
  contractId: 6,
  contractBody: clientFacing,
  acceptedSnapshotHash: acceptanceHash,
  paymentTermsHash: hashPaymentTerms(terms),
  version: 1,
});
const hashB = computeDocumentHash({
  contractId: 6,
  contractBody: clientFacing + "\n",
  acceptedSnapshotHash: acceptanceHash,
  paymentTermsHash: hashPaymentTerms(terms),
  version: 1,
});
check("document hash changes when body changes", hashA !== hashB);

let pkg = normalizeLifecyclePackage(emptyLifecyclePackage());
pkg = {
  ...pkg,
  operatorSignature: {
    legalName: "Matt Lunger",
    title: "Principal",
    entityName: "Kreate by Design",
    email: "matt@example.com",
    typedAcknowledgment: "Matt Lunger",
    authorityConfirmed: true,
    electronicRecordsConsent: true,
    actorRole: "kxd-operator",
    signedAt: new Date().toISOString(),
    documentHash: hashA,
    signatureHash: "sig",
    consentText: "consent",
    consentDisclosureVersion: "v1",
  },
};
const cleared = invalidateSignaturesOnMaterialEdit(pkg);
check("material edit clears operator signature", cleared.operatorSignature == null);

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
