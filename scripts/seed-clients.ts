/**
 * seed-clients.ts
 *
 * Seeds the Payload Clients collection with KXD's known client roster.
 * Run: npm run seed:clients (requires DATABASE_URI env var pointing to Neon)
 *
 * Idempotent — searches by slug, updates if found, creates if missing.
 * Does not touch Services, Projects, Insights, Inquiries, or ProjectInquiries.
 */

import { getPayload } from "payload";
import config from "../payload.config";

// ── Client data ───────────────────────────────────────────────────────────────

const clients = [
  // ── 1. Primal Motorsports ─────────────────────────────────────────────────
  {
    name: "Primal Motorsports",
    slug: "primal-motorsports",
    status: "active" as const,
    primaryContactName: "",
    primaryContactEmail: "",
    companyWebsite: "https://primalmotorsports.com",
    brandTier: "flagship" as const,
    monthlyRetainerAmount: 1200,
    billingDay: null,
    nextBillingDate: null,
    relationshipStatus: "healthy" as const,
    nextAction:
      "Follow up with Adam and Tyler for website revisions and prepare Google Ads performance/continuation recommendation before campaign ends.",
    nextActionDueDate: null,
    notes:
      "KXD's anchor flagship client. Multi-system enterprise platform: public website, driver portal, Primal OS, CRM infrastructure, enrollment systems. Ongoing development partnership.",
  },

  // ── 2. Democratic Club of Greater Tracy ───────────────────────────────────
  {
    name: "Democratic Club of Greater Tracy",
    slug: "democratic-club-greater-tracy",
    status: "active" as const,
    primaryContactName: "",
    primaryContactEmail: "",
    companyWebsite: "",
    brandTier: "growth" as const,
    monthlyRetainerAmount: null,
    billingDay: null,
    nextBillingDate: null,
    relationshipStatus: "healthy" as const,
    nextAction: "Review scope and next deliverable",
    nextActionDueDate: null,
    notes:
      "Local civic organization. Website and digital presence work.",
  },

  // ── 3. AutoDV8ions ────────────────────────────────────────────────────────
  {
    name: "AutoDV8ions",
    slug: "autodv8ions",
    status: "active" as const,
    primaryContactName: "",
    primaryContactEmail: "",
    companyWebsite: "https://autodv8ions.com",
    brandTier: "growth" as const,
    monthlyRetainerAmount: null,
    billingDay: null,
    nextBillingDate: null,
    relationshipStatus: "healthy" as const,
    nextAction: "Review ongoing scope and platform status",
    nextActionDueDate: null,
    notes:
      "Boutique automotive performance studio. Brand-forward website, quote system, CRM integration, email workflow infrastructure, lead capture optimization.",
  },

  // ── 4. Plate The Umpqua ───────────────────────────────────────────────────
  {
    name: "Plate The Umpqua",
    slug: "plate-the-umpqua",
    status: "active" as const,
    primaryContactName: "",
    primaryContactEmail: "",
    companyWebsite: "https://platetheumpqua.com",
    brandTier: "flagship" as const,
    monthlyRetainerAmount: null,
    billingDay: null,
    nextBillingDate: null,
    relationshipStatus: "healthy" as const,
    nextAction: "Review operational systems and ongoing support",
    nextActionDueDate: null,
    notes:
      "Private regional hospitality brand. Luxury website, custom CMS, premium inquiry experience, hospitality operational systems foundation.",
  },

  // ── 5. Cusick Morgan Motorsports ──────────────────────────────────────────
  {
    name: "Cusick Morgan Motorsports",
    slug: "cusick-morgan-motorsports",
    status: "active" as const,
    primaryContactName: "",
    primaryContactEmail: "",
    companyWebsite: "",
    brandTier: "growth" as const,
    monthlyRetainerAmount: null,
    billingDay: null,
    nextBillingDate: null,
    relationshipStatus: "healthy" as const,
    nextAction: "Review current project status",
    nextActionDueDate: null,
    notes:
      "Motorsports organization. Brand identity and digital presence work.",
  },

  // ── 6. SPUR Restaurant & Bar ──────────────────────────────────────────────
  {
    name: "SPUR Restaurant & Bar",
    slug: "spur-restaurant-bar",
    status: "active" as const,
    primaryContactName: "",
    primaryContactEmail: "",
    companyWebsite: "",
    brandTier: "growth" as const,
    monthlyRetainerAmount: null,
    billingDay: null,
    nextBillingDate: null,
    relationshipStatus: "healthy" as const,
    nextAction: "Review scope and digital presence deliverables",
    nextActionDueDate: null,
    notes:
      "Restaurant and bar brand. Website and digital presence work.",
  },

  // ── 7. Dialed In Electric ─────────────────────────────────────────────────
  {
    name: "Dialed In Electric",
    slug: "dialed-in-electric",
    status: "active" as const,
    primaryContactName: "",
    primaryContactEmail: "",
    companyWebsite: "",
    brandTier: "growth" as const,
    monthlyRetainerAmount: null,
    billingDay: null,
    nextBillingDate: null,
    relationshipStatus: "healthy" as const,
    nextAction: "Review current project status and next deliverable",
    nextActionDueDate: null,
    notes:
      "Electrical services brand. Website and brand systems work.",
  },

  // ── 8. E. Davis Enterprises ───────────────────────────────────────────────
  {
    name: "E. Davis Enterprises",
    slug: "e-davis-enterprises",
    status: "active" as const,
    primaryContactName: "",
    primaryContactEmail: "",
    companyWebsite: "",
    brandTier: "growth" as const,
    monthlyRetainerAmount: null,
    billingDay: null,
    nextBillingDate: null,
    relationshipStatus: "healthy" as const,
    nextAction: "Review scope and active deliverables",
    nextActionDueDate: null,
    notes:
      "Enterprise services client. Digital presence and brand work.",
  },

  // ── 9. OTP ────────────────────────────────────────────────────────────────
  {
    name: "OTP",
    slug: "otp",
    status: "active" as const,
    primaryContactName: "",
    primaryContactEmail: "",
    companyWebsite: "",
    brandTier: "growth" as const,
    monthlyRetainerAmount: null,
    billingDay: null,
    nextBillingDate: null,
    relationshipStatus: "healthy" as const,
    nextAction: "Review project scope and status",
    nextActionDueDate: null,
    notes: "Client — full details to be enriched.",
  },

  // ── 10. 2475 Townsgate ────────────────────────────────────────────────────
  {
    name: "2475 Townsgate",
    slug: "2475-townsgate",
    status: "active" as const,
    primaryContactName: "",
    primaryContactEmail: "",
    companyWebsite: "",
    brandTier: "growth" as const,
    monthlyRetainerAmount: null,
    billingDay: null,
    nextBillingDate: null,
    relationshipStatus: "healthy" as const,
    nextAction: "Review scope and project deliverables",
    nextActionDueDate: null,
    notes: "Client — full details to be enriched.",
  },

  // ── 11. Hair Mafia ────────────────────────────────────────────────────────
  {
    name: "Hair Mafia",
    slug: "hair-mafia",
    status: "active" as const,
    primaryContactName: "",
    primaryContactEmail: "",
    companyWebsite: "",
    brandTier: "growth" as const,
    monthlyRetainerAmount: null,
    billingDay: null,
    nextBillingDate: null,
    relationshipStatus: "healthy" as const,
    nextAction: "Review brand and digital presence scope",
    nextActionDueDate: null,
    notes:
      "Salon / beauty brand. Brand systems and digital presence work.",
  },

  // ── 12. La Cocina ─────────────────────────────────────────────────────────
  {
    name: "La Cocina",
    slug: "la-cocina",
    status: "active" as const,
    primaryContactName: "",
    primaryContactEmail: "",
    companyWebsite: "",
    brandTier: "growth" as const,
    monthlyRetainerAmount: null,
    billingDay: null,
    nextBillingDate: null,
    relationshipStatus: "healthy" as const,
    nextAction: "Review brand and hospitality digital scope",
    nextActionDueDate: null,
    notes:
      "Food / hospitality brand. Website and brand presence work.",
  },
] as const;

// ── Seed runner ───────────────────────────────────────────────────────────────

async function seedClients() {
  const payload = await getPayload({ config });

  console.log(`\nSeeding ${clients.length} clients...\n`);

  for (const client of clients) {
    try {
      const existing = await payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "clients" as any,
        where: { slug: { equals: client.slug } },
        limit: 1,
      });

      if (existing.docs.length > 0) {
        const doc = existing.docs[0] as { id: number };
        await payload.update({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          collection: "clients" as any,
          id: doc.id,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: client as any,
        });
        console.log(`  ✔ Updated: ${client.name}`);
      } else {
        await payload.create({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          collection: "clients" as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: client as any,
        });
        console.log(`  ✦ Created: ${client.name}`);
      }
    } catch (err) {
      console.error(`  ✘ Failed:  ${client.name}`, err);
    }
  }

  console.log("\nClients seed complete.\n");
  process.exit(0);
}

seedClients().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
