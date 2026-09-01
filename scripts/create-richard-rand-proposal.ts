/**
 * Create the Richard Rand Personal Heritage & Digital Archive proposal as a
 * native KXD OS proposal record (draft / internal review).
 *
 *   CONFIRM_PRODUCTION_DRAFT=richard-rand-heritage-archive \
 *   npx tsx --env-file=.env.production.local scripts/create-richard-rand-proposal.ts
 *
 * Safety: creates/updates only Richard Rand prospect records and this proposal.
 * Does not send, share, accept, contract, email, Stripe, invoice, convert, or
 * mutate de Bois / Platinum / Mattas commercial records.
 */
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { calendarDateToStoredInstant } from "../lib/proposal-builder/calendar-date.ts";
import { assertNoInternalLeakage, buildCanonicalProposal } from "../lib/proposal-builder/canonicalize.ts";
import { newId, normalizeProposalDocument } from "../lib/proposal-builder/document.ts";
import { dollarsToCents, formatCents } from "../lib/proposal-builder/money.ts";
import { calculateProposalTotals, totalsToLegacyFields } from "../lib/proposal-builder/pricing.ts";
import type { ProposalDocument } from "../lib/proposal-builder/types.ts";
import { normalizePhoneForStorage } from "../lib/formatting/phone-us.ts";

const TITLE = "Personal Heritage & Digital Archive";
const CLIENT_NAME = "Richard Rand";
const CONTACT_EMAIL = "rrand2000@aol.com";
const CONTACT_PHONE = "310-466-4251";
const CLIENT_SLUG = "richard-rand";
const CONFIRM = "richard-rand-heritage-archive";
const DE_BOIS_PROPOSAL_ID = 1;
const DE_BOIS_LEAD_ID = 6;
const DE_BOIS_INQUIRY_ID = 43;
const PROJECT_CENTS = dollarsToCents("6450");
const PAY_50_CENTS = dollarsToCents("3225");
const PAY_25_CENTS = dollarsToCents("1612.50");
const HOSTING_CENTS = dollarsToCents("299");
const DOMAIN_CENTS = dollarsToCents("15");
const ANNUAL_TOTAL_CENTS = dollarsToCents("314");

const CONTAMINATION = [
  "de bois",
  "debois",
  "randy stern",
  "platinum film",
  "mattas",
  "randy@deboisentertainment.com",
  "KXD-P-2026-0001",
  "5500",
  "$5,500",
  "5,500",
];

function applyEnvFile(relativePath: string): boolean {
  const full = resolve(process.cwd(), relativePath);
  if (!existsSync(full)) return false;
  const text = readFileSync(full, "utf8");
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
  return true;
}

function loadProductionEnv(): void {
  applyEnvFile(".env.vercel.local");
  applyEnvFile(".env.production.local");
  delete process.env.VERCEL;
  delete process.env.VERCEL_ENV;
  delete process.env.MEDIA_BLOB_READ_WRITE_TOKEN;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim() ?? "";
  if (blobToken && !/^vercel_blob_rw_[a-z0-9]+_[a-z0-9]+$/i.test(blobToken)) {
    delete process.env.BLOB_READ_WRITE_TOKEN;
  }
}

