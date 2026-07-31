/**
 * Create the Sutherlin Throwdown + Made for Trades proposal as a LOCAL draft only.
 *
 *   npx tsx --env-file=.env.local scripts/create-local-st-mft-proposal-draft.ts
 *
 * Safety: refuses non-local hosts and any DB other than kxd_audit_report_review.
 * Does not send, share, accept, contract, email, or Stripe.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { assertNoInternalLeakage, buildCanonicalProposal } from "../lib/proposal-builder/canonicalize.ts";
import { newId, normalizeProposalDocument } from "../lib/proposal-builder/document.ts";
import { calculateProposalTotals, totalsToLegacyFields } from "../lib/proposal-builder/pricing.ts";
import type { ProposalDocument } from "../lib/proposal-builder/types.ts";
import { dollarsToCents, formatCents } from "../lib/proposal-builder/money.ts";

const TITLE =
  "Sutherlin Throwdown + Made for Trades Website & Marketing Partnership";

function assertLocal(): void {
  const uri =
    process.env.DATABASE_URI?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    "";
  if (!uri) throw new Error("Missing DATABASE_URL");
  if (/neon\.tech|vercel-storage|amazonaws\.com/i.test(uri)) {
    throw new Error("Refusing Neon/cloud database URL");
  }
  const host = new URL(uri).hostname;
  const database = new URL(uri).pathname.replace(/^\//, "").split("?")[0];
  if (host !== "127.0.0.1" && host !== "localhost") {
    throw new Error(`Refusing non-local host: ${host}`);
  }
  if (database !== "kxd_audit_report_review") {
    throw new Error(`Expected kxd_audit_report_review, got ${database}`);
  }
  console.log(`[create-draft] host=${host} database=${database}`);
}

function deliverables(titles: string[]) {
  return titles.map((title, i) => ({
    id: newId("del"),
    title,
    sortOrder: i + 1,
  }));
}

async function main() {
  assertLocal();
  const payload = await getPayload({ config });

  const existing = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "proposals" as any,
    where: { title: { equals: TITLE } },
    limit: 5,
    overrideAccess: true,
  });
  if (existing.docs.length > 0) {
    const doc = existing.docs[0] as { id: number; status?: string };
    console.log(
      JSON.stringify(
        {
          reused: true,
          id: doc.id,
          status: doc.status,
          editUrl: `/admin/sales/proposals/${doc.id}`,
        },
        null,
        2,
      ),
    );
    return;
  }

  const leads = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "sales-leads" as any,
    where: {
      and: [
        { companyName: { equals: "Sutherlin Throwdown" } },
        { status: { not_in: ["won", "lost"] } },
      ],
    },
    limit: 5,
    overrideAccess: true,
  });
  if (leads.docs.length === 0) {
    throw new Error("Local Sutherlin Throwdown sales-lead not found");
  }
  if (leads.docs.length > 1) {
    console.warn(`[create-draft] Found ${leads.docs.length} matching leads; using first`);
  }
  const lead = leads.docs[0] as {
    id: number;
    companyName?: string;
    contactName?: string;
    email?: string;
    phone?: string;
    website?: string;
  };
  const leadPhone = String(lead.phone ?? "").trim();
  if (!leadPhone) {
    throw new Error("Sutherlin Throwdown lead has no phone — refusing to invent one");
  }

  const orgSt = newId("org");
  const orgMft = newId("org");
  const scopeSt = newId("scope");
  const scopeMft = newId("scope");
  const scopeOngoing = newId("scope");
  const lineOneTime = newId("line");
  const lineMonthly = newId("line");

  const document: ProposalDocument = {
    schemaVersion: 1,
    templateKind: "combined-project-retainer",
    currency: "USD",
    taxRateBps: 0,
    depositCents: 0,
    scheduleCallUrl: "",
    organizations: [
      { id: orgSt, name: "Sutherlin Throwdown", brand: "" },
      { id: orgMft, name: "Made for Trades", brand: "" },
    ],
    contacts: [
      {
        id: newId("contact"),
        name: "Terry Brock",
        title: "Primary Contact",
        email: "terry@sutherlinthrowdown.org",
        phone: leadPhone,
        isPrimary: true,
        organizationId: orgSt,
      },
    ],
    executive: {
      clientFacingIntro:
        "Sutherlin Throwdown and Made for Trades both serve an important purpose in the community, but each organization needs a stronger digital platform to support its growth, communicate its impact, and make it easier for people to participate.\n\nThis proposal outlines a combined partnership with Kreate by Design to rebuild both websites, improve the registration and sponsor experience, and provide ongoing website management and marketing support. Special partnership pricing has been extended in recognition of the organizations’ community work, Martin Condon’s referral, and an agreed Kreate by Design event sponsorship.",
      executiveSummary:
        "Kreate by Design will design and build two distinct websites—one for Sutherlin Throwdown and one for Made for Trades—supported by an ongoing website management and marketing partnership. The engagement will strengthen each organization’s digital presence, improve registration and sponsor visibility, and create a dependable foundation for continued community growth.",
      currentSituation:
        "Both organizations have meaningful community missions and growing opportunities, but their current digital platforms do not fully support their goals. Sutherlin Throwdown needs a more professional event website with a clearer registration experience, stronger sponsor presentation, and automatic visibility into registered teams. Made for Trades needs a credible, organized website that communicates its purpose, promotes involvement, and supports future programs, partnerships, and outreach.",
      objectives:
        "Build two professional, mobile-responsive websites that clearly represent each organization, simplify participation, strengthen sponsor and community confidence, and make ongoing updates easier to manage. Establish a sustainable monthly partnership that keeps both websites accurate, functional, visible, and aligned with upcoming events and organizational priorities.",
      recommendedDirection:
        "Develop each website as its own distinct platform while managing both under one coordinated Kreate by Design partnership. Following launch, KXD will provide controlled monthly website management, platform oversight, basic SEO, reporting, routine content updates, and light promotional support across both organizations.",
      desiredOutcomes:
        "Two polished and dependable websites; clearer paths for registration, sponsorship, donations, and involvement; stronger presentation of each organization’s mission and impact; improved mobile usability; reliable forms and website functionality; and ongoing management that keeps both organizations current without requiring their teams to handle the technical work.",
      clientContext:
        "This combined engagement was introduced through Martin Condon and includes special community-partnership and referral consideration. The final project investment also includes a $750 Kreate by Design event sponsorship credit in exchange for agreed sponsor recognition at one Sutherlin Throwdown event. Each organization will retain its own identity, website, content, and project scope while sharing one coordinated build and ongoing support agreement.",
    },
    scopeGroups: [
      {
        id: scopeSt,
        organizationId: orgSt,
        organizationName: "Sutherlin Throwdown",
        title: "Sutherlin Throwdown Website Rebuild",
        overview:
          "Design and develop a professional, mobile-responsive website that strengthens Sutherlin Throwdown’s event presence, improves registration, gives sponsors stronger visibility, and makes event information easier to access.",
        deliverables: deliverables([
          "Custom website strategy, design, and development",
          "Mobile-responsive experience across major screen sizes",
          "Clear event information and participation pathways",
          "Team registration experience with automatic registered-team display",
          "Registration threshold and event-status visibility",
          "Sponsor showcase and sponsorship opportunity sections",
          "Community impact and organization information",
          "Event schedule, rules, FAQs, and contact information",
          "Secure inquiry and registration forms",
          "Basic on-page SEO foundation",
          "Analytics and conversion tracking setup",
          "Performance, accessibility, and launch quality assurance",
          "Domain, hosting, and launch coordination",
          "Post-launch handoff and support",
        ]),
        estimatedTimeline:
          "Approximately 6–8 weeks within the coordinated two-site project schedule",
        exclusions:
          "Paid advertising spend, professional photography or video production, third-party software fees, advanced custom applications, payment-processing fees, extensive copywriting beyond the approved project scope, and features not specifically listed above are excluded unless added through written approval.",
        sortOrder: 1,
        inclusion: "included",
      },
      {
        id: scopeMft,
        organizationId: orgMft,
        organizationName: "Made for Trades",
        title: "Made for Trades Website Build",
        overview:
          "Design and develop a professional, mobile-responsive website that clearly communicates the Made for Trades mission, builds credibility with community partners and sponsors, and makes it easier for people to learn about programs, participate, contribute, and support the organization.",
        deliverables: deliverables([
          "Custom website strategy, design, and development",
          "Mobile-responsive experience across major screen sizes",
          "Clear presentation of the organization’s mission, vision, and community impact",
          "Program and initiative information",
          "Participation, volunteer, and community involvement pathways",
          "Sponsor and community partner recognition",
          "Sponsorship and contribution opportunities",
          "Donation or support pathways using an approved third-party platform",
          "News, updates, events, or community highlights",
          "Leadership and organization information",
          "Secure inquiry and interest forms",
          "Basic on-page SEO foundation",
          "Analytics and conversion tracking setup",
          "Performance, accessibility, and launch quality assurance",
          "Domain, hosting, and launch coordination",
          "Post-launch handoff and support",
        ]),
        estimatedTimeline:
          "Approximately 6–8 weeks within the coordinated two-site project schedule",
        exclusions:
          "Paid advertising spend, professional photography or video production, third-party platform and transaction fees, advanced membership or learning-management systems, advanced custom applications, extensive copywriting beyond the approved project scope, and features not specifically listed above are excluded unless added through written approval.",
        sortOrder: 2,
        inclusion: "included",
      },
      {
        id: scopeOngoing,
        organizationName: "Sutherlin Throwdown + Made for Trades",
        title: "Ongoing Website Management & Marketing Partnership",
        overview:
          "Provide coordinated monthly website management, platform oversight, and light marketing support across both organizations. This partnership is designed to keep both websites accurate, functional, visible, and aligned with upcoming events and organizational priorities.",
        deliverables: deliverables([
          "Website hosting and platform oversight for both organizations",
          "Routine website performance, uptime, security, form, and functionality checks",
          "Text, image, sponsor, team, event, and general content updates",
          "Registration-flow and registered-team display monitoring",
          "Basic on-page SEO maintenance",
          "Analytics and website performance reporting",
          "Light promotional and marketing support",
          "One monthly strategy and priorities check-in",
          "Up to four combined hours of hands-on update and support work per month",
          "Coordination of approved updates across both websites",
        ]),
        estimatedTimeline: "12-month ongoing partnership beginning after launch",
        exclusions:
          "Unused monthly service hours do not roll over. New pages, major redesigns, custom features, advanced campaigns, paid advertising management or media spend, professional photography or video, extensive copywriting, emergency or after-hours work, and third-party software or transaction fees are outside the monthly scope and will be quoted separately when requested.",
        sortOrder: 3,
        inclusion: "included",
      },
    ],
    pricingLines: [
      {
        id: lineOneTime,
        title: "Standard value for two custom website builds",
        cadence: "one-time",
        quantity: 1,
        unitPriceCents: dollarsToCents("11000"),
        inclusion: "included",
        sortOrder: 1,
      },
      {
        id: lineMonthly,
        title: "Standard ongoing management value",
        cadence: "monthly",
        quantity: 1,
        unitPriceCents: dollarsToCents("1200"),
        inclusion: "included",
        sortOrder: 2,
      },
    ],
    credits: [
      {
        id: newId("credit"),
        kind: "discount",
        label: "Community partnership adjustment",
        amountCents: dollarsToCents("3250"),
        appliesTo: "one-time",
      },
      {
        id: newId("credit"),
        kind: "discount",
        label: "Martin Condon referral consideration",
        amountCents: dollarsToCents("2500"),
        appliesTo: "one-time",
      },
      {
        id: newId("credit"),
        kind: "sponsorship",
        label: "Kreate by Design event sponsorship credit",
        amountCents: dollarsToCents("750"),
        appliesTo: "one-time",
        notes:
          "Included in exchange for official Kreate by Design sponsor recognition at one mutually agreed Sutherlin Throwdown event, including reasonable logo placement and digital or event visibility agreed upon by both parties.",
      },
      {
        id: newId("credit"),
        kind: "promotional",
        label: "Community and referral partnership adjustment",
        amountCents: dollarsToCents("700"),
        appliesTo: "monthly",
      },
    ],
    paymentSchedule: [],
    options: {
      mode: "recommended-package",
      clientCanSelect: false,
      packages: [],
    },
    terms: {
      paymentAssumptions:
        "Final one-time website investment is $4,500.00 after stated adjustments. Final monthly investment is $500.00 per month for a 12-month ongoing partnership beginning after launch. The $750 Kreate by Design event sponsorship credit is included in exchange for official Kreate by Design sponsor recognition at one mutually agreed Sutherlin Throwdown event, including reasonable logo placement and digital or event visibility agreed upon by both parties. Deposit and payment timing to be confirmed with the operator before sharing.",
      nextSteps:
        "Accept this proposal to authorize preparation of the final agreement. Kreate by Design will prepare a contract draft for review before signature, payment, or onboarding.",
      closingNote: "Prepared with care by Kreate by Design.",
    },
    internal: {
      internalNotes:
        "LOCAL DRAFT ONLY — community partnership proposal. Website reference: https://sutherlinthrowdown.org. Do not send until Matt reviews deposit/payment timing.",
      marginNotes:
        "Standard one-time $11,000 → final $4,500 after community −$3,250, referral −$2,500, sponsorship −$750. Standard monthly $1,200 → final $500 after −$700 partnership adjustment.",
    },
  };

  const totals = calculateProposalTotals(document);
  if (totals.oneTimeTotalCents !== dollarsToCents("4500")) {
    throw new Error(
      `Expected one-time $4,500.00, got ${formatCents(totals.oneTimeTotalCents)}`,
    );
  }
  if (totals.monthlyTotalCents !== dollarsToCents("500")) {
    throw new Error(
      `Expected monthly $500.00, got ${formatCents(totals.monthlyTotalCents)}`,
    );
  }

  // Persist via Payload directly (services.ts is server-only for Next).
  const normalized = normalizeProposalDocument(document);
  const legacy = totalsToLegacyFields(totals);
  const year = new Date().getFullYear();
  const existingNums = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "proposals" as any,
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

  const record = await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "proposals" as any,
    data: {
      proposalNumber,
      title: TITLE,
      status: "draft",
      acceptanceMode: "accept-and-proceed-to-contract",
      revisionNumber: 1,
      proposalDate: new Date().toISOString(),
      expiresAt: "2026-08-29T23:59:59.000-07:00",
      lead: Number(lead.id),
      builderDocument: normalized,
      versionHistory: [
        {
          version: 1,
          notes: "Initial local draft",
          createdAt: new Date().toISOString(),
          createdBy: "Matt Lunger",
        },
      ],
      shareLinks: [],
      changeRequests: [],
      internalOwner: "Matt Lunger",
      investment: legacy.investment,
      recurringAmount: legacy.recurringAmount,
      pricingSnapshot: legacy.pricingSnapshot,
      executiveSummary: normalized.executive.executiveSummary,
      scope: normalized.scopeGroups.map((g) => g.title).join("; "),
      deliverables: normalized.scopeGroups
        .flatMap((g) => g.deliverables.map((d) => d.title))
        .join("; "),
      terms: normalized.terms.proposalTerms,
      internalNotes: normalized.internal.internalNotes,
    },
    overrideAccess: true,
  });

  const canonical = buildCanonicalProposal({
    id: Number(record.id),
    proposalNumber: String(record.proposalNumber ?? ""),
    title: TITLE,
    status: String(record.status ?? "draft"),
    revisionNumber: Number(record.revisionNumber ?? 1),
    builderDocument: document,
  });
  const leaks = assertNoInternalLeakage(canonical);
  if (leaks.length) {
    throw new Error(`Canonical leakage: ${leaks.join("; ")}`);
  }
  if (JSON.stringify(canonical).includes("LOCAL DRAFT ONLY")) {
    throw new Error("Internal notes leaked into canonical snapshot");
  }
  if (canonical.primaryContact?.phone !== leadPhone) {
    throw new Error("Canonical phone does not match lead phone");
  }

  console.log(
    JSON.stringify(
      {
        reused: false,
        id: record.id,
        status: record.status,
        proposalNumber: record.proposalNumber,
        leadId: lead.id,
        leadPhone,
        oneTimeTotal: formatCents(totals.oneTimeTotalCents),
        monthlyTotal: formatCents(totals.monthlyTotalCents),
        depositCents: document.depositCents,
        paymentScheduleCount: document.paymentSchedule.length,
        editUrl: `/admin/sales/proposals/${record.id}`,
        sent: false,
        shared: false,
        contracted: false,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
