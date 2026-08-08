/**
 * Client Experience readiness + provisioning — pure fixtures + source contracts.
 * Run: npm run verify:ces-experience-readiness
 */

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  composeExperienceRecommendation,
} from "../lib/client-command/experience/composer/recommend.ts";
import {
  composeExperienceReadiness,
  extractGa4PropertyIdFromEvidence,
  proposeSearchConsoleSiteUrl,
} from "../lib/client-command/experience/composer/readiness.ts";
import type { ExperienceSignals } from "../lib/client-command/experience/composer/types.ts";
import { EMPTY_SERVICE_SCOPE } from "../lib/service-capabilities/resolve.ts";
import { GROWTH_INFRASTRUCTURE_SHOWROOM_SCOPE, resolveServiceScope } from "../lib/service-capabilities/index.ts";

const root = process.cwd();
let passed = 0;
let failed = 0;

function check(label: string, pass: boolean): void {
  if (pass) {
    passed += 1;
    console.log(`  ✔ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✘ ${label}`);
  }
}

function read(rel: string): string {
  return readFileSync(path.join(root, rel), "utf8");
}

function walkTs(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkTs(full));
    else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

function baseSignals(partial: Partial<ExperienceSignals> = {}): ExperienceSignals {
  return {
    clientId: 99,
    clientName: "Example Client",
    clientSlug: "example-client",
    clientStatus: "active",
    websiteUrl: "https://example.com",
    brandTier: null,
    monthlyRetainerAmount: 300,
    commercialAgreementId: null,
    currentServices: "SEO\nInventory Visibility\nWebsite Management",
    industry: null,
    serviceScope: EMPTY_SERVICE_SCOPE,
    hasHostingInfra: true,
    primaryDomain: "example.com",
    ga4PropertyId: null,
    searchConsoleSiteUrl: null,
    reportingCapabilities: ["website-analytics", "seo"],
    entitlements: { isLegacy: true, isPaused: false, planKey: null, effectiveModules: [] },
    profileStatus: "none",
    existingSelectedModules: [],
    existingBranding: {
      portalSidebarLabel: "",
      welcomeEyebrow: "",
      reassuranceLine: "",
      supportTone: "warm-professional",
      primaryColor: "",
      secondaryColor: "",
      accentColor: "",
      borderRadiusPreset: "default",
      motionPreset: "calm",
      showKxdPartnerMark: true,
      partnerFooterLine: "",
    },
    logoHasFile: false,
    logoSource: "none",
    infrastructureId: 12,
    searchConsoleStatus: "unknown",
    analyticsProvider: null,
    executiveAnalyticsStatus: "Foundation configured",
    executiveSearchConsoleStatus: "Configured",
    proposedSearchConsoleSiteUrl: "sc-domain:example.com",
    discoveredGa4PropertyId: null,
    brandKit: null,
    presentationLogoUrl: null,
    presentationAccent: null,
    ownerHrefs: {
      infrastructure: "/admin/operations/infrastructure/99",
      infrastructureEdit: "/admin/collections/client-infrastructure/12",
      inventory: "/admin/operations/client-command/99?tab=inventory",
      inventoryCreate: "/admin/collections/client-inventory-vehicles/create",
      onboarding: "/admin/operations/onboarding",
      onboardingCreate: "/admin/collections/client-onboarding/create",
      brandKitCreate: "/admin/collections/brand-kits/create",
      reportingOps: "/admin/operations/reporting/99",
    },
    inventoryCount: 0,
    websiteReviewCount: 0,
    websiteWorkspaceCount: 0,
    projectCount: 0,
    openRequestCount: 0,
    deliverableCount: 0,
    publishedReportCount: 0,
    assetCount: 0,
    meetingCount: 0,
    billingNavAvailable: false,
    portfolioNavAvailable: false,
    hasPortalMembership: false,
    hasEnabledPresentation: false,
    integrations: [],
    portalAccess: {
      primaryContact: null,
      membershipCount: 0,
      activeMembershipCount: 0,
      hasPortalMembership: false,
      pendingInvitationCount: 0,
      multiAccountContacts: 0,
      manageHref: "/admin/operations/portal-access?client=99",
      contacts: [],
      invitations: [],
    },
    ...partial,
  };
}

console.log("\nCES — Experience Readiness + Provisioning\n");

const composerDir = path.join(root, "lib/client-command/experience/composer");
const composerSource = walkTs(composerDir).map((f) => readFileSync(f, "utf8")).join("\n");
check(
  "readiness layer has no OTP/Primal slug branching",
  !/otp-carts|primal-motorsports|ON_TRACK|PRIMAL_CLIENT_SLUG/.test(composerSource),
);

check(
  "sc-domain proposed from website/domain",
  proposeSearchConsoleSiteUrl("https://www.example.com", null) === "sc-domain:example.com" &&
    proposeSearchConsoleSiteUrl(null, "otpcarts.com") === "sc-domain:otpcarts.com",
);

check(
  "GA4 evidence extracts numeric property, not measurement IDs",
  extractGa4PropertyIdFromEvidence(["ga4:property:123456789"]) === "123456789" &&
    extractGa4PropertyIdFromEvidence(["G-L8FM1RFZ9R"]) === null,
);

const rec = composeExperienceRecommendation(baseSignals());
const gsc = rec.readiness.dependencies.find((d) => d.id === "search-console");
const ga4 = rec.readiness.dependencies.find((d) => d.id === "ga4");
const inventory = rec.readiness.dependencies.find((d) => d.id === "inventory");
const logo = rec.readiness.dependencies.find((d) => d.id === "logo");
const access = rec.readiness.dependencies.find((d) => d.id === "access");

