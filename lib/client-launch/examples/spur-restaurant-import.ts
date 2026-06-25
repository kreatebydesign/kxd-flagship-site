import type { ClientLaunchDraft } from "../types";

export const SPUR_IMPORT_RAW_NOTES =
  "Client since 2026-05-08. SPUR does not currently want KXD on retainer, but ongoing needs are likely after launch. KXD built the custom website, front-end CMS editor, admin system, Microsoft Outlook email setup, hello@spurrestaurantandbar.com, branding, SEO foundation, launch support, hiring/teaser page, menu design foundation, and launch assets. Waiting on final menu, final content, photography, and opening details.";

/**
 * Import-ready payload for SPUR Restaurant & Bar.
 * Expansion Status (Launch Pending) is stored in strategicNotes — no schema field yet.
 * North Star Metric stored via roadmap.northStarMetric normalization.
 */
export const SPUR_RESTAURANT_IMPORT_EXAMPLE: ClientLaunchDraft & {
  services: ClientLaunchDraft["services"] & {
    current?: string[];
    future?: string[];
    completed?: string[];
  };
  contacts: ClientLaunchDraft["contacts"] & { notes?: string };
  roadmap: ClientLaunchDraft["roadmap"] & { northStarMetric?: string };
} = {
  business: {
    businessName: "SPUR Restaurant & Bar",
    industry: "Restaurant & Bar / Hospitality",
    website: "https://spurrestaurantandbar.com",
    primaryGoal: "Monthly reservations and customer conversions",
    status: "active",
    leadSource: "",
    businessDescription:
      "Launch pending / expansion opportunity. Strategic project client since 2026-05-08. Core brand, website, CMS, email, SEO, and launch infrastructure are largely production-ready. Blockers are client-side final menu, launch content, photography, and opening timeline — not KXD execution.",
  },
  contacts: {
    primaryDecisionMaker: "",
    role: "",
    email: "hello@spurrestaurantandbar.com",
    phone: "",
    additionalContacts: [],
    preferredCommunication: "",
    meetingCadence: "",
    notes: "Primary business email: hello@spurrestaurantandbar.com",
  },
  financial: {
    projectValue: "6500",
    monthlyRetainer: "",
    billingStartDate: "2026-05-08",
    contractStatus: "project",
    expectedAnnualValue: "6500",
    paymentTerms: "Project-based — $6,500 brand launch package. No active monthly retainer.",
  },
  services: {
    selected: [],
    customServices: "",
    current: [
      "Waiting on final menu",
      "Waiting on final launch content",
      "Waiting on final photography / opening details",
    ],
    completed: [
      "Brand identity",
      "Logo system",
      "Custom website",
      "Front-end CMS editor",
      "Admin dashboard",
      "Microsoft 365 / Outlook email setup",
      "hello@spurrestaurantandbar.com",
      "Menu design foundation",
      "SEO foundation",
      "Hiring / teaser landing page",
      "Launch support",
      "Business cards / marketing collateral direction",
      "Google Analytics / Google Search Console foundation",
      "Vercel deployment",
      "DNS / domain setup",
    ],
    future: [
      "Seasonal menu updates",
      "Event promotions",
      "Holiday campaigns",
      "Gift card promotions",
      "Private dining or catering landing pages",
      "Google Business Profile optimization",
      "Local SEO growth",
      "Photography refreshes",
      "Monthly analytics reviews",
      "Reservation and customer conversion optimization",
    ],
  },
  technical: {
    productionUrl: "https://spurrestaurantandbar.com",
    stagingUrl: "",
    domainRegistrar: "",
    dnsProvider: "",
    hosting: "Vercel",
    githubRepo: "",
    vercelProject: "Connected",
    workspaceStatus: "",
    analyticsStatus: "Foundation configured",
    searchConsoleStatus: "Foundation configured",
    apiIntegrations: "Microsoft 365 / Outlook email (hello@spurrestaurantandbar.com)",
    crm: "",
    stripe: "",
    technicalNotes: "Vercel deployment live. DNS and domain setup complete.",
    loginNotesReference:
      "Credentials and private access should remain in secure storage only. Do not store passwords in KXD OS.",
  },
  executive: {
    clientTier: "A",
    healthScore: "91",
    relationshipStatus: "active",
    currentPriority:
      "Complete final menu, content, photography, and launch website — support opening without pushing retainer before launch.",
    executiveSummary:
      "SPUR Restaurant & Bar is a high-value project client and strong expansion opportunity. KXD has already built the core brand, website, front-end CMS editor, admin system, Microsoft Outlook email setup, launch assets, SEO foundation, and digital infrastructure. The project is largely production-ready. Current blockers are client-side final menu, content, photography, and opening details. This should not be treated as a completed client yet. Track as launch pending and expansion opportunity.",
    strategicNotes:
      "Expansion Status: Launch Pending / Expansion Opportunity\n\nClient since 2026-05-08.\n\nRevenue Strategy: Current revenue is project-based with a $6,500 brand launch package. No monthly retainer is active. Do not aggressively sell a retainer before opening. After launch, position a Restaurant Growth Package at $300–$500 per month covering website updates, seasonal menus, event pages, local SEO, Google Business optimization, analytics review, promotional graphics, and campaign support.\n\nGrowth Strategy: Short term focus is final launch completion, menu/content/photo updates, QA, and indexing. Mid-term opportunity is seasonal promotions, events, holiday campaigns, analytics review, and conversion optimization. Long-term opportunity includes gift cards, private dining or catering pages, loyalty support, online ordering or reservation optimization, and recurring creative support.\n\nSPUR is a strong example of a client that does not currently want a retainer but is highly likely to need ongoing support once operations begin. The correct executive move is not to push maintenance too early, but to stay close through launch, prove value, and convert the first real operational need into a monthly Restaurant Growth Package.",
    growthOpportunities:
      "Seasonal menu updates\nEvent promotions\nHoliday campaigns\nGift card promotions\nPrivate dining or catering landing pages\nGoogle Business Profile optimization\nLocal SEO growth\nPhotography refreshes\nMonthly analytics reviews\nReservation and customer conversion optimization",
    upsellOpportunities:
      "Restaurant Growth Package ($300–$500/month) after opening — monthly website updates, seasonal menu updates, event landing pages, Google Business optimization, SEO growth, analytics review, promotional graphics, and campaign support. Timing: after menu updates, event promotions, analytics, or seasonal campaign needs appear.",
    riskNotes:
      "No active retainer is currently in place.\nClient may underestimate ongoing website and creative needs after launch.\nWebsite cannot be fully finalized until final menu, content, and photography are provided.\nLaunch timeline depends on remodel progress and opening schedule.\nNo recurring SEO or analytics cadence exists yet.",
    caseStudyPotential: "high",
    referralPotential: "medium",
    productizationPotential: "high",
    internalPriority: "high",
  },
  roadmap: {
    current:
      "Complete final menu, launch content, photography, and opening-detail updates.\nPerform final QA and launch polish across desktop and mobile.",
    next:
      "Support restaurant opening and confirm Google indexing.\nReview analytics and customer behavior after the first 30 days.",
    future:
      "Identify first recurring operational creative need.\nOffer Restaurant Growth Package naturally after ongoing needs appear.\nBuild recurring support around menu updates, local SEO, events, holiday campaigns, reservations, gift cards, loyalty, and private dining/catering opportunities.",
    longTermVision:
      "Long-term recurring support via Restaurant Growth Package once operational needs emerge post-opening.",
    firstNextAction:
      "Complete final menu, launch content, photography, and opening-detail updates.",
    nextActionDueDate: "",
    northStarMetric: "Monthly reservations and customer conversions",
  },
};

export function getSpurImportExampleJson(): string {
  return JSON.stringify(SPUR_RESTAURANT_IMPORT_EXAMPLE, null, 2);
}
