/**
 * Proposal Builder verification — money, snapshots, lifecycle, tokens, idempotency.
 * Run: npx tsx scripts/verify-proposal-builder.ts
 * Does not send email, touch Stripe, or mutate production.
 */

import {
  assertNoInternalLeakage,
  buildCanonicalProposal,
} from "../lib/proposal-builder/canonicalize.ts";
import { mapAcceptedProposalToContractDraft } from "../lib/proposal-builder/contract-draft.ts";
import {
  buildTemplateDocument,
  cloneDocumentFromTemplate,
  emptyProposalDocument,
  newId,
} from "../lib/proposal-builder/document.ts";
import {
  buildProposalPdfFilename,
  buildProposalPdfFilenameExternal,
  proposalDateStamp,
} from "../lib/proposal-builder/filename.ts";
import {
  canTransitionContract,
  canTransitionProposal,
  isEditableProposalStatus,
} from "../lib/proposal-builder/lifecycle.ts";
import {
  addCents,
  dollarsToCents,
  formatCents,
  percentOfCents,
} from "../lib/proposal-builder/money.ts";
import { calculateProposalTotals } from "../lib/proposal-builder/pricing.ts";
import {
  createShareLinkRecord,
  findActiveShareLink,
  hashShareToken,
} from "../lib/proposal-builder/share.ts";

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
}

function main() {
  console.log("\nProposal Builder verification\n");

  // Money
  check("dollarsToCents 10.25 → 1025", dollarsToCents("10.25") === 1025);
  check("dollarsToCents avoids float drift on 0.1+0.2 style", dollarsToCents("0.30") === 30);
  check("addCents precise", addCents(10, 20, 30) === 60);
  check("percentOfCents 10% of 10000", percentOfCents(10000, 10) === 1000);
  check("formatCents", formatCents(12345) === "$123.45");

  // Template clone isolation
  const tmpl = buildTemplateDocument("combined-project-retainer");
  const cloned = cloneDocumentFromTemplate(tmpl);
  cloned.executive.executiveSummary = "CHANGED";
  check("template clone does not mutate source", tmpl.executive.executiveSummary !== "CHANGED");
  check("clone regenerates ids", cloned.scopeGroups[0]?.id !== tmpl.scopeGroups[0]?.id);

  // Pricing with credits / optional
  const doc = emptyProposalDocument({
    pricingLines: [
      {
        id: "a",
        title: "Site A",
        cadence: "one-time",
        quantity: 1,
        unitPriceCents: 500000,
        inclusion: "included",
        sortOrder: 1,
      },
      {
        id: "b",
        title: "Site B",
        cadence: "one-time",
        quantity: 1,
        unitPriceCents: 400000,
        inclusion: "included",
        sortOrder: 2,
      },
      {
        id: "m",
        title: "Management",
        cadence: "monthly",
        quantity: 1,
        unitPriceCents: 75000,
        inclusion: "optional",
        isAddon: true,
        sortOrder: 3,
      },
    ],
    credits: [
      {
        id: "c1",
        kind: "sponsorship",
        label: "Sponsorship credit",
        amountCents: 100000,
        appliesTo: "one-time",
      },
    ],
    options: { mode: "base-plus-addons", clientCanSelect: true, packages: [] },
    depositCents: 200000,
    paymentSchedule: [
      {
        id: "p1",
        label: "Due at contract",
        amountCents: 300000,
        due: "at-contract",
        sortOrder: 1,
      },
    ],
  });

  const baseTotals = calculateProposalTotals(doc);
  check("one-time after credit", baseTotals.oneTimeTotalCents === 800000);
  check("monthly without optional", baseTotals.monthlyTotalCents === 0);
  check("optional monthly tracked", baseTotals.optionalMonthlyCents === 75000);

  const withOptional = calculateProposalTotals(doc, { selectedLineIds: ["m"] });
  check("optional selection adds monthly", withOptional.monthlyTotalCents === 75000);

  // Canonical strips internal
  const canonical = buildCanonicalProposal({
    id: 99,
    proposalNumber: "KXD-P-2026-0001",
    title: "Combined websites",
    status: "draft",
    acceptanceMode: "accept-and-proceed-to-contract",
    proposalDate: "2026-07-30T12:00:00.000Z",
    expiresAt: "2026-08-30T12:00:00.000Z",
    revisionNumber: 2,
    builderDocument: {
      ...doc,
      organizations: [{ id: newId("org"), name: "Example Org" }],
      executive: { executiveSummary: "Summary" },
      internal: { internalNotes: "SECRET MARGIN", marginNotes: "do not leak" },
    },
  });
  const leakIssues = assertNoInternalLeakage(canonical);
  check("canonical has no internal leakage flags", leakIssues.length === 0);
  check(
    "canonical JSON excludes internal notes text",
    !JSON.stringify(canonical).includes("SECRET MARGIN"),
  );

  // Filenames / local dates
  const stamp = proposalDateStamp("2026-07-30T23:30:00.000-07:00");
  check("local date stamp uses calendar day", stamp === "2026-07-30");
  check(
    "external filename stable",
    buildProposalPdfFilenameExternal(canonical).startsWith("KXD-Proposal-kxd-p-2026-0001"),
  );
  check(
    "internal-style filename",
    buildProposalPdfFilename(canonical).includes("example-org"),
  );

  // Share tokens
  const { record, rawToken } = createShareLinkRecord({ version: 1 });
  check("token hashed", record.tokenHash === hashShareToken(rawToken));
  check("active link found", Boolean(findActiveShareLink([record], rawToken)));
  const revoked = { ...record, revokedAt: new Date().toISOString() };
  check("revoked fails closed", findActiveShareLink([revoked], rawToken) === null);

  // Lifecycle allowlists
  check("draft → approved-for-sharing", canTransitionProposal("draft", "approved-for-sharing"));
  check("sent → accepted-contract-pending", canTransitionProposal("sent", "accepted-contract-pending"));
  check("blocks accepted → sent", !canTransitionProposal("accepted-contract-pending", "sent"));
  check("editable draft", isEditableProposalStatus("draft"));
  check("not editable when accepted", !isEditableProposalStatus("accepted-contract-pending"));
  check("contract draft → internal-review", canTransitionContract("draft", "internal-review"));
  check(
    "contract cannot jump draft → executed",
    !canTransitionContract("draft", "executed"),
  );

  // Contract mapping
  const accepted = { ...canonical, status: "accepted-contract-pending" as const };
  const contract = mapAcceptedProposalToContractDraft(accepted);
  check("contract starts draft", contract.status === "draft");
  check("contract references proposal number", contract.proposalNumber === canonical.proposalNumber);
  check("contract marked draft notice", contract.legal.draftNotice.includes("NOT attorney-approved") || contract.legal.draftNotice.includes("DRAFT"));
  check(
    "contract termAndTermination uses canonical cancellation/refund standard",
    Boolean(contract.legal.termAndTermination?.includes("Client cancellation.")) &&
      Boolean(contract.legal.termAndTermination?.includes("Non-refundable fees.")),
  );

  // Idempotency markers (hash uniqueness)
  const h1 = hashShareToken("token-a");
  const h2 = hashShareToken("token-a");
  check("hash deterministic", h1 === h2);

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
