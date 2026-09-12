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
  formatCoverPreparedForLine,
  shouldShowRecurringInvestment,
  distinctScopeOrganizationName,
  composeCoverPresentation,
  composeInvestmentPresentation,
  composeOpeningSections,
  softenClientFacingDepositLanguage,
  isFullUpfrontProposal,
} from "../lib/proposal-builder/presentation.ts";
import { renderProposalPlainText } from "../lib/proposal-builder/export-plaintext.ts";
import {
  DEFAULT_ACCEPTANCE_DISCLOSURE,
  DEFAULT_CONTRACT_REQUIRED_DISCLOSURE,
} from "../lib/proposal-builder/types.ts";
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
  check(
    "full upfront softener removes deposit wording",
    !/\bdeposit\b/i.test(
      softenClientFacingDepositLanguage("the deposit is received", true),
    ),
  );
  check(
    "partial payment keeps deposit wording",
    /\bdeposit\b/i.test(
      softenClientFacingDepositLanguage("the deposit is received", false),
    ),
  );

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
  check(
    "approved-for-sharing → sent (mark as sent)",
    canTransitionProposal("approved-for-sharing", "sent"),
  );
  check(
    "approved-for-sharing does not auto-path to viewed",
    !canTransitionProposal("approved-for-sharing", "viewed"),
  );
  check(
    "approved-for-sharing → accepted remains valid",
    canTransitionProposal("approved-for-sharing", "accepted-contract-pending"),
  );
  check(
    "revision-requested → approved-for-sharing",
    canTransitionProposal("revision-requested", "approved-for-sharing"),
  );
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

  check("hide recurring when zero", shouldShowRecurringInvestment(0) === false);
  check("show recurring when present", shouldShowRecurringInvestment(50_000) === true);
  check(
    "single org cover is not duplicated",
    formatCoverPreparedForLine("de Bois Entertainment", [
      { name: "de Bois Entertainment" },
    ]) === "Prepared for de Bois Entertainment",
  );
  check(
    "multi org cover keeps distinct names",
    formatCoverPreparedForLine("Sutherlin Throwdown", [
      { name: "Sutherlin Throwdown" },
      { name: "Made for Trades" },
    ]) === "Prepared for Sutherlin Throwdown · Made for Trades",
  );
  check(
    "scope org omitted when it matches primary",
    distinctScopeOrganizationName("de Bois Entertainment", "de Bois Entertainment") === null,
  );
  check(
    "acceptance disclosure omits internal proposal modes",
    !/binding-proposal/i.test(DEFAULT_ACCEPTANCE_DISCLOSURE),
  );
  check(
    "contract-required disclosure omits internal proposal modes",
    !/binding-proposal/i.test(DEFAULT_CONTRACT_REQUIRED_DISCLOSURE),
  );

  // Editorial composition (display-only)
  const terryDoc = emptyProposalDocument({
    organizations: [
      { id: "org_a", name: "Made for Trades" },
      { id: "org_b", name: "Sutherlin Throwdown" },
    ],
    contacts: [
      {
        id: "c1",
        name: "Terry Brock",
        email: "terry@sutherlinthrowdown.org",
        phone: "(541) 733-5164",
        isPrimary: true,
        organizationId: "org_b",
      },
    ],
    executive: {
      clientFacingIntro:
        "Rebuild Made for Trades and Sutherlin Throwdown as one combined engagement for $2,500 total, paid in full upfront.",
      executiveSummary:
        "Rebuild Made for Trades and Sutherlin Throwdown as one combined engagement for $2,500 total, paid in full upfront.",
      currentSituation: "Both websites need clearer pathways and stronger mobile usability.",
      objectives: "Deliver two distinct websites under one coordinated project.",
      recommendedDirection: "Coordinate both rebuilds while keeping identities separate.",
      desiredOutcomes: "Two dependable websites with clear next steps.",
      clientContext: "The $2,500 one-time investment covers both rebuilds together.",
    },
    pricingLines: [
      {
        id: "one",
        title: "Two-Website Rebuild Engagement — Made for Trades + Sutherlin Throwdown",
        cadence: "one-time",
        quantity: 1,
        unitPriceCents: 250000,
        inclusion: "included",
        sortOrder: 1,
      },
      {
        id: "host_a",
        title: "KXD Managed Hosting — Made for Trades",
        cadence: "annual",
        quantity: 1,
        unitPriceCents: 29900,
        inclusion: "included",
        sortOrder: 2,
      },
      {
        id: "host_b",
        title: "KXD Managed Hosting — Sutherlin Throwdown",
        cadence: "annual",
        quantity: 1,
        unitPriceCents: 29900,
        inclusion: "included",
        sortOrder: 3,
      },
    ],
    depositCents: 250000,
    paymentSchedule: [
      {
        id: "pay1",
        label: "Paid in full upfront",
        amountCents: 250000,
        due: "at-acceptance",
        sortOrder: 1,
      },
    ],
    terms: {
      timelineAssumptions:
        "Work begins after the final agreement is signed, the deposit is received, and content access is provided.",
      paymentAssumptions: "The $2,500 project investment is paid in full upfront.",
      proposalTerms: "Combined engagement terms.",
      nextSteps: "Accept this proposal to authorize preparation of the final agreement.",
      expirationLanguage: "Valid through September 26, 2026.",
      changeRequestLanguage: "Changes require written approval.",
      clientResponsibilities: "Provide content and access.",
      exclusions: "Paid media spend is excluded.",
      cancellationSummary: "Cancellation is handled in the final agreement.",
      intellectualPropertySummary: "Client owns approved deliverables after payment.",
      closingNote: "Prepared with care by Kreate by Design.",
      acceptanceDisclosure: DEFAULT_ACCEPTANCE_DISCLOSURE,
      contractRequiredDisclosure: DEFAULT_CONTRACT_REQUIRED_DISCLOSURE,
      operationalDraftNotice: "Draft only.",
    },
  });
  const terryTotals = calculateProposalTotals(terryDoc);
  const terryCanonical = buildCanonicalProposal({
    id: 7,
    proposalNumber: "KXD-P-2026-0007",
    title: "Made for Trades + Sutherlin Throwdown Two-Website Rebuild Engagement",
    status: "approved-for-sharing",
    proposalDate: "2026-09-12T12:00:00.000Z",
    expiresAt: "2026-09-26T12:00:00.000Z",
    revisionNumber: 1,
    builderDocument: {
      ...terryDoc,
      // ensure totals path uses calculated values via canonicalize
    },
  });
  // Force totals onto canonical for composition helpers that read proposal.totals
  terryCanonical.totals = terryTotals;
  terryCanonical.depositCents = 250000;

  const cover = composeCoverPresentation(terryCanonical);
  check("cover lists both organizations", cover.organizationLines.length === 2);
  check(
    "cover engagement strips org names",
    /two-website rebuild engagement/i.test(cover.engagementTitle),
  );
  const opening = composeOpeningSections(terryCanonical);
  check("opening collapses redundant executive summary", opening.length <= 4);
  check(
    "opening does not repeat identical summary as separate section",
    opening.filter((section) => /executive summary/i.test(section.eyebrow)).length === 0,
  );
  const investment = composeInvestmentPresentation(terryCanonical);
  check("investment is full upfront", investment.isFullUpfront === true);
  check("investment hides duplicate schedule", investment.showDetailedSchedule === false);
  check("investment payment summary is upfront", /paid in full upfront/i.test(String(investment.paymentSummary)));
  check("investment shows monthly none", investment.monthlyNoneLabel === "None required");
  check("isFullUpfront helper", isFullUpfrontProposal(terryCanonical) === true);
  check(
    "deposit language softened for full upfront",
    !/deposit/i.test(
      softenClientFacingDepositLanguage(
        "after the final agreement is signed, the deposit is received",
        true,
      ),
    ),
  );
  const plain = renderProposalPlainText(terryCanonical);
  check("plaintext has no deposit for full-upfront terry", !/\bdeposit\b/i.test(plain));
  check("plaintext keeps $2,500", plain.includes("$2,500.00") || plain.includes("$2,500"));
  check("plaintext keeps $299 hosting", plain.includes("$299.00/year") || plain.includes("$299"));

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
