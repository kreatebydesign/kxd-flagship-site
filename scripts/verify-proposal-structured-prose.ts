/**
 * Display-only proposal structured prose rendering checks.
 * Does not touch proposal records.
 *
 *   npx tsx scripts/verify-proposal-structured-prose.ts
 */
import { renderProposalPreviewHtml } from "../lib/proposal-builder/export-html.ts";
import { renderProposalPlainText } from "../lib/proposal-builder/export-plaintext.ts";
import { buildCanonicalProposal } from "../lib/proposal-builder/canonicalize.ts";
import { emptyProposalDocument, newId } from "../lib/proposal-builder/document.ts";
import {
  proseKindForTermsKey,
  structureProposalProse,
} from "../lib/proposal-builder/structured-prose.ts";

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

console.log("\nProposal structured prose verification\n");

const narrative = structureProposalProse(
  "This remains a calm narrative paragraph about the engagement.",
  "narrative",
);
check("narrative stays one paragraph", narrative.length === 1 && narrative[0]?.type === "paragraph");

const responsibilities = structureProposalProse(
  "Acme will be responsible for providing logos and brand assets; company information and factual business details; service information; contact information; and timely review with consolidated feedback.",
  "list",
);
check(
  "responsibilities become bullets",
  responsibilities.some((b) => b.type === "bullets" && b.items.length >= 4),
);
check(
  "responsibilities keep intro",
  responsibilities.some(
    (b) => b.type === "paragraph" && /responsible for/i.test(b.text) && /:$/.test(b.text),
  ),
);

const exclusions = structureProposalProse(
  "The $2,950 Phase 1 investment does not include a transportation management system; carrier management system; automated dispatch software; customer account portal; or paid advertising management.\n\nAdditional capabilities can be scoped later.",
  "list",
);
check(
  "exclusions become bullets",
  exclusions.some((b) => b.type === "bullets" && b.items.length >= 4),
);
check(
  "exclusions keep trailing narrative",
  exclusions.some(
    (b) => b.type === "paragraph" && /Additional capabilities can be scoped later/i.test(b.text),
  ),
);

const nextSteps = structureProposalProse(
  "To move forward:\n\n1. Review and accept the proposal.\n2. Complete the project agreement.\n3. Submit the project initiation payment.\n4. Provide brand assets and access.\n5. Begin discovery and build.",
  "steps",
);
check(
  "next steps become numbered",
  nextSteps.some((b) => b.type === "numbered" && b.items.length === 5),
);
check(
  "next steps keep intro",
  nextSteps.some((b) => b.type === "paragraph" && /To move forward/i.test(b.text)),
);
check(
  "numbered markers stripped",
  nextSteps.some(
    (b) =>
      b.type === "numbered" &&
      b.items.every((item) => !/^\d+[\.\)]\s/.test(item)) &&
      b.items[0] === "Review and accept the proposal",
  ),
);

check("terms key mapping responsibilities", proseKindForTermsKey("clientResponsibilities") === "list");
check("terms key mapping exclusions", proseKindForTermsKey("exclusions") === "list");
check("terms key mapping next steps", proseKindForTermsKey("nextSteps") === "steps");
check("terms key mapping legal narrative", proseKindForTermsKey("proposalTerms") === "narrative");

const doc = emptyProposalDocument({
  organizations: [{ id: newId("org"), name: "Acme Logistics" }],
  contacts: [
    {
      id: newId("contact"),
      name: "Casey",
      email: "casey@example.com",
      isPrimary: true,
    },
  ],
  executive: {
    executiveSummary: "A clear narrative summary remains paragraph form.",
  },
  scopeGroups: [
    {
      id: newId("scope"),
      title: "Phase 1 website",
      overview: "Focused Phase 1 delivery.",
      deliverables: [
        { id: newId("del"), title: "Homepage", sortOrder: 1 },
        { id: newId("del"), title: "Contact page", sortOrder: 2 },
      ],
      sortOrder: 1,
      inclusion: "included",
    },
  ],
  pricingLines: [
    {
      id: newId("line"),
      title: "Phase 1 website",
      cadence: "one-time",
      quantity: 1,
      unitPriceCents: 295_000,
      inclusion: "included",
      sortOrder: 1,
    },
  ],
  terms: {
    clientResponsibilities:
      "Acme will be responsible for providing logos and brand assets; company information; service details; and timely feedback.",
    exclusions:
      "The investment does not include a full operating system; paid advertising management; or ongoing SEO campaigns.\n\nFuture work can be scoped later.",
    nextSteps:
      "To move forward:\n\n1. Review and accept the proposal.\n2. Complete the project agreement.\n3. Submit payment.",
    proposalTerms: "Standard narrative terms stay readable as paragraphs.",
  },
});

const canonical = buildCanonicalProposal({
  id: 1,
  proposalNumber: "KXD-P-TEST-0001",
  title: "Acme Phase 1",
  status: "sent",
  proposalDate: "2026-09-10T12:00:00.000Z",
  expiresAt: "2026-10-10T12:00:00.000Z",
  revisionNumber: 1,
  builderDocument: doc,
});

const html = renderProposalPreviewHtml(canonical);
check("html exclusions use list markup", /What's not included[\s\S]*<ul class="prose-list">/.test(html));
check("html responsibilities use list markup", /What we need from you[\s\S]*<ul class="prose-list">/.test(html));
check("html next steps use ordered list", /How to begin[\s\S]*<ol class="prose-list">/.test(html));
check(
  "html narrative terms stay paragraph",
  /<h2>Terms<\/h2><p>Standard narrative terms stay readable as paragraphs\.<\/p>/.test(html),
);
check("html deliverables still list", /<h3>Deliverables<\/h3><ul>/.test(html));

const plain = renderProposalPlainText(canonical);
check("plaintext exclusions use bullets", /What's Not Included\nThe investment does not include:\n• /.test(plain));
check("plaintext next steps numbered", /Next Step\nTo move forward:\n1\. Review and accept the proposal/.test(plain));

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
