/**
 * seed-executive-client-profiles.ts
 *
 * Seeds Executive Client Profiles — Phase 1 demo data for Primal Motorsports only.
 * Run: npm run seed:executive-profiles (requires DATABASE_URI)
 *
 * Idempotent — upserts by linked client slug.
 */

import { getPayload } from "payload";
import config from "../payload.config";

const PRIMAL_PROFILE = {
  clientSlug: "primal-motorsports",
  executiveSummary:
    "Strong strategic client. Premium motorsports brand with strong portfolio value, recurring opportunity, platform/product potential, and future licensing potential.",
  clientTier: "A" as const,
  clientHealthScore: 92,
  relationshipStatus: "active" as const,
  currentMonthlyRevenue: 1200,
  estimatedAnnualValue: 14400,
  potentialMonthlyRevenue: 3500,
  primaryDecisionMaker: "Adam (primary decision maker), Tyler (operations)",
  secondaryContacts: [
    { name: "Tyler", role: "Operations", email: "" },
  ],
  currentServices:
    "Website maintenance\nNew website rebuild awaiting client revisions before launch\nLight web updates\nAPI connection management\nMotorsportReg registration/API integration\nSEO optimization\nGoogle Search Console\nGoogle Analytics\nGoogle Workspace support\nEmail support\nGoogle Ads management ending on the 28th under previous agreement\nDriver portal / Primal OS / CRM foundation development\nFuture email marketing opportunity",
  activeProjectsSummary:
    "New KXD website rebuild (awaiting Adam/Tyler revisions), Primal OS / driver portal foundation, MotorsportReg API integration.",
  strategicNotes:
    "Website launch is the immediate priority. Adam said to get the website dialed in and working smoothly before deeper portal/licensing discussions. Do not oversell the portal until the new website is live and stable.",
  growthOpportunities:
    "Continue Google Ads with new pricing if current campaign shows strong return\nMonthly email marketing / driver growth marketing\nRaise retainer after website launch and portal value is clear\nExpand Primal OS / driver portal around their real workflow\nLicense/buyout conversation within 12 months if platform becomes central to operations",
  upsellOpportunities:
    "Google Ads continuation at new pricing\nMonthly email marketing retainer\nRetainer increase post-launch\nPrimal OS expansion\nPlatform licensing / buyout within 12 months",
  riskNotes:
    "Current live site is still on Ben's system. New KXD-built site must launch cleanly after Adam and Tyler provide revisions. Avoid pushing additional upsells before the website is finished.",
  nextAction:
    "Follow up with Adam and Tyler for website revisions and prepare Google Ads performance/continuation recommendation before campaign ends.",
  caseStudyPotential: "flagship" as const,
  referralPotential: "high" as const,
  productizationPotential: "high" as const,
  internalPriority: "critical" as const,
  productionUrl: "https://primalmotorsports.com",
  analyticsStatus: "Google Analytics connected",
  searchConsoleStatus: "Google Search Console connected",
  workspaceStatus: "Google Workspace support active",
  apiIntegrations: "MotorsportReg registration/API integration",
  loginNotesReference: "1Password — Primal Motorsports vault / shared client folder references",
};

async function seedExecutiveProfiles() {
  const payload = await getPayload({ config });

  const clients = await payload.find({
    collection: "clients",
    where: { slug: { equals: PRIMAL_PROFILE.clientSlug } },
    limit: 1,
  });

  if (clients.docs.length === 0) {
    console.error(`Client not found for slug: ${PRIMAL_PROFILE.clientSlug}`);
    process.exit(1);
  }

  const client = clients.docs[0] as { id: number; name: string };
  const { clientSlug: _slug, ...profileData } = PRIMAL_PROFILE;

  const existing = await payload.find({
    collection: "executive-client-profiles",
    where: { client: { equals: client.id } },
    limit: 1,
  });

  const data = {
    ...profileData,
    client: client.id,
    profileTitle: client.name,
  };

  if (existing.docs.length > 0) {
    const doc = existing.docs[0];
    await payload.update({
      collection: "executive-client-profiles",
      id: doc.id,
      data,
    });
    console.log(`  ✔ Updated executive profile: ${client.name}`);
  } else {
    await payload.create({
      collection: "executive-client-profiles",
      data,
    });
    console.log(`  ✦ Created executive profile: ${client.name}`);
  }

  await payload.update({
    collection: "clients",
    id: client.id,
    data: {
      monthlyRetainerAmount: PRIMAL_PROFILE.currentMonthlyRevenue,
      nextAction: PRIMAL_PROFILE.nextAction,
    },
  });
  console.log(`  ✔ Synced client operational fields: ${client.name}`);

  console.log("\nExecutive client profiles seed complete.\n");
  process.exit(0);
}

seedExecutiveProfiles().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
