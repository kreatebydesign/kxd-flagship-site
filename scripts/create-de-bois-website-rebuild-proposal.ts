/**
 * Create the de Bois Entertainment website rebuild proposal as a native
 * KXD OS proposal record (draft / internal review).
 *
 *   CONFIRM_PRODUCTION_DRAFT=de-bois-website-rebuild \
 *   DATABASE_URI="..." \
 *   npx tsx --env-file=.env.local scripts/create-de-bois-website-rebuild-proposal.ts
 *
 * Safety: draft only. Does not send, share, accept, contract, email, Stripe,
 * client conversion, or mutate Inquiry 43.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { calendarDateToStoredInstant } from "../lib/proposal-builder/calendar-date.ts";
import { assertNoInternalLeakage, buildCanonicalProposal } from "../lib/proposal-builder/canonicalize.ts";
import { newId, normalizeProposalDocument } from "../lib/proposal-builder/document.ts";
import { dollarsToCents, formatCents } from "../lib/proposal-builder/money.ts";
import { calculateProposalTotals, totalsToLegacyFields } from "../lib/proposal-builder/pricing.ts";
import type { ProposalDocument } from "../lib/proposal-builder/types.ts";

const TITLE = "de Bois Entertainment Website Rebuild";
const LEAD_ID = 6;
const INQUIRY_ID = 43;
const CONFIRM = "de-bois-website-rebuild";

function assertProductionTarget(): { host: string; database: string } {
  if (process.env.CONFIRM_PRODUCTION_DRAFT !== CONFIRM) {
    throw new Error(`Set CONFIRM_PRODUCTION_DRAFT=${CONFIRM} to create this live draft.`);
  }
  const uri =
    process.env.DATABASE_URI?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    "";
  if (!uri) throw new Error("Missing DATABASE_URI");
  if (!/neon\.tech/i.test(uri)) {
    throw new Error("This script writes the live sales draft and requires the Neon production database.");
  }
  const parsed = new URL(uri);
  const host = parsed.hostname;
  const database = parsed.pathname.replace(/^\//, "").split("?")[0];
  if (host === "127.0.0.1" || host === "localhost") {
    throw new Error("Refusing localhost");
  }
  console.log(`[create-draft] neon host=${host} database=${database}`);
  return { host, database };
}

function deliverables(titles: string[]) {
  return titles.map((title, i) => ({
    id: newId("del"),
    title,
    sortOrder: i + 1,
  }));
}

function buildDocument(): ProposalDocument {
  const orgId = newId("org");
  const scopeDirection = newId("scope");
  const scopeSupporting = newId("scope");
  const scopeLaunch = newId("scope");
  const lineRebuild = newId("line");

  return {
    schemaVersion: 1,
    templateKind: "website-design-development",
    currency: "USD",
    taxRateBps: 0,
    depositCents: 0,
    scheduleCallUrl: "",
    organizations: [
      { id: orgId, name: "de Bois Entertainment", brand: "de Bois Entertainment" },
    ],
    contacts: [
      {
        id: newId("contact"),
        name: "Randy Stern",
        title: "Principal",
        email: "randy@deboisentertainment.com",
        isPrimary: true,
        organizationId: orgId,
      },
    ],
    executive: {
      clientFacingIntro:
        "de Bois does not need a website that simply looks newer. It needs a site that keeps the company in consideration when someone is comparing de Bois against other entertainment companies, then gets that person quickly to the band or service they came to see.\n\nYou put the problem plainly. People get a referral, hear about de Bois or one of its bands, visit the site, and make an early decision before you ever speak with them. When you do get that conversation, your experience, reputation, relationships, pricing, and ability to sell can take over. The current website is making that first comparison harder than it should be.",
      executiveSummary:
        "Kreate by Design will rebuild the de Bois Entertainment website so it makes a stronger first impression, helps visitors reach the entertainment they came for, and gives them a clear next step. The project is a one-time website rebuild for $9,500, planned inside a 60-90 day window.\n\nThe site does not need to wait for every future video shoot. KXD will build the finished pages around the strongest material available now, with new media designed to drop into those pages as it becomes available.",
      currentSituation:
        "The homepage has to carry a lot of weight. It needs to look current, strong, and exciting enough to stand beside the companies you named as references: Downbeat, West Coast Music, Blitz Nation, Bob Gail Music, and Élan Artists. We are not copying those sites. They are a benchmark for the level of presentation people expect when they compare live entertainment companies. The finished de Bois site needs its own identity.\n\nAfter those first 30-60 seconds, many prospects want the specific band they were told about. Those primary band pages need to sell the act. Not every existing page deserves the same production effort. Some styles, specialty offerings, and secondary pages still need to exist because someone may look for them. They should not compete equally with the homepage and the core acts.\n\nExisting media quality varies. Some band videos are older, and some live footage needs improvement. You intend to produce better master videos over the coming weeks and months. The rebuild should not wait for every new video.",
      objectives:
        "Give de Bois a much stronger first impression. Help visitors quickly reach the entertainment they came to see. Create a clear path from interest to inquiry. Put the most production effort into the homepage and approximately five to six primary band pages. Keep weddings easy to find without making the company look like a generic wedding-band website. Keep corporate and private-event capability visible. Replace the current contact experience. Make it practical to swap videos, photography, and selected band content after launch without rebuilding the site.",
      recommendedDirection:
        "The website should work in layers.\n\n1. First impression. The homepage introduces de Bois through the strongest available performance footage, photography, history, reputation, and range. The first job is to keep a qualified visitor interested. The strongest homepage media does not need to show an average wedding. A large band, strong lighting, a large room, crowd energy, and high-impact performance footage can show what de Bois can deliver.\n\n2. Primary entertainment. Visitors looking for a specific band should find it quickly. The strongest commercial acts get the strongest pages, built around video and visual proof.\n\n3. Weddings. Weddings are about 75% of current business, so wedding buyers need a clear path. The presentation should feel current and appropriate for higher-value events, not overly sentimental or bridal.\n\n4. Corporate and private events. Corporate, private, destination, and other non-wedding bookings should remain clear and credible without overstating how much of the business they currently represent.\n\n5. Additional entertainment. Music styles, specialty acts, larger ensembles, and secondary offerings stay available without forcing the whole site into a directory.\n\n6. Inquiry. Every important path should offer a next action. Possible language includes Check Availability, Tell Us About Your Event, or Inquire About This Band. Exact CTA wording will be confirmed during design. Contact Us should not be the only conversion path.\n\nWe will help you decide the right hierarchy. The strongest commercial acts receive the strongest pages. Secondary offerings remain discoverable where they are useful. Final artist roster and page architecture will be confirmed during project planning.\n\nThere are special cases to sort during planning, including a luxury mini-orchestra / horns / strings concept, an international band, an older R&B act you may retire, and other secondary categories. We will not rebuild every current page simply because it exists today. Existing URLs that carry search value will be considered during migration. Inquiry form fields, CTA language, and the primary band roster will be confirmed with you before those pieces are built.",
      desiredOutcomes:
        "A complete production website that can stand confidently beside the references you provided, with its own identity. A homepage and primary band pages that do the commercial work. Supporting content in the right places. A better inquiry path. A practical way to replace media over time. Desktop, tablet, and mobile that all work, with mobile treated as a first visit, not an afterthought.",
      clientContext: "",
    },
    scopeGroups: [
      {
        id: scopeDirection,
        organizationId: orgId,
        organizationName: "de Bois Entertainment",
        title: "Direction, homepage, and primary band pages",
        overview:
          "Review the current site, content, and media. Confirm the new hierarchy with you. Then design and build the homepage and the primary band pages that have to do the commercial work.",
        deliverables: deliverables([
          "Review the existing de Bois website, current content, and available media",
          "Finalize site hierarchy and navigation with Randy",
          "Determine primary vs. secondary entertainment content",
          "Establish the new visual direction, using your competitor references as a benchmark without copying them",
          "Map existing content into the new structure and identify media gaps that can be filled during or after production",
          "Custom homepage capable of high-impact opening video/media, concise positioning, history and credibility, wedding positioning, featured bands, additional entertainment categories, corporate/private capability, selected social proof, and a clear path into band pages",
          "Approximately 5-6 primary band/artist pages",
          "Each primary band page capable of primary performance video, additional video, photography, concise introduction, styles/repertoire, configurations where applicable, event suitability, selected proof where available, and a direct inquiry or availability CTA",
          "Primary band pages built so new master videos can replace older media without rebuilding the page",
        ]),
        estimatedTimeline: "Phases 1-3 inside the 60-90 day project window",
        clientResponsibilities:
          "Provide the primary band roster, band information, available photography and video, logos/brand assets, and timely feedback on hierarchy and design direction.",
        kxdResponsibilities:
          "Lead planning, visual direction, homepage design/build, and primary band page design/build.",
        assumptions:
          "Final artist roster and which acts receive primary pages will be confirmed during project planning. Exact CTA language is not locked until design and content work.",
        sortOrder: 1,
        inclusion: "included",
      },
      {
        id: scopeSupporting,
        organizationId: orgId,
        organizationName: "de Bois Entertainment",
        title: "Supporting content, company story, and inquiry",
        overview:
          "Reorganize secondary entertainment, give weddings and corporate/private events the right weight, present company history clearly, and replace the current contact experience.",
        deliverables: deliverables([
          "Reorganize secondary music styles, entertainment types, specialty acts, and supporting services",
          "Use consolidated category pages, lighter supporting pages, grouped sections, or individual pages where justified",
          "Wedding experience for the largest customer segment, current and appropriate for higher-value events, without generic wedding marketing",
          "Clear path for corporate events, private events, destination events, and other non-wedding bookings",
          "de Bois and Randy Stern history and background, used as company credibility rather than a generic About page or a site that depends entirely on one biography",
          "New inquiry experience that feels like part of the website rather than a generic application form",
          "Inquiry capable of collecting name, email, phone, event date, event type, venue/location, entertainment/band interest, guest count, and event details, with final fields confirmed before implementation",
        ]),
        estimatedTimeline: "Phases 2-4 inside the 60-90 day project window",
        assumptions:
          "Final supporting-page architecture depends on actual need, not blindly recreating every current URL.",
        sortOrder: 2,
        inclusion: "included",
      },
      {
        id: scopeLaunch,
        organizationId: orgId,
        organizationName: "de Bois Entertainment",
        title: "Build, media updates, technical foundation, and launch",
        overview:
          "The website itself should be complete at launch. Individual media assets can continue improving afterward. New media should be easy to add without rebuilding the website.",
        deliverables: deliverables([
          "Practical content management for approved editable content, including primary videos, supporting videos, photography, and selected band content",
          "Desktop, tablet, and mobile implementation, with mobile treated as a first-class experience",
          "Technical SEO foundation: page metadata, indexable architecture, canonical configuration, sitemap, robots configuration, semantic heading structure, internal linking, legacy URL redirects where needed, image/media optimization, performance considerations, and clean page structure",
          "Launch-ready analytics and inquiry tracking, including website analytics, inquiry submission tracking, important CTA/conversion tracking, and key page activity where supported",
          "Migration of the strongest usable existing content and media",
          "QA, revisions, and production launch",
        ]),
        estimatedTimeline: "Phases 4-6 inside the 60-90 day project window",
        assumptions:
          "The site does not need to wait for every future video shoot. KXD will build the finished pages around the strongest material available now, with new media designed to drop into those pages as it becomes available.",
        sortOrder: 3,
        inclusion: "included",
      },
    ],
    pricingLines: [
      {
        id: lineRebuild,
        scopeGroupId: scopeDirection,
        organizationId: orgId,
        title: "de Bois Entertainment website rebuild",
        cadence: "one-time",
        quantity: 1,
        unitPriceCents: dollarsToCents("9500"),
        inclusion: "included",
        sortOrder: 1,
      },
    ],
    credits: [],
    paymentSchedule: [
      {
        id: newId("pay"),
        label: "50% to begin",
        amountCents: dollarsToCents("4750"),
        due: "at-contract",
        sortOrder: 1,
      },
      {
        id: newId("pay"),
        label: "25% after design direction approval",
        amountCents: dollarsToCents("2375"),
        due: "milestone",
        milestoneLabel: "Design direction approval",
        sortOrder: 2,
      },
      {
        id: newId("pay"),
        label: "25% before production launch",
        amountCents: dollarsToCents("2375"),
        due: "remaining",
        milestoneLabel: "Before production launch",
        sortOrder: 3,
      },
    ],
    options: {
      mode: "recommended-package",
      clientCanSelect: false,
      packages: [],
    },
    terms: {
      proposalTerms:
        "This proposal covers the de Bois Entertainment website rebuild. Approving it authorizes Kreate by Design to prepare the final agreement. Work begins after that agreement is signed and the initial payment is received.",
      paymentAssumptions: "",
      timelineAssumptions:
        "The project is planned inside a 60-90 day window. Exact calendar dates will be set at kickoff.\n\nPhase 1: Direction and architecture.\nPhase 2: Homepage and core visual system.\nPhase 3: Primary band pages and supporting content.\nPhase 4: Development and content/media integration.\nPhase 5: QA and revisions.\nPhase 6: Production launch.\n\nDelayed future video production does not need to delay the core site.",
      expirationLanguage:
        "This proposal is valid through September 18, 2026.",
      changeRequestLanguage:
        "Work outside the approved website scope requires written approval and may require additional investment.",
      clientResponsibilities:
        "de Bois should provide access to the existing website and content where required, current logos and brand assets, available photography, available video, the primary band roster, band information, testimonials or proof intended for use, timely feedback and approvals, and new media as it becomes available. Delayed future video production does not need to delay the core site.",
      exclusions:
        "Photography and video production are not included. Paid third-party services or advertising spend are not included unless specifically listed. Work outside the approved website scope requires written approval and may require additional investment. Rankings, traffic, and lead volume are not guaranteed.",
      nextSteps:
        "If this direction looks right, approve the proposal and Kreate by Design will prepare the final agreement. Once the agreement is signed and the initial payment is received, we can begin.",
      closingNote: "",
      contractRequiredDisclosure:
        "Work begins after the final agreement is signed and the initial payment is received.",
    },
    internal: {
      internalNotes:
        "DRAFT / INTERNAL REVIEW. Do not send to Randy. Do not approve for sharing. Do not generate agreement, invoices, Stripe, client conversion, or onboarding. Linked to sales lead 6, sourced from Inquiry 43 (luxury-website-experiences, 5k-10k, 60-90-days, project-application). Phone was not on the inquiry; do not invent one. Website-only scope. Matt must review before Randy sees it.",
      internalOwner: "Matt Lunger",
    },
  };
}

async function main() {
  assertProductionTarget();
  if (!process.env.PAYLOAD_SECRET) {
    process.env.PAYLOAD_SECRET = "kxd-dev-secret-change-in-production";
  }

  const payload = await getPayload({ config });

  const lead = (await payload.findByID({
    collection: "sales-leads" as never,
    id: LEAD_ID,
    depth: 0,
    overrideAccess: true,
  })) as {
    id: number;
    companyName?: string;
    contactName?: string;
    email?: string;
    sourceInquiry?: number | { id: number };
    status?: string;
  };

  const sourceInquiryId =
    typeof lead.sourceInquiry === "object" && lead.sourceInquiry
      ? Number(lead.sourceInquiry.id)
      : Number(lead.sourceInquiry);
  if (lead.companyName !== "de Bois Entertainment") {
    throw new Error(`Lead ${LEAD_ID} is not de Bois Entertainment`);
  }
  if (lead.email !== "randy@deboisentertainment.com") {
    throw new Error(`Lead ${LEAD_ID} email mismatch`);
  }
  if (sourceInquiryId !== INQUIRY_ID) {
    throw new Error(`Lead ${LEAD_ID} sourceInquiry is ${sourceInquiryId}, expected ${INQUIRY_ID}`);
  }

  const inquiry = (await payload.findByID({
    collection: "inquiries" as never,
    id: INQUIRY_ID,
    depth: 0,
    overrideAccess: true,
  })) as {
    id: number;
    status?: string;
    promotedSalesLead?: number | { id: number };
    email?: string;
  };
  const inquiryBefore = {
    id: inquiry.id,
    status: inquiry.status,
    email: inquiry.email,
    promotedSalesLead:
      typeof inquiry.promotedSalesLead === "object" && inquiry.promotedSalesLead
        ? inquiry.promotedSalesLead.id
        : inquiry.promotedSalesLead,
  };

  const existing = await payload.find({
    collection: "proposals" as never,
    where: {
      and: [{ title: { equals: TITLE } }, { lead: { equals: LEAD_ID } }],
    },
    limit: 5,
    overrideAccess: true,
  });
  const existingDoc = existing.docs[0] as
    | {
        id: number;
        status?: string;
        proposalNumber?: string;
        sentAt?: string | null;
        shareApprovedAt?: string | null;
        client?: unknown;
      }
    | undefined;

  const document = buildDocument();
  const totals = calculateProposalTotals(document);
  if (totals.oneTimeTotalCents !== dollarsToCents("9500")) {
    throw new Error(`Expected $9,500.00, got ${formatCents(totals.oneTimeTotalCents)}`);
  }
  if (totals.monthlyTotalCents !== 0) {
    throw new Error(`Expected no monthly amount, got ${formatCents(totals.monthlyTotalCents)}`);
  }
  const scheduleSum = document.paymentSchedule.reduce((sum, item) => sum + item.amountCents, 0);
  if (scheduleSum !== totals.oneTimeTotalCents) {
    throw new Error("Payment schedule does not equal one-time total");
  }

  const normalized = normalizeProposalDocument(document);
  const legacy = totalsToLegacyFields(totals);
  const authoredText = [
    normalized.executive.clientFacingIntro,
    normalized.executive.executiveSummary,
    normalized.executive.currentSituation,
    normalized.executive.objectives,
    normalized.executive.recommendedDirection,
    normalized.executive.desiredOutcomes,
    normalized.executive.clientContext,
    ...normalized.scopeGroups.flatMap((g) => [
      g.title,
      g.overview,
      ...g.deliverables.map((d) => d.title),
    ]),
    ...normalized.pricingLines.map((l) => l.title),
    ...normalized.paymentSchedule.map((p) => p.label),
    normalized.terms.proposalTerms,
    normalized.terms.paymentAssumptions,
    normalized.terms.timelineAssumptions,
    normalized.terms.expirationLanguage,
    normalized.terms.changeRequestLanguage,
    normalized.terms.clientResponsibilities,
    normalized.terms.exclusions,
    normalized.terms.nextSteps,
    normalized.terms.closingNote,
  ]
    .filter(Boolean)
    .join("\n");
  const banned = [
    "elevate",
    "digital ecosystem",
    "immersive",
    "transformative",
    "next-level",
    "cutting-edge",
    "bespoke",
    "seamless",
    "synergy",
    "unlock",
    "journey",
    "tailored solution",
    "growth engine",
    "world-class",
    "holistic",
    "captivating",
    "meticulously",
    "—",
    "Inquiry 43",
    "payload",
  ];
  const hits = banned.filter((word) => authoredText.toLowerCase().includes(word.toLowerCase()));
  if (hits.length) {
    throw new Error(`Authored copy contains banned tokens: ${hits.join(", ")}`);
  }

  const draftFields = {
    title: TITLE,
    heroTitle: TITLE,
    heroSubtitle:
      "Website rebuild for a stronger first impression, clearer band pages, and a better path to inquiry.",
    builderDocument: normalized,
    investment: legacy.investment,
    recurringAmount: 0,
    discountType: "none",
    depositType: "percent-50",
    depositRequired: true,
    paymentStatus: "none",
    pricingSnapshot: legacy.pricingSnapshot,
    investmentSummary:
      "Website rebuild: $9,500. 50% to begin ($4,750), 25% after design direction approval ($2,375), 25% before production launch ($2,375).",
    executiveSummary: normalized.executive.executiveSummary,
    scope: normalized.scopeGroups.map((g) => g.title).join("; "),
    deliverables: normalized.scopeGroups
      .flatMap((g) => g.deliverables.map((d) => d.title))
      .join("; "),
    timeline: normalized.terms.timelineAssumptions,
    terms: normalized.terms.proposalTerms,
    internalNotes: normalized.internal.internalNotes,
  };

  if (existingDoc) {
    if (existingDoc.sentAt || existingDoc.shareApprovedAt || existingDoc.client) {
      throw new Error("Existing proposal is no longer a safe draft. Refusing to overwrite.");
    }
    if (!["draft", "internal-review"].includes(String(existingDoc.status))) {
      throw new Error(`Refusing to overwrite status ${existingDoc.status}`);
    }
    const reviewed = await payload.update({
      collection: "proposals" as never,
      id: existingDoc.id,
      data: {
        ...draftFields,
        status: "internal-review",
      } as never,
      overrideAccess: true,
    });
    await reportResult({
      payload,
      reused: true,
      reviewed,
      lead,
      inquiryBefore,
      document,
      totals,
      normalized,
    });
    return;
  }

  const year = new Date().getFullYear();
  const existingNums = await payload.find({
    collection: "proposals" as never,
    where: { proposalNumber: { like: `KXD-P-${year}-` } },
    limit: 200,
    overrideAccess: true,
  });
  const maxSeq = existingNums.docs.reduce((max, d) => {
    const m = String((d as { proposalNumber?: string }).proposalNumber ?? "").match(
      /KXD-P-\d{4}-(\d+)/,
    );
    const n = m ? Number(m[1]) : 0;
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 0);
  const proposalNumber = `KXD-P-${year}-${String(maxSeq + 1).padStart(4, "0")}`;

  const record = (await payload.create({
    collection: "proposals" as never,
    data: {
      proposalNumber,
      ...draftFields,
      status: "draft",
      acceptanceMode: "accept-and-proceed-to-contract",
      approvalStatus: "none",
      proposalType: "website",
      revisionNumber: 1,
      proposalDate: calendarDateToStoredInstant("2026-08-19"),
      expiresAt: calendarDateToStoredInstant("2026-09-18"),
      lead: LEAD_ID,
      versionHistory: [
        {
          version: 1,
          notes: "Initial internal draft for Matt review. Do not send.",
          createdAt: new Date().toISOString(),
          createdBy: "Matt Lunger",
        },
      ],
      shareLinks: [],
      changeRequests: [],
      internalOwner: "Matt Lunger",
    } as never,
    overrideAccess: true,
  })) as { id: number };

  const reviewed = await payload.update({
    collection: "proposals" as never,
    id: record.id,
    data: { status: "internal-review" } as never,
    overrideAccess: true,
  });

  await reportResult({
    payload,
    reused: false,
    reviewed,
    lead,
    inquiryBefore,
    document,
    totals,
    normalized,
  });
}

async function reportResult(input: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
  reused: boolean;
  reviewed: Record<string, unknown>;
  lead: { status?: string };
  inquiryBefore: { status?: string };
  document: ProposalDocument;
  totals: ReturnType<typeof calculateProposalTotals>;
  normalized: ProposalDocument;
}): Promise<void> {
  const { payload, reused, reviewed, lead, inquiryBefore, document, totals, normalized } = input;

  const inquiryAfter = (await payload.findByID({
    collection: "inquiries" as never,
    id: INQUIRY_ID,
    depth: 0,
    overrideAccess: true,
  })) as { status?: string };

  const leadAfter = (await payload.findByID({
    collection: "sales-leads" as never,
    id: LEAD_ID,
    depth: 0,
    overrideAccess: true,
  })) as { status?: string };

  const canonical = buildCanonicalProposal({
    id: Number(reviewed.id),
    proposalNumber: String(reviewed.proposalNumber ?? ""),
    title: TITLE,
    status: String(reviewed.status ?? "draft"),
    proposalDate: reviewed.proposalDate as string,
    expiresAt: reviewed.expiresAt as string,
    revisionNumber: Number(reviewed.revisionNumber ?? 1),
    builderDocument: normalized,
  });
  const leaks = assertNoInternalLeakage(canonical);
  if (leaks.length) {
    throw new Error(`Canonical leakage: ${leaks.join("; ")}`);
  }

  console.log(
    JSON.stringify(
      {
        reused,
        id: reviewed.id,
        status: reviewed.status,
        approvalStatus: reviewed.approvalStatus,
        proposalNumber: reviewed.proposalNumber,
        leadId: LEAD_ID,
        inquiryId: INQUIRY_ID,
        inquiryStatusBefore: inquiryBefore.status,
        inquiryStatusAfter: inquiryAfter.status,
        leadStatusBefore: lead.status,
        leadStatusAfter: leadAfter.status,
        clientId: reviewed.client ?? null,
        oneTimeTotal: formatCents(totals.oneTimeTotalCents),
        monthlyTotal: formatCents(totals.monthlyTotalCents),
        paymentSchedule: document.paymentSchedule.map((item) => ({
          label: item.label,
          amount: formatCents(item.amountCents),
          due: item.due,
        })),
        editUrl: `/admin/sales/proposals/${reviewed.id}`,
        previewUrl: `/admin/sales/proposals/${reviewed.id}/preview`,
        sent: false,
        shared: Boolean(Array.isArray(reviewed.shareLinks) && reviewed.shareLinks.length),
        contracted: Boolean(reviewed.relatedContract),
        conversionExecutedAt: reviewed.conversionExecutedAt ?? null,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