function assertProductionTarget(): { host: string; database: string } {
  if (process.env.CONFIRM_PRODUCTION_DRAFT !== CONFIRM) {
    throw new Error(`Set CONFIRM_PRODUCTION_DRAFT=${CONFIRM} to create this live draft.`);
  }
  loadProductionEnv();
  // Local env only for a real PAYLOAD_SECRET; never let it override Neon URI.
  const neonUri =
    process.env.DATABASE_URI?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    "";
  if (!process.env.PAYLOAD_SECRET || process.env.PAYLOAD_SECRET === "[SENSITIVE]") {
    const savedUri = neonUri;
    applyEnvFile(".env.local");
    if (savedUri) {
      process.env.DATABASE_URI = savedUri.replace(/^["']|["']$/g, "");
      process.env.DATABASE_URL = process.env.DATABASE_URI;
      process.env.POSTGRES_URL = process.env.DATABASE_URI;
    }
    if (!process.env.PAYLOAD_SECRET || process.env.PAYLOAD_SECRET === "[SENSITIVE]") {
      process.env.PAYLOAD_SECRET = "kxd-dev-secret-change-in-production";
    }
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
  const cleaned = uri.replace(/^["']|["']$/g, "");
  const parsed = new URL(cleaned);
  const host = parsed.hostname;
  const database = parsed.pathname.replace(/^\//, "").split("?")[0];
  if (host === "127.0.0.1" || host === "localhost") {
    throw new Error("Refusing localhost");
  }
  process.env.DATABASE_URI = cleaned;
  process.env.DATABASE_URL = cleaned;
  process.env.POSTGRES_URL = cleaned;
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

function flattenAuthored(doc: ProposalDocument): string {
  return [
    doc.organizations.map((o) => `${o.name} ${o.brand ?? ""}`).join("\n"),
    doc.contacts.map((c) => `${c.name} ${c.title ?? ""} ${c.email ?? ""} ${c.phone ?? ""}`).join("\n"),
    doc.executive.clientFacingIntro,
    doc.executive.executiveSummary,
    doc.executive.currentSituation,
    doc.executive.objectives,
    doc.executive.recommendedDirection,
    doc.executive.desiredOutcomes,
    doc.executive.clientContext,
    ...doc.scopeGroups.flatMap((g) => [
      g.title,
      g.overview,
      ...g.deliverables.map((d) => `${d.title} ${d.description ?? ""}`),
      g.clientResponsibilities,
      g.kxdResponsibilities,
      g.assumptions,
      g.exclusions,
      g.estimatedTimeline,
    ]),
    ...doc.pricingLines.map((l) => `${l.title} ${l.description ?? ""}`),
    ...doc.credits.map((c) => `${c.label} ${c.notes ?? ""}`),
    ...doc.paymentSchedule.map((p) => `${p.label} ${p.milestoneLabel ?? ""}`),
    doc.terms.proposalTerms,
    doc.terms.paymentAssumptions,
    doc.terms.timelineAssumptions,
    doc.terms.expirationLanguage,
    doc.terms.changeRequestLanguage,
    doc.terms.clientResponsibilities,
    doc.terms.exclusions,
    doc.terms.nextSteps,
    doc.terms.closingNote,
    doc.terms.acceptanceDisclosure,
    doc.terms.contractRequiredDisclosure,
  ]
    .filter(Boolean)
    .join("\n");
}

function assertCleanCopy(text: string, extraBanned: string[] = []): void {
  const lower = text.toLowerCase();
  const hits = [...CONTAMINATION, ...extraBanned].filter((token) =>
    lower.includes(token.toLowerCase()),
  );
  if (hits.length) {
    throw new Error(`Authored copy contains contamination or banned tokens: ${hits.join(", ")}`);
  }
  if (text.includes("—") || text.includes("–")) {
    throw new Error("Authored copy contains em dash or en dash");
  }
}

export function buildDocument(): ProposalDocument {
  const orgId = newId("org");
  const scopeDiscovery = newId("scope");
  const scopeNarrative = newId("scope");
  const scopeDesign = newId("scope");
  const scopeBuild = newId("scope");
  const scopeSearch = newId("scope");
  const scopeDeliverables = newId("scope");
  const lineProject = newId("line");
  const lineHosting = newId("line");
  const lineDomain = newId("line");

  return {
    schemaVersion: 1,
    templateKind: "website-design-development",
    currency: "USD",
    taxRateBps: 0,
    depositCents: 0,
    scheduleCallUrl: "",
    organizations: [{ id: orgId, name: CLIENT_NAME, brand: CLIENT_NAME }],
    contacts: [
      {
        id: newId("contact"),
        name: CLIENT_NAME,
        email: CONTACT_EMAIL,
        phone: normalizePhoneForStorage(CONTACT_PHONE),
        title: "Individual",
        isPrimary: true,
        organizationId: orgId,
      },
    ],
    executive: {
      clientFacingIntro:
        "Richard Rand's career spans decades, continents, properties, development opportunities, and relationships that currently do not exist as one coherent public record.\n\nKreate by Design proposes creating a custom Personal Heritage & Digital Archive that brings this history together through thoughtful storytelling, documented project accounts, photography, historical materials, and a refined digital experience centered on Richard's name.",
      executiveSummary:
        "The platform will establish the central digital source for understanding Richard Rand's personal and professional history.\n\nRather than presenting a conventional resume or promotional personal website, KXD will create an editorial experience built around the places and chapters that shaped his life: Beverly Hills, Hawaii, Australia, and California.\n\nProperties and projects will provide the evidence. Richard's life, decisions, relationships, and perspective will connect the story.",
      currentSituation:
        "This is not a conventional personal website or vanity biography. It is a premium digital historical record documenting Richard Rand's life, properties, developments, project opportunities, relationships, and geographic history.\n\nThe experience should feel like a museum-quality digital archive, an editorial property and development journal, a personal biography, a searchable historical record, and a lasting legacy platform. The tone must remain sophisticated, factual, restrained, editorial, and permanent.\n\nThe story currently follows four geographic chapters:\n\n1. Beverly Hills - Richard's origins and early influences.\n2. Hawaii - approximately 30 years of life and work, including a major body of property and project-development experience, with surfing and Pacific lifestyle as a human thread handled with restraint.\n3. Australia - property and development history, cattle-station history, land, projects, relationships, and significant opportunities.\n4. California - return to California, Los Angeles history, later projects, reflection, and legacy.\n\nRichard has also referenced significant development opportunities, including exclusive rights connected to a football-stadium project. No major ownership, rights, partnership, or development claim will be presented as fact until Richard provides enough documentation or factual detail to support it.",
      objectives:
        "Establish a credible digital record centered on Richard Rand's full professional name. Document important properties, developments, land interests, and project opportunities. Organize decades of photographs, documents, plans, clippings, and correspondence. Build a clear chronological and geographic account of Richard's career. Humanize the history through personal context without turning it into a lifestyle or vanity website. Create an authoritative source that search engines can discover and associate with Richard's name. Preserve the history in a format that can continue to grow over time.",
      recommendedDirection:
        "Kreate by Design will lead a custom creative and editorial direction for a Personal Heritage & Digital Archive. The finished experience should feel architectural, restrained, and permanent rather than promotional.\n\nThe platform will be organized around an editorial homepage, biography and legacy presentation, chronological timeline, place-based chapter navigation across Beverly Hills, Hawaii, Australia, and California, priority property and development stories, and curated archive and media presentation. The design will be responsive across desktop, tablet, and mobile. No off-the-shelf template will be used.\n\nSignificant historical claims will be framed carefully. Where documentation is incomplete, the archive will leave room for later confirmation rather than overstating ownership, rights, partnerships, or development outcomes.",
      desiredOutcomes:
        "A production Personal Heritage & Digital Archive that establishes Richard Rand as the central public source of record for his life and work. An editorial first release with geographic chapters, selected priority stories, historical media presentation, a contact pathway, analytics, and a responsible search foundation. A structure that can continue to grow as materials, corrections, and additional stories become available.",
      clientContext:
        "Client type: Individual / Personal Heritage. Project: Richard Rand Personal Heritage & Digital Archive. No company name or mailing address is recorded for this engagement. Completion is estimated for September 22-25, 2026, contingent on prompt project approval, initial payment, delivery of source materials, factual clarification, and consolidated feedback.",
    },
    scopeGroups: [
      {
        id: scopeDiscovery,
        organizationId: orgId,
        organizationName: CLIENT_NAME,
        title: "A. Discovery and Historical Mapping",
        overview:
          "Confirm the chronology, professional name, priority stories, projects, available evidence, photographs, and historical materials before narrative and design lock.",
        deliverables: deliverables([
          "Focused discovery sessions with Richard",
          "Chronological mapping of his life and career",
          "Identification of priority properties and projects",
          "Identification of companies, partners, locations, and major opportunities",
          "Source and documentation checklist for significant claims",
          "Initial archive inventory and content prioritization",
        ]),
        estimatedTimeline: "Phase 1 inside the September 22-25, 2026 completion window",
        clientResponsibilities:
          "Participate in discovery interviews, identify priority projects and properties, and supply available source materials.",
        kxdResponsibilities:
          "Lead discovery, chronology mapping, priority identification, and the documentation checklist.",
        assumptions:
          "The final initial-release architecture depends on the amount, quality, and organization of Richard's source material.",
        sortOrder: 1,
        inclusion: "included",
      },
      {
        id: scopeNarrative,
        organizationId: orgId,
        organizationName: CLIENT_NAME,
        title: "B. Narrative and Editorial Development",
        overview:
          "Develop the editorial structure and written account from interviews and supplied materials, with factual review against Richard's corrections.",
        deliverables: deliverables([
          "High-level story architecture",
          "Geographic chapter structure",
          "Professional biography",
          "Editorial development from interviews and supplied materials",
          "Project-story framing",
          "Historical captions and contextual introductions",
          "Review and correction of dates, names, entities, and claims with Richard",
        ]),
        estimatedTimeline: "Phase 2 inside the September 22-25, 2026 completion window",
        assumptions:
          "Unsupported ownership, rights, partnership, or development claims will not be published as fact.",
        sortOrder: 2,
        inclusion: "included",
      },
      {
        id: scopeDesign,
        organizationId: orgId,
        organizationName: CLIENT_NAME,
        title: "C. Custom Experience Design",
        overview:
          "Establish a premium editorial visual system and page hierarchy suited to a lasting personal heritage archive.",
        deliverables: deliverables([
          "Custom KXD creative direction",
          "Premium editorial homepage",
          "Biography and legacy presentation",
          "Chronological timeline",
          "Place-based chapter navigation",
          "Priority property and development stories",
          "Curated archive and media presentation",
          "Responsive desktop, tablet, and mobile design",
          "No off-the-shelf template",
        ]),
        estimatedTimeline: "Phases 2-3 inside the September 22-25, 2026 completion window",
        sortOrder: 3,
        inclusion: "included",
      },
      {
        id: scopeBuild,
        organizationId: orgId,
        organizationName: CLIENT_NAME,
        title: "D. Development and Technical Delivery",
        overview:
          "Implement the approved archive experience, content architecture, media presentation, analytics, and production launch.",
        deliverables: deliverables([
          "Custom responsive implementation",
          "Content architecture",
          "Project and story-page system",
          "Image and document presentation",
          "Analytics configuration",
          "Essential accessibility and performance work",
          "Domain and launch configuration",
          "Production deployment",
        ]),
        estimatedTimeline: "Phases 3-4 inside the September 22-25, 2026 completion window",
        sortOrder: 4,
        inclusion: "included",
      },
      {
        id: scopeSearch,
        organizationId: orgId,
        organizationName: CLIENT_NAME,
        title: "E. Search Authority Foundation",
        overview:
          "Build a strong, responsible foundation for search visibility and establish the platform as Richard Rand's central digital source of record. Search-engine rankings, placement, indexing speed, and result timing are controlled by third-party platforms and cannot be guaranteed.",
        deliverables: deliverables([
          "Search-focused titles and descriptions",
          "Clean page headings and semantic structure",
          "Person, article, organization, place, and breadcrumb structured data where appropriate",
          "Search-friendly project and chapter URLs",
          "XML sitemap",
          "Robots and canonical configuration",
          "Google Search Console readiness",
          "Internal linking around Richard's name, projects, entities, and locations",
          "Social-sharing metadata",
        ]),
        estimatedTimeline: "Phases 3-4 inside the September 22-25, 2026 completion window",
        assumptions:
          "KXD will establish the technical and content foundation. Rankings, placement, indexing speed, and result timing are not guaranteed.",
        sortOrder: 5,
        inclusion: "included",
      },
      {
        id: scopeDeliverables,
        organizationId: orgId,
        organizationName: CLIENT_NAME,
        title: "Initial release deliverables",
        overview:
          "The initial release will include the core archive experience below. It does not promise an unlimited number of project stories, photographs, documents, or archive entries. Final first-release architecture will be established during discovery based on available source material.",
        deliverables: deliverables([
          "Editorial homepage",
          "Richard Rand biography",
          "Historical timeline",
          "Beverly Hills chapter",
          "Hawaii chapter",
          "Australia chapter",
          "California chapter",
          "Selected priority property/project stories",
          "Historical media and document presentation",
          "Contact or inquiry pathway",
          "Analytics and technical search foundation",
          "Production launch",
          "Google Search Console submission readiness",
          "Thirty-day post-launch defect warranty",
        ]),
        estimatedTimeline: "Through production launch inside the September 22-25, 2026 window",
        sortOrder: 6,
        inclusion: "included",
      },
    ],
    pricingLines: [
      {
        id: lineProject,
        scopeGroupId: scopeDiscovery,
        organizationId: orgId,
        title: "Personal Heritage & Digital Archive",
        description:
          "Fixed investment for the defined initial Personal Heritage & Digital Archive engagement.",
        cadence: "one-time",
        quantity: 1,
        unitPriceCents: PROJECT_CENTS,
        inclusion: "included",
        sortOrder: 1,
      },
      {
        id: lineHosting,
        organizationId: orgId,
        title: "KXD managed hosting",
        description: "Annual managed hosting beginning at launch and renewing yearly unless canceled before renewal.",
        cadence: "annual",
        quantity: 1,
        unitPriceCents: HOSTING_CENTS,
        inclusion: "included",
        sortOrder: 2,
      },
      {
        id: lineDomain,
        organizationId: orgId,
        title: "Standard .com registration or renewal",
        description:
          "Assumes a standard available .com domain. Premium, brokered, or aftermarket domains are not included.",
        cadence: "annual",
        quantity: 1,
        unitPriceCents: DOMAIN_CENTS,
        inclusion: "included",
        sortOrder: 3,
      },
    ],
    credits: [],
    paymentSchedule: [
      {
        id: newId("pay"),
        label: "50% due upon Direct Agreement signature",
        amountCents: PAY_50_CENTS,
        due: "at-contract",
        sortOrder: 1,
      },
      {
        id: newId("pay"),
        label: "25% due upon approval of the design and narrative direction",
        amountCents: PAY_25_CENTS,
        due: "milestone",
        milestoneLabel: "Design and narrative direction approval",
        sortOrder: 2,
      },
      {
        id: newId("pay"),
        label: "25% due before production launch and domain connection",
        amountCents: PAY_25_CENTS,
        due: "remaining",
        milestoneLabel: "Before production launch and domain connection",
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
        "This proposal covers the initial Personal Heritage & Digital Archive engagement for Richard Rand. By accepting this proposal, Richard Rand authorizes Kreate by Design to prepare the final Direct Agreement based on the scope, investment, schedule, and terms presented here. Proposal acceptance does not replace the formal agreement. Work begins only after the Direct Agreement is signed and the required initial payment is received. Proposal acceptance does not initiate payment or project activation.",
      paymentAssumptions:
        "One-time project investment: $6,450. Payment schedule: 50% ($3,225) due upon Direct Agreement signature; 25% ($1,612.50) due upon approval of the design and narrative direction; 25% ($1,612.50) due before production launch and domain connection. Proposal acceptance itself does not initiate these charges.\n\nAnnual platform costs begin at launch and renew yearly unless canceled before renewal: KXD managed hosting $299 annually; standard .com registration or renewal $15 annually; total standard annual platform cost $314 annually. The $15 domain fee assumes a standard available .com domain. Premium, brokered, or aftermarket domains are not included.",
      timelineAssumptions:
        "Estimated completion: September 22-25, 2026.\n\nProject process:\nPhase 1 - Discovery and Archive Mapping. Confirm the chronology, professional name, priority stories, projects, available evidence, photographs, and historical materials.\nPhase 2 - Narrative and Experience Direction. Develop the editorial structure, visual direction, page hierarchy, and initial narrative.\nPhase 3 - Design and Development. Create the responsive experience, core chapters, priority project stories, archive presentation, and search foundation.\nPhase 4 - Review, Refinement, and Launch. Complete up to two consolidated revision rounds, verify factual corrections, connect the domain, and launch the approved platform.\n\nThe schedule assumes prompt proposal approval, Direct Agreement signature, initial payment, timely delivery of historical materials, timely factual clarification, consolidated feedback, and no major scope expansion after approval.",
      expirationLanguage: "This proposal is valid through September 8, 2026.",
      changeRequestLanguage:
        "The project includes up to two consolidated revision rounds. Major changes after direction approval, new functionality, additional chapters, or substantial additional project stories may require a written scope adjustment.",
      clientResponsibilities:
        "Richard will be responsible for providing his exact professional name; participating in discovery interviews; supplying photographs, documents, plans, clippings, and correspondence; identifying priority projects and properties; correcting or approving names, dates, ownership information, entities, and project descriptions; providing supporting information for significant historical claims; and returning one consolidated set of feedback during each review round.",
      exclusions:
        "The fixed project fee includes the agreed initial platform and curated first release. It does not include unlimited archival or historical research; legal verification or legal opinions; third-party licensing fees; travel; new photography or videography; professional document scanning; extensive photo or document restoration; purchasing access to private archives; premium-domain acquisition; unlimited project-story production; unlimited revisions; or ongoing monthly content entry after launch. Additional services require written approval and may be quoted separately.",
      nextSteps:
        "1. Review the proposed scope, investment, schedule, and terms.\n2. Accept the proposal when ready to move forward.\n3. Kreate by Design will prepare the formal Direct Agreement for review and signature.\n4. The project will begin once the Direct Agreement is signed and the initial payment is received.\n5. Discovery and archival-material collection will then be scheduled.",
      closingNote:
        "Acceptance authorizes Kreate by Design to prepare the Direct Agreement only. It does not charge the client, create or mark an invoice as paid, activate the project, replace the formal agreement, or serve as the final legal signature.",
      acceptanceDisclosure:
        "By accepting this proposal, Richard Rand authorizes Kreate by Design to prepare the final Direct Agreement based on the scope, investment, schedule, and terms presented here. Proposal acceptance does not replace the formal agreement. Work begins only after the Direct Agreement is signed and the required initial payment is received.",
      contractRequiredDisclosure:
        "Work begins only after the Direct Agreement is signed and the required initial payment is received. Proposal acceptance does not initiate payment or project activation.",
    },
    internal: {
      internalNotes:
        "DRAFT / INTERNAL REVIEW. Personal Heritage & Digital Archive for Richard Rand (individual). Email rrand2000@aol.com. Phone (310) 466-4251. Do not invent a company name or mailing address. Do not present stadium rights or other major ownership/rights/partnership claims as fact without documentation. Fixed project $6,450. Annual platform $314 ($299 hosting + $15 standard .com). Do not reference any earlier $5,500 estimate. Do not send, share, accept, invoice, Stripe, convert, or onboard without explicit approval. Protect de Bois, Platinum, and Mattas records.",
      internalOwner: "Matt Lunger",
    },
  };
}

async function findExistingProspect(payload: {
  find: (args: Record<string, unknown>) => Promise<{ docs: Array<Record<string, unknown>> }>;
}): Promise<{
  salesLeads: Array<Record<string, unknown>>;
  clients: Array<Record<string, unknown>>;
  contacts: Array<Record<string, unknown>>;
  inquiries: Array<Record<string, unknown>>;
  projectInquiries: Array<Record<string, unknown>>;
  researchLeads: Array<Record<string, unknown>>;
  proposals: Array<Record<string, unknown>>;
}> {
  const phoneDigits = "3104664251";
  const [salesLeads, clients, contacts, inquiries, projectInquiries, researchLeads, proposals] =
    await Promise.all([
      payload.find({
        collection: "sales-leads",
        where: {
          or: [
            { companyName: { equals: CLIENT_NAME } },
            { contactName: { equals: CLIENT_NAME } },
            { email: { equals: CONTACT_EMAIL } },
            { phone: { contains: "466-4251" } },
            { phone: { contains: phoneDigits } },
          ],
        },
        limit: 10,
        depth: 0,
        overrideAccess: true,
      }),
      payload.find({
        collection: "clients",
        where: {
          or: [
            { name: { equals: CLIENT_NAME } },
            { slug: { equals: CLIENT_SLUG } },
            { primaryContactEmail: { equals: CONTACT_EMAIL } },
          ],
        },
        limit: 10,
        depth: 0,
        overrideAccess: true,
      }),
      payload.find({
        collection: "client-contacts",
        where: {
          or: [
            { name: { equals: CLIENT_NAME } },
            { email: { equals: CONTACT_EMAIL } },
            { phone: { contains: "466-4251" } },
          ],
        },
        limit: 10,
        depth: 0,
        overrideAccess: true,
      }),
      payload.find({
        collection: "inquiries",
        where: {
          or: [
            { name: { equals: CLIENT_NAME } },
            { email: { equals: CONTACT_EMAIL } },
            { phone: { contains: "466-4251" } },
          ],
        },
        limit: 10,
        depth: 0,
        overrideAccess: true,
      }),
      payload.find({
        collection: "project-inquiries",
        where: {
          or: [
            { contactName: { equals: CLIENT_NAME } },
            { email: { equals: CONTACT_EMAIL } },
            { phone: { contains: "466-4251" } },
          ],
        },
        limit: 10,
        depth: 0,
        overrideAccess: true,
      }),
      payload.find({
        collection: "research-leads",
        where: {
          or: [
            { businessName: { contains: "Richard Rand" } },
            { contactEmail: { equals: CONTACT_EMAIL } },
            { contactPhone: { contains: "466-4251" } },
          ],
        },
        limit: 10,
        depth: 0,
        overrideAccess: true,
      }),
      payload.find({
        collection: "proposals",
        where: {
          or: [
            { title: { equals: TITLE } },
            { title: { contains: "Richard Rand" } },
            { title: { contains: "Personal Heritage" } },
          ],
        },
        limit: 10,
        depth: 0,
        overrideAccess: true,
      }),
    ]);

  return {
    salesLeads: salesLeads.docs,
    clients: clients.docs,
    contacts: contacts.docs,
    inquiries: inquiries.docs,
    projectInquiries: projectInquiries.docs,
    researchLeads: researchLeads.docs,
    proposals: proposals.docs,
  };
}

async function snapshotDeBois(payload: {
  findByID: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
}): Promise<{ id: number; title: string; status: string; updatedAt: string; leadId: unknown }> {
  const record = await payload.findByID({
    collection: "proposals",
    id: DE_BOIS_PROPOSAL_ID,
    depth: 0,
    overrideAccess: true,
  });
  if (String(record.title) !== "de Bois Entertainment Website Rebuild") {
    throw new Error("Safety check failed: proposal 1 is not the de Bois record. Refusing to proceed.");
  }
  return {
    id: Number(record.id),
    title: String(record.title),
    status: String(record.status),
    updatedAt: String(record.updatedAt),
    leadId: record.lead,
  };
}

async function ensureClient(payload: {
  create: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
  update: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
}, existing: Array<Record<string, unknown>>): Promise<{ id: number; created: boolean; reused: boolean }> {
  if (existing.length > 1) {
    throw new Error("Multiple matching client records found. Resolve before creating the proposal.");
  }
  const phone = normalizePhoneForStorage(CONTACT_PHONE);
  const notes =
    "Individual / Personal Heritage. Project: Richard Rand Personal Heritage & Digital Archive. No company name or mailing address on file. Do not invent either.";

  if (existing.length === 1) {
    const current = existing[0];
    const updated = await payload.update({
      collection: "clients",
      id: Number(current.id),
      data: {
        name: CLIENT_NAME,
        slug: String(current.slug ?? CLIENT_SLUG),
        status: current.status === "active" ? current.status : "prospect",
        primaryContactName: CLIENT_NAME,
        primaryContactEmail: CONTACT_EMAIL,
        nextAction: "Review Personal Heritage & Digital Archive proposal",
        notes,
      },
      overrideAccess: true,
    });
    return { id: Number(updated.id), created: false, reused: true };
  }

  const created = await payload.create({
    collection: "clients",
    data: {
      name: CLIENT_NAME,
      slug: CLIENT_SLUG,
      status: "prospect",
      primaryContactName: CLIENT_NAME,
      primaryContactEmail: CONTACT_EMAIL,
      nextAction: "Review Personal Heritage & Digital Archive proposal",
      notes,
      relationshipStatus: "healthy",
    },
    overrideAccess: true,
  });
  return { id: Number(created.id), created: true, reused: false };
}

async function ensureLead(payload: {
  create: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
  update: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
}, existing: Array<Record<string, unknown>>): Promise<{
  id: number;
  created: boolean;
  statusBefore: string | null;
}> {
  if (existing.length > 1) {
    throw new Error("Multiple matching sales leads found. Resolve before creating the proposal.");
  }
  const phone = normalizePhoneForStorage(CONTACT_PHONE);
  const shared = {
    companyName: CLIENT_NAME,
    contactName: CLIENT_NAME,
    email: CONTACT_EMAIL,
    phone,
    industry: "Individual / Personal Heritage",
    source: "Direct conversation",
    status: "proposal",
    nextAction: "send-proposal",
    assignedTo: "Matt Lunger",
    estimatedValue: 6450,
    probability: 60,
    tags: "individual,personal-heritage,digital-archive,website",
    notes:
      "Richard Rand Personal Heritage & Digital Archive. Individual client. Email and phone confirmed. No company name or mailing address. Proposal draft only until approved for sharing.",
  };

  if (existing.length === 1) {
    const lead = existing[0];
    if (Number(lead.id) === DE_BOIS_LEAD_ID) {
      throw new Error("Matched de Bois lead 6. Refusing to attach this proposal to de Bois.");
    }
    const statusBefore = String(lead.status ?? "");
    const updated = await payload.update({
      collection: "sales-leads",
      id: Number(lead.id),
      data: shared,
      overrideAccess: true,
    });
    return { id: Number(updated.id), created: false, statusBefore };
  }

  const created = await payload.create({
    collection: "sales-leads",
    data: shared,
    overrideAccess: true,
  });
  return { id: Number(created.id), created: true, statusBefore: String(created.status ?? "proposal") };
}

async function runCreateRichardRandProposal() {
  assertProductionTarget();

  const { getPayload } = await import("payload");
  const { default: config } = await import("@payload-config");
  const payload = await getPayload({ config });
  const deBoisBefore = await snapshotDeBois(payload as never);
  const matches = await findExistingProspect(payload as never);

  if (matches.contacts.length > 0) {
    console.log(
      `[create-draft] existing client-contacts matched: ${matches.contacts.map((d) => d.id).join(", ")}`,
    );
  }

  const client = await ensureClient(payload as never, matches.clients);
  const lead = await ensureLead(payload as never, matches.salesLeads);

  const existing = await payload.find({
    collection: "proposals" as never,
    where: {
      and: [{ title: { equals: TITLE } }, { lead: { equals: lead.id } }],
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
        acceptedAt?: string | null;
        relatedContract?: unknown;
      }
    | undefined;

  const document = buildDocument();
  assertCleanCopy(flattenAuthored(document), [
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
    "tailored",
    "world-class",
    "holistic",
    "captivating",
    "meticulously",
    "payload",
    "kxd os",
    "operator",
    "agreement preparation",
  ]);

  const totals = calculateProposalTotals(document);
  if (totals.oneTimeTotalCents !== PROJECT_CENTS) {
    throw new Error(`Expected $6,450.00, got ${formatCents(totals.oneTimeTotalCents)}`);
  }
  if (totals.annualTotalCents !== ANNUAL_TOTAL_CENTS) {
    throw new Error(`Expected annual $314.00, got ${formatCents(totals.annualTotalCents)}`);
  }
  if (totals.monthlyTotalCents !== 0) {
    throw new Error(`Expected no monthly amount, got ${formatCents(totals.monthlyTotalCents)}`);
  }
  const scheduleSum = document.paymentSchedule.reduce((sum, item) => sum + item.amountCents, 0);
  if (scheduleSum !== totals.oneTimeTotalCents) {
    throw new Error("Payment schedule does not equal one-time total");
  }
  if (PAY_50_CENTS + PAY_25_CENTS + PAY_25_CENTS !== PROJECT_CENTS) {
    throw new Error("Milestone arithmetic failed");
  }
  if (HOSTING_CENTS + DOMAIN_CENTS !== ANNUAL_TOTAL_CENTS) {
    throw new Error("Annual platform arithmetic failed");
  }

  const normalized = normalizeProposalDocument(document);
  const legacy = totalsToLegacyFields(totals);

  const draftFields = {
    title: TITLE,
    heroTitle: TITLE,
    heroSubtitle:
      "An authoritative digital record of a life in property, development, place and possibility.",
    builderDocument: normalized,
    investment: legacy.investment,
    recurringAmount: 0,
    discountType: "none",
    depositType: "percent-50",
    depositRequired: true,
    paymentStatus: "none",
    pricingSnapshot: legacy.pricingSnapshot,
    investmentSummary:
      "Personal Heritage & Digital Archive: $6,450 one-time. 50% upon Direct Agreement signature ($3,225), 25% upon design and narrative direction approval ($1,612.50), 25% before production launch ($1,612.50). Annual platform: $314 ($299 hosting + $15 standard .com).",
    executiveSummary: normalized.executive.executiveSummary,
    scope: normalized.scopeGroups.map((g) => g.title).join("; "),
    deliverables: normalized.scopeGroups
      .flatMap((g) => g.deliverables.map((d) => d.title))
      .join("; "),
    timeline: normalized.terms.timelineAssumptions,
    terms: normalized.terms.proposalTerms,
    internalNotes: normalized.internal.internalNotes,
    client: client.id,
  };

  if (existingDoc) {
    if (existingDoc.id === DE_BOIS_PROPOSAL_ID) {
      throw new Error("Refusing to overwrite the de Bois proposal.");
    }
    if (
      existingDoc.sentAt ||
      existingDoc.shareApprovedAt ||
      existingDoc.acceptedAt ||
      existingDoc.relatedContract
    ) {
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
        approvalStatus: "none",
        proposalDate: calendarDateToStoredInstant("2026-09-01"),
        expiresAt: calendarDateToStoredInstant("2026-09-08"),
      } as never,
      overrideAccess: true,
    });
    await reportResult({
      payload,
      reused: true,
      client,
      lead,
      reviewed,
      document,
      totals,
      normalized,
      matches,
      deBoisBefore,
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
  if (proposalNumber === "KXD-P-2026-0001") {
    throw new Error("Refusing to reuse the de Bois proposal number.");
  }

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
      proposalDate: calendarDateToStoredInstant("2026-09-01"),
      expiresAt: calendarDateToStoredInstant("2026-09-08"),
      lead: lead.id,
      versionHistory: [
        {
          version: 1,
          notes: "Initial internal draft for Richard Rand Personal Heritage & Digital Archive.",
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

  if (record.id === DE_BOIS_PROPOSAL_ID) {
    throw new Error("Created record collided with de Bois proposal id 1.");
  }

  const reviewed = await payload.update({
    collection: "proposals" as never,
    id: record.id,
    data: { status: "internal-review" } as never,
    overrideAccess: true,
  });

  await reportResult({
    payload,
    reused: false,
    client,
    lead,
    reviewed: reviewed as Record<string, unknown>,
    document,
    totals,
    normalized,
    matches,
    deBoisBefore,
  });
}

async function reportResult(input: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
  reused: boolean;
  client: { id: number; created: boolean; reused: boolean };
  lead: { id: number; created: boolean; statusBefore: string | null };
  reviewed: Record<string, unknown>;
  document: ProposalDocument;
  totals: ReturnType<typeof calculateProposalTotals>;
  normalized: ProposalDocument;
  matches: Awaited<ReturnType<typeof findExistingProspect>>;
  deBoisBefore: Awaited<ReturnType<typeof snapshotDeBois>>;
}): Promise<void> {
  const {
    payload,
    reused,
    client,
    lead,
    reviewed,
    document,
    totals,
    normalized,
    matches,
    deBoisBefore,
  } = input;

  const leadAfter = (await payload.findByID({
    collection: "sales-leads" as never,
    id: lead.id,
    depth: 0,
    overrideAccess: true,
  })) as { id: number; status?: string; companyName?: string; contactName?: string; email?: string };

  const clientAfter = (await payload.findByID({
    collection: "clients" as never,
    id: client.id,
    depth: 0,
    overrideAccess: true,
  })) as {
    id: number;
    name?: string;
    slug?: string;
    status?: string;
    primaryContactEmail?: string;
  };

  const deBoisAfter = await snapshotDeBois(payload);
  if (deBoisAfter.updatedAt !== deBoisBefore.updatedAt || deBoisAfter.status !== deBoisBefore.status) {
    throw new Error("de Bois proposal changed during this run. Stop and inspect.");
  }
  const deBoisInquiry = (await payload.findByID({
    collection: "inquiries" as never,
    id: DE_BOIS_INQUIRY_ID,
    depth: 0,
    overrideAccess: true,
  })) as { id: number };

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
  assertCleanCopy(
    [
      canonical.executive.clientFacingIntro,
      canonical.executive.executiveSummary,
      canonical.executive.currentSituation,
      canonical.executive.objectives,
      canonical.executive.recommendedDirection,
      canonical.executive.desiredOutcomes,
      canonical.executive.clientContext,
      ...canonical.scopeGroups.flatMap((g) => [
        g.title,
        g.overview,
        ...g.deliverables.map((d) => d.title),
      ]),
      ...canonical.pricingLines.map((l) => l.title),
      canonical.terms.proposalTerms,
      canonical.terms.paymentAssumptions,
      canonical.terms.timelineAssumptions,
      canonical.terms.exclusions,
      canonical.terms.nextSteps,
      canonical.terms.closingNote,
      canonical.terms.acceptanceDisclosure,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  console.log(
    JSON.stringify(
      {
        reused,
        id: reviewed.id,
        status: reviewed.status,
        approvalStatus: reviewed.approvalStatus,
        proposalNumber: reviewed.proposalNumber,
        proposalDate: reviewed.proposalDate,
        expiresAt: reviewed.expiresAt,
        clientId: clientAfter.id,
        clientCreated: client.created,
        clientReused: client.reused,
        clientName: clientAfter.name,
        clientSlug: clientAfter.slug,
        clientStatus: clientAfter.status,
        clientEmail: clientAfter.primaryContactEmail,
        leadId: lead.id,
        leadCreated: lead.created,
        leadCompany: leadAfter.companyName,
        leadContact: leadAfter.contactName,
        leadEmail: leadAfter.email,
        leadStatusBefore: lead.statusBefore,
        leadStatusAfter: leadAfter.status,
        matchedExisting: {
          salesLeads: matches.salesLeads.map((d) => d.id),
          clients: matches.clients.map((d) => d.id),
          contacts: matches.contacts.map((d) => d.id),
          inquiries: matches.inquiries.map((d) => d.id),
          projectInquiries: matches.projectInquiries.map((d) => d.id),
          researchLeads: matches.researchLeads.map((d) => d.id),
          proposals: matches.proposals.map((d) => d.id),
        },
        oneTimeTotal: formatCents(totals.oneTimeTotalCents),
        annualTotal: formatCents(totals.annualTotalCents),
        monthlyTotal: formatCents(totals.monthlyTotalCents),
        paymentSchedule: document.paymentSchedule.map((item) => ({
          label: item.label,
          amount: formatCents(item.amountCents),
          due: item.due,
        })),
        scopeGroups: document.scopeGroups.map((g) => g.title),
        editUrl: `/admin/sales/proposals/${reviewed.id}`,
        previewUrl: `/admin/sales/proposals/${reviewed.id}/preview`,
        pdfUrl: `/api/admin/proposal-builder/${reviewed.id}/pdf`,
        sent: false,
        shared: Boolean(Array.isArray(reviewed.shareLinks) && reviewed.shareLinks.length),
        contracted: Boolean(reviewed.relatedContract),
        conversionExecutedAt: reviewed.conversionExecutedAt ?? null,
        paymentStatus: reviewed.paymentStatus ?? null,
        deBoisUntouched: {
          id: deBoisAfter.id,
          status: deBoisAfter.status,
          updatedAt: deBoisAfter.updatedAt,
          leadId: DE_BOIS_LEAD_ID,
          inquiryId: deBoisInquiry.id,
        },
      },
      null,
      2,
    ),
  );
}

const isDirectRun = process.argv[1]?.includes("create-richard-rand-proposal");
if (isDirectRun) {
  runCreateRichardRandProposal()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    });
}
