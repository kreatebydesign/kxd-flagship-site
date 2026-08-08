/**
 * Auto Compose Client Experience — pure fixtures + source contracts.
 * Run: npm run verify:ces-experience-composer
 */

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PRIMAL_EXPERIENCE_PROFILE } from "../lib/ces/profile/primal.ts";
import { isInternalOnlyCapability } from "../lib/ces/modules/canonical.ts";
import {
  composeExperienceRecommendation,
  recommendModules,
} from "../lib/client-command/experience/composer/recommend.ts";
import type { ExperienceSignals } from "../lib/client-command/experience/composer/types.ts";

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

function baseSignals(partial: Partial<ExperienceSignals>): ExperienceSignals {
  return {
    clientId: 99,
    clientName: "Example Client",
    clientSlug: "example-client",
    clientStatus: "active",
    websiteUrl: null,
    brandTier: null,
    monthlyRetainerAmount: null,
    commercialAgreementId: null,
    currentServices: null,
    industry: null,
    hasHostingInfra: false,
    primaryDomain: null,
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
    logoHasFile: false,
    logoSource: "none",
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

console.log("\nCES — Auto Compose Client Experience\n");

const composerDir = path.join(root, "lib/client-command/experience/composer");
const composerSource = walkTs(composerDir).map((f) => readFileSync(f, "utf8")).join("\n");
check(
  "composer has no OTP/Primal slug branching",
  !/otp-carts|primal-motorsports|ON_TRACK|PRIMAL_CLIENT_SLUG/.test(composerSource),
);

const recommendRoute = read("app/api/admin/clients/[clientId]/experience/recommend/route.ts");
const activateRoute = read("app/api/admin/clients/[clientId]/experience/activate/route.ts");
check(
  "recommend route is GET-only and studio gated",
  recommendRoute.includes("export async function GET") &&
    !recommendRoute.includes("payload.update") &&
    !recommendRoute.includes("payload.create") &&
    recommendRoute.includes("isStudioPayloadOperator"),
);
check(
  "activate is explicit POST write via save helper",
  activateRoute.includes("export async function POST") &&
    activateRoute.includes("activateRecommendedExperience"),
);
check(
  "generate UI does not write profile",
  read("components/admin/operations/client-command/ClientExperienceComposer.tsx").includes(
    "/experience/recommend",
  ) &&
    read("lib/client-command/experience/composer/recommend.ts").includes("mutatesProfile: false"),
);

const advisor = recommendModules(baseSignals({})).find((m) => m.id === "advisor");
check("Advisor remains fail-closed", advisor?.decision === "locked" && !advisor.acceptedDefault);

const leaked = recommendModules(
  baseSignals({
    existingSelectedModules: ["observer" as never, "website-review"],
  }),
);
check(
  "internal modules cannot leak into recommendations",
  !leaked.some((m) => isInternalOnlyCapability(m.id) && m.decision === "include"),
);

const analyticsBlocked = composeExperienceRecommendation(
  baseSignals({
    websiteUrl: "https://example.com",
    reportingCapabilities: ["website-analytics"],
  }),
);
check(
  "blocked analytics is not auto-activated",
  analyticsBlocked.modules.find((m) => m.id === "analytics")?.decision === "needs-setup" &&
    !analyticsBlocked.activationModules.includes("analytics"),
);

const gold = composeExperienceRecommendation(
  baseSignals({
    existingBranding: {
      ...baseSignals({}).existingBranding,
      accentColor: "#C9A962",
    },
  }),
);
check(
  "KXD gold is not treated as inferred client brand",
  gold.branding.accentColor !== "#C9A962" && gold.branding.colorSource !== "authoritative",
);

const primal = composeExperienceRecommendation(
  baseSignals({
    clientId: 1,
    clientName: "Primal Motorsports",
    clientSlug: "any-client",
    profileStatus: "active",
    existingSelectedModules: [...PRIMAL_EXPERIENCE_PROFILE.enabledModules],
    inventoryCount: 4,
    websiteUrl: "https://example.com",
    websiteReviewCount: 2,
    hasHostingInfra: true,
    logoHasFile: true,
    logoSource: "onboarding",
    existingBranding: {
      ...baseSignals({}).existingBranding,
      accentColor: "#A83424",
      welcomeEyebrow: "Partnership",
      reassuranceLine: "Every revision is tracked. Nothing gets lost.",
      portalSidebarLabel: "Partnership workspace",
    },
  }),
);
check(
  "active CES modules stay recommended (Primal-shaped, no slug check)",
  ["website-review", "website-workspace", "inventory", "executive-review"].every((id) =>
    primal.activationModules.includes(id as never),
  ),
);
check("Primal-shaped rec does not add Advisor", !primal.activationModules.includes("advisor"));
check(
  "Meetings/team/resources stay off without signals",
  ["meetings", "team", "resources"].every(
    (id) => primal.modules.find((m) => m.id === id)?.decision === "exclude",
  ),
);

const genericHq = composeExperienceRecommendation(baseSignals({}));
check(
  "generic empty client does not invent noisy HQ modules",
  !genericHq.activationModules.some((id) =>
    ["projects", "meetings", "team", "resources", "advisor"].includes(id),
  ),
);

const billingOff = composeExperienceRecommendation(
  baseSignals({ monthlyRetainerAmount: 500, billingNavAvailable: false }),
);
check(
  "billing stays gated off without Stripe eligibility",
  billingOff.modules.find((m) => m.id === "invoices")?.acceptedDefault === false,
);

const previewStart = read("app/api/admin/portal/preview/start/route.ts");
const resolve = read("lib/ces/profile/resolve.ts");
check(
  "operator preview can overlay draft without profile write",
  previewStart.includes("draftComposition") &&
    resolve.includes("draftComposition") &&
    resolve.includes('source: "profile"'),
);

if (failed > 0) {
  console.error(`\nFAILED ${failed}  passed ${passed}`);
  process.exit(1);
}
console.log(`\nOK — ${passed} checks`);