check(
  "Search Console offers discover rather than blind apply",
  gsc?.resolutionClass === "actionable" &&
    gsc.provision.kind === "discover" &&
    gsc.provision.discoverKind === "search-console" &&
    gsc.provision.actionId == null,
);
check(
  "GA4 offers authenticated property discovery when missing",
  ga4?.resolutionClass === "actionable" &&
    ga4.provision.kind === "discover" &&
    ga4.provision.discoverKind === "ga4",
);
check(
  "Inventory links to existing Client Command inventory",
  inventory?.provision.href?.includes("tab=inventory") === true &&
    inventory.provision.label === "Open Inventory",
);
check("Logo is launch-blocking when missing", logo?.launchImpact === "blocking" && logo.status === "unresolved");
check("Access is optional and does not invite", access?.launchImpact === "optional" && rec.readiness.activationBlockers.every((b) => !/invite/i.test(b)));
check(
  "Activate is blocked while logo/colors/setup remain",
  rec.readiness.activationEligible === false,
);

const withBrandKit = composeExperienceRecommendation(
  baseSignals({
    logoHasFile: true,
    logoSource: "onboarding",
    brandKit: {
      id: 3,
      href: "/admin/collections/brand-kits/3",
      primaryColor: "#111111",
      secondaryColor: "#222222",
      accentColor: "#4A6FA5",
    },
    inventoryCount: 2,
    ga4PropertyId: "555666777",
    searchConsoleSiteUrl: "sc-domain:example.com",
  }),
);
check(
  "Brand kit colors become authoritative without typing them into CES",
  withBrandKit.branding.accentColor === "#4A6FA5" &&
    withBrandKit.branding.colorSource === "authoritative",
);
check(
  "Ready inventory/GA4/GSC + logo + colors can activate",
  withBrandKit.readiness.activationEligible === true,
);

const discoveredGa4 = composeExperienceReadiness({
  signals: baseSignals({ discoveredGa4PropertyId: "987654321" }),
  branding: rec.branding,
  modules: rec.modules,
  acceptedModules: rec.activationModules,
});
const discovered = discoveredGa4.dependencies.find((d) => d.id === "ga4");
check(
  "Discovered numeric GA4 is auto-resolvable onto infrastructure",
  discovered?.resolutionClass === "auto-resolvable" &&
    discovered.provision.actionId === "apply-discovered-ga4-property",
);

const gold = composeExperienceRecommendation(
  baseSignals({
    existingBranding: {
      ...baseSignals().existingBranding,
      accentColor: "#C9A962",
    },
  }),
);
check("KXD gold still rejected as client brand", gold.branding.accentColor !== "#C9A962");

const commercialReady = composeExperienceRecommendation(
  baseSignals({
    websiteUrl: "https://example.com",
    serviceScope: resolveServiceScope({
      assignments: GROWTH_INFRASTRUCTURE_SHOWROOM_SCOPE.assignments,
    }),
  }),
);
const commercialAnalytics = commercialReady.modules.find((m) => m.id === "analytics");
check(
  "missing GA4 is readiness, not missing commercial entitlement",
  commercialAnalytics?.decision === "needs-setup" &&
    Boolean(commercialAnalytics.reason.includes("commercial")),
);

const shaped = composeExperienceRecommendation(
  baseSignals({
    clientName: "Sales Growth Client",
    clientSlug: "sales-growth-client",
    websiteUrl: "https://example-carts.com",
    primaryDomain: "example-carts.com",
    proposedSearchConsoleSiteUrl: "sc-domain:example-carts.com",
    currentServices:
      "Website Management\nSEO\nLead Generation\nInventory Visibility\nDigital Support",
    monthlyRetainerAmount: 300,
    hasHostingInfra: true,
  }),
);
check(
  "sales-growth shape keeps HQ + website ready, inventory/analytics/health in setup",
  ["executive-performance", "executive-review", "website-review", "website-workspace"].every(
    (id) => shaped.activationModules.includes(id as never),
  ) &&
    shaped.modules.find((m) => m.id === "inventory")?.decision === "needs-setup" &&
    shaped.modules.find((m) => m.id === "analytics")?.decision === "needs-setup" &&
    shaped.modules.find((m) => m.id === "website-health")?.decision === "needs-setup" &&
    !shaped.readiness.activationEligible,
);

const provisionRoute = read("app/api/admin/clients/[clientId]/experience/provision/route.ts");
const recommendRoute = read("app/api/admin/clients/[clientId]/experience/recommend/route.ts");
const activate = read("lib/client-command/experience/composer/activate.ts");
check(
  "recommend route does not call provision or save",
  recommendRoute.includes("export async function GET") &&
    !recommendRoute.includes("applyExperienceProvision") &&
    !recommendRoute.includes("saveOperatorExperience"),
);
check(
  "provision route is POST-only and studio gated",
  provisionRoute.includes("export async function POST") &&
    provisionRoute.includes("isStudioPayloadOperator") &&
    !provisionRoute.includes("saveOperatorExperience") &&
    !provisionRoute.includes("listPortalInvitations") &&
    !provisionRoute.includes("ensurePortalMembership"),
);
check(
  "activate refuses launch-critical blockers",
  activate.includes("activationEligible") && activate.includes("KXD gold"),
);

const ui = read("components/admin/operations/client-command/ClientExperienceComposer.tsx");
check(
  "UI preview remains available while activate can disable",
  ui.includes("Preview Experience") && ui.includes("activationEligible"),
);

if (failed > 0) {
  console.error(`\nFAILED ${failed}  passed ${passed}`);
  process.exit(1);
}
console.log(`\nOK — ${passed} checks`);
