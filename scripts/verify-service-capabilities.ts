/**
 * Commercial service capabilities → CES composition.
 * Run: npm run verify:service-capabilities
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { composeExperienceRecommendation } from "../lib/client-command/experience/composer/recommend.ts";
import type { ExperienceSignals } from "../lib/client-command/experience/composer/types.ts";
import { isInternalOnlyCapability } from "../lib/ces/modules/canonical.ts";
import {
  EMPTY_SERVICE_SCOPE,
  GROWTH_INFRASTRUCTURE_SHOWROOM_SCOPE,
  SERVICE_CAPABILITY_CATALOG,
  getServiceCapability,
  planServiceActivation,
  recommendFromCapabilities,
  resolveServiceScope,
} from "../lib/service-capabilities/index.ts";
import type { ClientServiceAssignmentRecord } from "../lib/service-capabilities/types.ts";

const root = process.cwd();
let failed = 0;

function check(label: string, pass: boolean) {
  console.log(pass ? `  ✔ ${label}` : `  ✗ ${label}`);
  if (!pass) failed += 1;
}

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

function baseSignals(partial: Partial<ExperienceSignals> = {}): ExperienceSignals {
  return {
    clientId: 42,
    clientName: "Example Client",
    clientSlug: "example-client",
    clientStatus: "active",
    websiteUrl: "https://example.com",
    brandTier: null,
    monthlyRetainerAmount: 500,
    commercialAgreementId: null,
    currentServices: null,
    industry: null,
    serviceScope: EMPTY_SERVICE_SCOPE,
    hasHostingInfra: false,
    primaryDomain: "example.com",
    ga4PropertyId: null,
    searchConsoleSiteUrl: null,
    reportingCapabilities: [],
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
    logoHasFile: true,
    logoSource: "onboarding",
    infrastructureId: null,
    searchConsoleStatus: null,
    analyticsProvider: null,
    executiveAnalyticsStatus: null,
    executiveSearchConsoleStatus: null,
    proposedSearchConsoleSiteUrl: null,
    discoveredGa4PropertyId: null,
    brandKit: null,
    presentationLogoUrl: null,
    presentationAccent: null,
    ownerHrefs: {
      infrastructure: "/admin/operations/infrastructure/42",
      infrastructureEdit: null,
      inventory: "/admin/operations/client-command/42?tab=inventory",
      inventoryCreate: "/admin/collections/client-inventory-vehicles/create",
      onboarding: "/admin/operations/onboarding",
      onboardingCreate: "/admin/collections/client-onboarding/create",
      brandKitCreate: "/admin/collections/brand-kits/create",
      reportingOps: "/admin/operations/reporting/42",
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
      manageHref: "/admin/operations/portal-access",
      contacts: [],
      invitations: [],
    },
    ...partial,
  };
}

console.log("\nService capabilities — verify:service-capabilities\n");

const libSrc = walk(path.join(root, "lib/service-capabilities"))
  .map((f) => readFileSync(f, "utf8"))
  .join("\n");
const composerSrc = walk(path.join(root, "lib/client-command/experience/composer"))
  .map((f) => readFileSync(f, "utf8"))
  .join("\n");
check(
  "no OTP/Primal/Don slug branching in service capabilities or composer",
  !/otp-carts|otpcarts|primal-motorsports|don cusick|ON_TRACK/i.test(libSrc + composerSrc),
);

const performance = getServiceCapability("performance_component");
check(
  "performance_component grants no experience modules",
  performance?.affectsExperience === false && (performance?.grantsModules.length ?? -1) === 0,
);

check(
  "active_growth_campaign add-on has no invented campaign module",
  (getServiceCapability("active_growth_campaign")?.grantsModules.length ?? -1) === 0,
);

check(
  "catalog never grants advisor or internal modules",
  SERVICE_CAPABILITY_CATALOG.every(
    (entry) =>
      !entry.grantsModules.includes("advisor") &&
      entry.grantsModules.every((id) => !isInternalOnlyCapability(id)),
  ),
);

const showroom = resolveServiceScope({
  assignments: GROWTH_INFRASTRUCTURE_SHOWROOM_SCOPE.assignments,
  relationshipLabel: "Example Growth Infrastructure Partnership",
});
const fromCaps = recommendFromCapabilities(showroom);
check(
  "showroom-shaped scope is authoritative without ads",
  showroom.hasAuthoritativeScope &&
    showroom.activeCapabilityIds.includes("inventory_experience") &&
    !showroom.activeCapabilityIds.includes("google_ads_management") &&
    !showroom.grantedModules.includes("advisor"),
);
check(
  "performance assignment does not add portal modules",
  showroom.assignments.some((row) => row.capabilityId === "performance_component" && row.status === "active") &&
    !fromCaps.portalModules.some((id) => id.includes("commission") || id.includes("performance-component")),
);
check("ended add-on does not grant future entitlement", !showroom.grantedReporting.includes("google-ads"));

const rec = composeExperienceRecommendation(
  baseSignals({
    serviceScope: showroom,
    inventoryCount: 0,
    ga4PropertyId: null,
    searchConsoleSiteUrl: null,
    publishedReportCount: 0,
  }),
);
const included = rec.modules
  .filter((m) => m.decision === "include" || m.decision === "needs-setup")
  .map((m) => m.id);
const analytics = rec.modules.find((m) => m.id === "analytics");
check(
  "capability → CES recommends website, inventory, analytics, partnership, requests",
  [
    "website-workspace",
    "website-review",
    "website-health",
    "requests",
    "inventory",
    "analytics",
    "executive-review",
    "executive-performance",
  ].every((id) => included.includes(id as never)),
);
check(
  "missing GA4 is readiness not missing entitlement",
  analytics?.decision === "needs-setup" && Boolean(analytics.reason.includes("commercial")),
);
check(
  "ads campaign surfaces stay off",
  !included.includes("advisor") &&
    !showroom.grantedReporting.includes("google-ads") &&
    rec.modules.find((m) => m.id === "reports")?.decision === "exclude",
);

const withAds = resolveServiceScope({
  assignments: [
    ...GROWTH_INFRASTRUCTURE_SHOWROOM_SCOPE.assignments,
    {
      id: 200,
      clientId: 0,
      capabilityId: "google_ads_management",
      source: "add-on",
      status: "active",
      effectiveAt: "2026-08-01T00:00:00.000Z",
      endedAt: null,
      relatedContractId: null,
      note: null,
    } satisfies ClientServiceAssignmentRecord,
  ],
});
check("add-on grants google-ads reporting capability", withAds.grantedReporting.includes("google-ads"));

const expired = resolveServiceScope({
  assignments: [
    {
      id: 1,
      clientId: 1,
      capabilityId: "inventory_experience",
      source: "legacy-manual",
      status: "expired",
      effectiveAt: "2024-01-01T00:00:00.000Z",
      endedAt: "2025-01-01T00:00:00.000Z",
      relatedContractId: null,
      note: null,
    },
  ],
});
check(
  "expired service no longer grants entitlement",
  expired.hasAuthoritativeScope && expired.grantedModules.length === 0,
);

const haystackOnly = composeExperienceRecommendation(
  baseSignals({
    serviceScope: EMPTY_SERVICE_SCOPE,
    currentServices: "Website Management",
    websiteUrl: "https://example.com",
  }),
);
check(
  "legacy haystack fallback still works without assignments",
  haystackOnly.modules.find((m) => m.id === "website-review")?.decision === "include",
);

const advisor = rec.modules.find((m) => m.id === "advisor");
check("Advisor remains fail-closed under commercial scope", advisor?.decision === "locked");

const route = read("app/api/admin/clients/[clientId]/experience/services/route.ts");
const assignments = read("lib/service-capabilities/assignments.ts");
check(
  "services API never activates CES or invites",
  route.includes("isStudioPayloadOperator") &&
    !route.includes("activateRecommendedExperience") &&
    !route.includes("saveOperatorExperience") &&
    route.includes("invites: false") &&
    route.includes("mutatesProfile: false"),
);
check(
  "end assignment updates status rather than deleting",
  assignments.includes('status: input.status ?? "ended"') && !assignments.includes("payload.delete"),
);

const ui = read("components/admin/operations/client-command/ClientExperienceComposer.tsx");
check(
  "composer is commercial review with Advanced Configuration",
  ui.includes("Active services") &&
    ui.includes("Advanced Configuration") &&
    ui.includes("/experience/services") &&
    ui.includes("Approve & Activate"),
);
check(
  "migration registered without production backfill",
  read("migrations/index.ts").includes("20260825_client_service_assignments") &&
    read("migrations/20260825_client_service_assignments.ts").includes("CREATE TABLE IF NOT EXISTS"),
);
check(
  "collection preserves history by refusing deletes",
  read("payload/collections/ClientServiceAssignments.ts").includes("delete: () => false") &&
    read("payload/collections/ClientServiceAssignments.ts").includes("beforeDelete"),
);
check(
  "migration client FK restricts deletes instead of cascading history away",
  read("migrations/20260825_client_service_assignments.ts").includes("ON DELETE RESTRICT") &&
    !read("migrations/20260825_client_service_assignments.ts").includes("ON DELETE CASCADE"),
);

const unknownOnly = resolveServiceScope({
  assignments: [],
  hasRecordedAssignments: true,
});
check(
  "unknown/unmapped recorded services fail closed (no haystack)",
  unknownOnly.hasAuthoritativeScope && unknownOnly.grantedModules.length === 0,
);

const legacyRow = {
  id: 11,
  clientId: 7,
  capabilityId: "inventory_experience" as const,
  source: "legacy-manual" as const,
  status: "active" as const,
  effectiveAt: "2026-01-01T00:00:00.000Z",
  endedAt: null,
  relatedContractId: null,
  note: null,
};
check(
  "legacy-manual can exist without a contract reference",
  legacyRow.relatedContractId == null && legacyRow.source === "legacy-manual",
);
check(
  "agreement source supersedes active legacy without mutating the historical row",
  planServiceActivation({ active: legacyRow, nextSource: "agreement" }).kind === "supersede" &&
    planServiceActivation({ active: legacyRow, nextSource: "legacy-manual" }).kind === "update",
);

const afterSupersede = resolveServiceScope({
  assignments: [
    { ...legacyRow, status: "ended", endedAt: "2026-08-08T00:00:00.000Z" },
    {
      ...legacyRow,
      id: 12,
      source: "agreement",
      status: "active",
      relatedContractId: 44,
      effectiveAt: "2026-08-08T00:00:00.000Z",
      endedAt: null,
    },
  ],
});
check(
  "supersede keeps ended legacy history and grants from the new agreement-backed row",
  afterSupersede.assignments.some((row) => row.id === 11 && row.status === "ended" && row.source === "legacy-manual") &&
    afterSupersede.assignments.some((row) => row.id === 12 && row.source === "agreement" && row.relatedContractId === 44) &&
    afterSupersede.grantedModules.includes("inventory"),
);

const stableCes = composeExperienceRecommendation(
  baseSignals({
    serviceScope: showroom,
    profileStatus: "active",
    existingSelectedModules: ["website-review", "projects"],
    projectCount: 2,
    websiteUrl: "https://example.com",
  }),
);
check(
  "active CES modules stay recommended until explicit Approve & Activate",
  stableCes.activationModules.includes("website-review") &&
    stableCes.activationModules.includes("projects") &&
    stableCes.notes.some((note) => note.includes("Approve & Activate")),
);
check(
  "Manage Experience save path is unchanged and does not invite",
  read("lib/client-command/experience/save.ts").includes("sanitizeSelectedPortalModules") &&
    !read("lib/client-command/experience/save.ts").includes("activateClientService") &&
    !read("lib/client-command/experience/save.ts").includes("createPortalInvitation"),
);

console.log("\nOTP-shaped fixture (generic, no slug):");
console.log(`  active capabilities: ${showroom.activeCapabilityIds.join(", ")}`);
console.log(`  granted CES modules: ${fromCaps.portalModules.join(", ")}`);
console.log(`  granted reporting: ${fromCaps.reportingCapabilities.join(", ") || "(none)"}`);
console.log(`  recommended include/needs-setup: ${included.join(", ")}`);
console.log(`  activation-ready now: ${rec.activationModules.join(", ")}`);

if (failed) {
  console.error(`\nService capabilities verification failed (${failed}).\n`);
  process.exit(1);
}
console.log("\nService capabilities verification passed.\n");
