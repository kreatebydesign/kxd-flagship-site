/**
 * Render Twisted Creek proposal with the editorial presentation system
 * to confirm installment / single-hosting proposals still compose correctly.
 */
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { buildCanonicalProposal } from "../lib/proposal-builder/canonicalize.ts";
import { emptyProposalDocument, newId } from "../lib/proposal-builder/document.ts";
import { renderProposalPdf } from "../lib/proposal-builder/export-pdf.tsx";
import { renderProposalPlainText } from "../lib/proposal-builder/export-plaintext.ts";
import { dollarsToCents } from "../lib/proposal-builder/money.ts";
import {
  composeInvestmentPresentation,
  composeOpeningSections,
} from "../lib/proposal-builder/presentation.ts";

async function main() {
  const out = "tmp/proposal-editorial-polish";
  mkdirSync(out, { recursive: true });

  const doc = emptyProposalDocument({
    organizations: [{ id: newId("org"), name: "Twisted Creek Logistics, LLC" }],
    contacts: [
      {
        id: newId("contact"),
        name: "Cody Thompson",
        email: "codyt@twistedcreeklogistics.net",
        isPrimary: true,
      },
    ],
    executive: {
      clientFacingIntro:
        "A clear website and freight-quote experience built around credibility and practical quoting.",
      executiveSummary: "Phase 1 website and freight quote experience.",
      currentSituation: "The current site does not support quoting well.",
      objectives: "Improve credibility and lead capture.",
      recommendedDirection: "Build a focused Phase 1 website and quote path.",
      desiredOutcomes: "A dependable public presence with quoting.",
      clientContext: "Referral via HJ.",
    },
    scopeGroups: [
      {
        id: newId("scope"),
        title: "Website & Freight Quote Experience",
        organizationName: "Twisted Creek Logistics, LLC",
        overview: "Phase 1 website rebuild with freight quote experience.",
        deliverables: [
          { id: newId("del"), title: "Discovery and information architecture", sortOrder: 1 },
          { id: newId("del"), title: "Website design and development", sortOrder: 2 },
          { id: newId("del"), title: "Freight quote experience", sortOrder: 3 },
        ],
        sortOrder: 1,
        inclusion: "included",
      },
    ],
    pricingLines: [
      {
        id: newId("line"),
        title: "Website & Freight Quote Experience Phase 1",
        cadence: "one-time",
        quantity: 1,
        unitPriceCents: dollarsToCents("2950"),
        inclusion: "included",
        sortOrder: 1,
      },
      {
        id: newId("line"),
        title: "KXD Managed Hosting",
        cadence: "annual",
        quantity: 1,
        unitPriceCents: dollarsToCents("299"),
        inclusion: "included",
        sortOrder: 2,
      },
    ],
    depositCents: dollarsToCents("1475"),
    paymentSchedule: [
      {
        id: newId("pay"),
        label: "Project initiation payment",
        amountCents: dollarsToCents("1475"),
        due: "at-acceptance",
        sortOrder: 1,
      },
      {
        id: newId("pay"),
        label: "Completion / prior to final launch",
        amountCents: dollarsToCents("1475"),
        due: "remaining",
        sortOrder: 2,
      },
    ],
    terms: {
      proposalTerms: "Phase 1 website terms.",
      paymentAssumptions: "50% initiation, 50% completion.",
      timelineAssumptions: "Work begins after agreement and deposit are received.",
      expirationLanguage: "Valid for 14 days.",
      changeRequestLanguage: "Changes require written approval.",
      intellectualPropertySummary: "Client owns approved deliverables after payment.",
      cancellationSummary: "Cancellation follows the final agreement.",
      clientResponsibilities: "Provide content and access.",
      exclusions: "Third-party API usage may be billed separately.",
      nextSteps: "Accept this proposal to authorize preparation of the final agreement.",
      closingNote: "Prepared with care by Kreate by Design.",
    },
  });

  const canonical = buildCanonicalProposal({
    id: 6,
    proposalNumber: "KXD-P-2026-0006",
    title: "Twisted Creek Logistics Website & Freight Quote Experience",
    status: "approved-for-sharing",
    proposalDate: "2026-09-11T12:00:00.000Z",
    expiresAt: "2026-09-25T12:00:00.000Z",
    revisionNumber: 2,
    builderDocument: doc,
  });

  const investment = composeInvestmentPresentation(canonical);
  const opening = composeOpeningSections(canonical);
  const plain = renderProposalPlainText(canonical);
  writeFileSync(join(out, "twisted-creek-plaintext.txt"), plain);
  const { buffer, filename } = await renderProposalPdf(canonical);
  writeFileSync(join(out, `twisted-creek-${filename}`), buffer);

  console.log(
    JSON.stringify(
      {
        filename,
        bytes: buffer.length,
        openingSections: opening.map((section) => section.eyebrow),
        isFullUpfront: investment.isFullUpfront,
        showDetailedSchedule: investment.showDetailedSchedule,
        scheduleRows: investment.scheduleRows.length,
        paymentSummary: investment.paymentSummary,
        hasDepositLanguage: /\bdeposit\b/i.test(plain),
        has2950: plain.includes("$2,950.00") || plain.includes("$2,950"),
        hasHosting: plain.includes("$299"),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
