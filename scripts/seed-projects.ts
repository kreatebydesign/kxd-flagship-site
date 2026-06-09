/**
 * seed-projects.ts
 *
 * Seeds the Payload Projects collection with KXD's flagship case studies.
 * Run: npm run seed:projects (requires DATABASE_URI env var pointing to Neon)
 *
 * Idempotent — searches by slug, updates if found, creates if missing.
 * Only seeds projects that accurately represent KXD today.
 */

import { getPayload } from "payload";
import config from "../payload.config";

// ── Project data ──────────────────────────────────────────────────────────────

const projects = [
  // ════════════════════════════════════════════════════════════════
  //  A) Primal Motorsports  — PRIMARY
  //     Enterprise Platform, Driver Portal, Primal OS
  // ════════════════════════════════════════════════════════════════
  {
    title: "Primal Motorsports",
    slug: "primal-motorsports",
    client: "Primal Motorsports",
    industry: "Motorsports",
    projectType: "enterprise-platform" as const,
    tier: "primary" as const,
    year: 2025,
    featured: true,
    status: "published" as const,
    publishedAt: new Date().toISOString(),
    order: 1,

    // ── Card fields ─────────────────────────────────────────────
    summary:
      "Website, membership architecture, driver portal, operations platform, and CRM infrastructure for one of motorsports' most ambitious brands.",
    service: "Enterprise Platform & Operations",
    outcome:
      "Flagship presence for a performance brand that competes at the top.",
    description:
      "A multi-system digital platform: premium public brand, driver member portal, operational management layer, and CRM infrastructure — purpose-built for Primal Motorsports.",

    // ── Case study fields ────────────────────────────────────────
    tagline:
      "Building the digital foundation for a modern motorsports organization.",
    liveUrl: "https://primalmotorsports.com",
    scope: [
      { item: "Enterprise Platform" },
      { item: "Luxury Website Experiences" },
      { item: "Growth Infrastructure" },
      { item: "Operational Systems" },
    ],
    context:
      "Primal Motorsports isn't a weekend racing club. It's a competitive organization with professional drivers, live events, and a growing ecosystem of partners, members, and fans. The brand had real momentum and real credibility — but the digital infrastructure didn't reflect either. What existed online was a starting point. What the organization needed was a foundation built to support every part of how they actually operate: public brand, driver member access, partner visibility, operational management, and enrollment at scale.",
    challenge:
      "Three distinct audiences, three distinct needs — and no existing infrastructure to serve any of them well. Prospective partners needed to see a brand worthy of serious investment. Team members and drivers needed operational tools that matched how they actually worked. Leadership needed visibility across the organization without adding administrative overhead. A single marketing website wasn't going to solve that. The scope required architecture, not decoration. The challenge was building a unified system that served each audience at the right level without creating complexity for the team behind it.",
    strategy:
      "Strategy first. KXD mapped each audience independently — what they needed to see, what they needed to do, and what a failed digital experience would cost the organization. From there, the architecture emerged: a premium public-facing presence designed around partner credibility, a member-authenticated driver portal built for team accountability and access, a CRM foundation to manage leads and enrollment, and an operations interface that gave leadership the visibility to run the organization with confidence. Every decision was evaluated against the same standard: does this serve the organization's actual goals, or does it just look like a motorsports website?",
    execution: [
      {
        item: "Flagship website — premium brand presence built for partner and sponsor conversations, with clear positioning, cinematic visual treatment, and structured inquiry pathways.",
      },
      {
        item: "Driver portal — member-authenticated experience enabling driver data access, team workflows, document management, and organizational accountability.",
      },
      {
        item: "Primal OS — internal operations interface giving leadership visibility across events, logistics, and team coordination without adding administrative complexity.",
      },
      {
        item: "CRM infrastructure — lead capture, inquiry routing, and follow-up workflows wired to organizational outcomes, reducing manual overhead at every stage of the funnel.",
      },
      {
        item: "Enrollment systems — structured application and onboarding flows for driving programs, memberships, and event registration, built to scale with program growth.",
      },
      {
        item: "Ongoing platform partnership — continuous development, feature expansion, and optimization across the full platform ecosystem as the organization grows.",
      },
    ],
    outcomes: [
      { item: "Flagship digital presence that holds weight in partner and sponsor conversations" },
      { item: "Member infrastructure supporting driver accountability, access, and operational clarity" },
      { item: "Internal operations layer that scales with organizational growth without adding overhead" },
      { item: "CRM and enrollment foundation that converts interest into qualified program participants" },
      { item: "A unified digital identity across three distinct audience experiences" },
    ],
    whyItWorked:
      "The result works because it was designed around the organization's actual needs — not what a motorsports website is supposed to look like. Every section earns its place. Every experience serves a defined audience. The CRM isn't an add-on — it's the connective tissue between public brand, member access, and operations. The outcome wasn't driven by trend or template — it came from asking harder questions upfront and holding the architecture to the same standard the team holds itself on track.",
  },

  // ════════════════════════════════════════════════════════════════
  //  B) Plate The Umpqua  — PRIMARY
  //     Luxury hospitality website, CMS, inquiry system
  // ════════════════════════════════════════════════════════════════
  {
    title: "Plate the Umpqua",
    slug: "plate-the-umpqua",
    client: "Plate the Umpqua",
    industry: "Hospitality",
    projectType: "luxury-website" as const,
    tier: "primary" as const,
    year: 2025,
    featured: false,
    status: "published" as const,
    publishedAt: new Date().toISOString(),
    order: 2,
    logoUrl: "/migrated-assets/logos/plate-the-umpqua.svg",

    // ── Card fields ─────────────────────────────────────────────
    summary:
      "Luxury hospitality website, custom CMS implementation, premium inquiry experience, and operational systems foundation for a private regional dining brand.",
    service: "Luxury Website Experiences",
    outcome:
      "Hospitality brought online with the same care as the dining room.",
    description:
      "A refined digital foundation built to carry the brand's hospitality standard — from the first impression through inquiry, booking, and ongoing operations.",

    // ── Case study fields ────────────────────────────────────────
    tagline:
      "Elevating private hospitality through intentional digital experiences.",
    liveUrl: "https://platetheumpqua.com",
    scope: [
      { item: "Luxury Website Experiences" },
      { item: "Brand Systems & Identity" },
      { item: "Operational Systems" },
    ],
    context:
      "Plate the Umpqua is the kind of hospitality experience that earns its reputation through the room, not the marketing. Guest loyalty was built through care, craft, and attention to detail that most dining experiences don't attempt. The brand had something genuine — it needed a digital presence that could carry it. The existing introduction online was underselling the standard at every touchpoint, from first impression through inquiry and reservation.",
    challenge:
      "First impressions happen before arrival. For most prospective guests, the website is the experience before the experience — and it was underselling everything the brand had earned. The gap between what a guest found online and what they encountered in the room was creating the wrong expectation before they'd even made a reservation. Beyond the public-facing experience, the team had no operational infrastructure to manage inquiries, track requests, or maintain the level of service consistency the brand required at scale.",
    strategy:
      "The approach was precise: treat the website as the opening chapter of the hospitality experience — not a listing, not a booking page, but an invitation. Warmth first. Specificity second. The tone, layout, and content hierarchy were all built to replicate the feeling of being welcomed — before the guest arrives. The CMS implementation was designed around the team's actual workflow, not a generic template. The inquiry system was built to match the brand's service standard — thoughtful, personal, and clear — while giving the team the operational visibility they needed to run it confidently.",
    execution: [
      {
        item: "Brand-aligned web presence — a refined digital introduction that matches the hospitality standard guests experience in the room, built with editorial precision and warmth.",
      },
      {
        item: "Custom CMS implementation — a content management system designed around the team's actual workflow, allowing the brand to manage menus, experiences, and events without technical dependencies.",
      },
      {
        item: "Premium inquiry experience — structured, low-friction inquiry and reservation flows that feel aligned with the brand's hospitality ethos and convert interest into bookings.",
      },
      {
        item: "Hospitality operational systems foundation — backend infrastructure for inquiry management, guest communication workflows, and request tracking — giving the team operational visibility without overhead.",
      },
      {
        item: "Editorial storytelling — content architecture that communicates the brand's character, regional identity, and genuine craft without over-explaining.",
      },
    ],
    outcomes: [
      { item: "Digital presence that carries the same standard as the in-person experience" },
      { item: "Refined first impression that sets the right expectation before arrival" },
      { item: "Inquiry experience that feels aligned with the brand's hospitality ethos" },
      { item: "Operational infrastructure that scales with the brand's growth and service complexity" },
      { item: "CMS foundation the team can manage without external dependencies" },
    ],
    whyItWorked:
      "Hospitality is about making people feel something before they've decided anything. The site does that now. It doesn't try to list every offering or justify every choice — it makes you want to be there. The CMS was built for the team, not for a developer. The operational foundation was built to match how the brand actually runs — not how a generic system assumes hospitality works. No more gap between the promise and the introduction.",
  },

  // ════════════════════════════════════════════════════════════════
  //  C) AutoDV8ions  — SECONDARY
  //     Automotive brand, quote system, CRM, lead infrastructure
  // ════════════════════════════════════════════════════════════════
  {
    title: "AutoDV8ions",
    slug: "autodv8ions",
    client: "AutoDV8ions",
    industry: "Automotive",
    projectType: "luxury-website" as const,
    tier: "secondary" as const,
    year: 2025,
    featured: false,
    status: "published" as const,
    publishedAt: new Date().toISOString(),
    order: 3,
    logoUrl: "/migrated-assets/logos/dv8.svg",

    // ── Card fields ─────────────────────────────────────────────
    summary:
      "Brand-forward automotive website, quote system implementation, CRM integrations, email workflow infrastructure, and lead capture optimization for a boutique performance studio.",
    service: "Growth Infrastructure & Digital Experience",
    outcome:
      "Boutique automotive identity with a point of view sharp enough to cut.",
    description:
      "Premium automotive web experience wired for growth — brand-forward design, a structured quote system, CRM integration, and email workflows that convert qualified interest into direct conversations.",

    // ── Case study fields ────────────────────────────────────────
    tagline: "Transforming automotive interest into qualified opportunities.",
    liveUrl: "https://autodv8ions.com",
    scope: [
      { item: "Luxury Website Experiences" },
      { item: "Growth Infrastructure" },
      { item: "Brand Systems & Identity" },
    ],
    context:
      "AutoDV8ions is a boutique automotive studio that earns its reputation through precision and a point of view. Referral-driven, quality-focused, and deeply committed to doing the work right — the kind of studio where every client is a qualified one. The work was exceptional. The digital introduction wasn't anywhere close. And without a system to capture and qualify inbound interest, the studio was leaving growth on the table — dependent entirely on word-of-mouth with no infrastructure to scale it.",
    challenge:
      "Reputation is powerful. It's also invisible online. The studio's craftsmanship and aesthetic were well-known to those who already knew — but without a digital presence that matched the studio's standard, growth was limited to the reach of existing word-of-mouth. Qualified prospects were finding nothing, or finding something that didn't reflect the quality of the actual work. Beyond the brand, there was no structured way for prospects to get a quote, no CRM to track interest, and no email infrastructure to follow up with leads consistently.",
    strategy:
      "Lead with identity, not services. The strategy wasn't to build a bigger audience — it was to build the right first impression for the right client, and then wire a complete growth system behind it. Design itself as demonstration: if the site looks like it was built with care and precision, it sets the expectation that the studio operates the same way. The quote system was designed to qualify at the point of entry. The CRM integration was built to give the studio visibility without complexity. Email workflows were structured to maintain contact without requiring manual follow-up at every stage.",
    execution: [
      {
        item: "Brand-forward website — identity-led design built to communicate the studio's point of view before its service list, with visual precision that reflects the actual work.",
      },
      {
        item: "Quote system implementation — a structured, brand-aligned quote request flow that qualifies prospects at the point of contact and reduces friction from interest to conversation.",
      },
      {
        item: "CRM integrations — lightweight CRM setup wired to the quote system, giving the studio visibility into the full pipeline without adding administrative overhead.",
      },
      {
        item: "Email workflow infrastructure — automated follow-up sequences and lead nurture flows that maintain contact with qualified prospects without requiring manual intervention at every stage.",
      },
      {
        item: "Lead capture optimization — structured inquiry pathways, conversion-focused content hierarchy, and clear calls-to-action that convert the right visitors into direct conversations.",
      },
    ],
    outcomes: [
      { item: "Digital identity that reflects the studio's precision and point of view" },
      { item: "Quote system that qualifies prospects before the first conversation" },
      { item: "CRM and email infrastructure converting passive interest into active pipeline" },
      { item: "Brand-forward presence that attracts aligned, quality-focused clients" },
      { item: "Growth foundation the studio can run without adding operational complexity" },
    ],
    whyItWorked:
      "It works because it's specific. It's not trying to appeal to everyone — it's built for the client who already has taste, who recognizes quality when they see it, and wants to work with people who hold the same standard. The quote system doesn't just collect information — it communicates that the studio takes qualification seriously. The CRM isn't a burden — it's a 30-second daily visibility check. That specificity is the strategy. Broad positioning produces unqualified inquiries. Sharp positioning produces the right ones.",
  },
];

// ── Seed runner ───────────────────────────────────────────────────────────────

async function seedProjects() {
  const payload = await getPayload({ config });

  console.log(`\nSeeding ${projects.length} projects...\n`);

  for (const project of projects) {
    try {
      const existing = await payload.find({
        collection: "projects",
        where: { slug: { equals: project.slug } },
        limit: 1,
      });

      if (existing.docs.length > 0) {
        const doc = existing.docs[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await payload.update({ collection: "projects", id: doc.id, data: project as any });
        console.log(`  ✔ Updated: ${project.title}`);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await payload.create({ collection: "projects", data: project as any });
        console.log(`  ✦ Created: ${project.title}`);
      }
    } catch (err) {
      console.error(`  ✘ Failed:  ${project.title}`, err);
    }
  }

  console.log("\nProjects seed complete.\n");
  process.exit(0);
}

seedProjects().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
