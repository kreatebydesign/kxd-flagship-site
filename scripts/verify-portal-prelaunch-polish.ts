/**
 * Verify portal pre-launch polish — presentation, launch-stage copy, navigation composition.
 * Run: npx tsx scripts/verify-portal-prelaunch-polish.ts
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildDefaultCesProfileData } from "../lib/client-launch/defaults";
import { normalizeCesExperienceModuleList } from "../lib/ces/modules/canonical";
import type { ResolvedExperienceProfile } from "../lib/ces/types";
import { launchDraftLinkedClientId } from "../lib/client-launch-wizard/draft/linked-client";
import {
  formatPortalEngagementStatus,
  formatPortalPaymentLabel,
} from "../lib/portal/active-engagement/presentation";
import { composePerformanceStory } from "../lib/portal/client-value/performance-story";
import { resolvePortalEngagementLifecycle } from "../lib/portal/client-value/lifecycle";
import { getEnabledPortalNavGroups } from "../lib/portal/nav";
import { defaultWorkPerformancePeriod } from "../lib/portal/work-performance/period";

const root = process.cwd();

function check(label: string, ok: boolean) {
  if (!ok) {
    console.error(`FAIL: ${label}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${label}`);
  }
}

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

check(
  "executed + paid maps to Active engagement status",
  formatPortalEngagementStatus({
    commercialStatus: "accepted",
    contractStatus: "executed",
    paymentStatus: "paid",
  }) === "Active",
);

check(
  "payment label stays Paid",
  formatPortalPaymentLabel("paid") === "Paid",
);

const launchStory = composePerformanceStory({
  reportingFacts: [],
  reportingEntitled: false,
  reportingPeriod: defaultWorkPerformancePeriod(),
  ga4Mapped: false,
  gscMapped: false,
  websiteReviewEntitled: true,
  engagementLifecycle: "website-build",
});

check(
  "website-build uses launch-stage availability",
  launchStory.availability === "launch-stage" &&
    !launchStory.whatMovedForward.includes("not enabled"),
);

check(
  "rebuild title resolves website-build lifecycle",
  resolvePortalEngagementLifecycle({
    engagement: {
      available: true,
      title: "Agreement — de Bois Entertainment Website Rebuild",
      statusLabel: "Active",
      periodLabel: null,
      paymentLabel: "Paid",
      capacityLabel: null,
      includedSummary: null,
    },
    monthlyRetainerAmount: 0,
    serviceScope: null,
  }) === "website-build",
);

check(
  "launch draft handoff links sourceClientId to client",
  launchDraftLinkedClientId({
    launchedClient: null,
    payload: {
      commercialHandoff: { sourceClientId: 19, reuseExistingClient: true },
      modules: [{ moduleId: "website-review", selected: true, source: "package-default" }],
    },
  }) === 19,
);

const inferredModules = ["website-review"] as const;
const cesDefaults = buildDefaultCesProfileData({
  clientName: "de Bois Entertainment",
  clientSlug: "de-bois-entertainment-4bfe00",
  enabledModules: normalizeCesExperienceModuleList(inferredModules),
});
const inferredProfile: ResolvedExperienceProfile = {
  profileId: null,
  source: "profile",
  identity: {
    clientId: 19,
    clientName: "de Bois Entertainment",
    clientSlug: "de-bois-entertainment-4bfe00",
    logoUrl: null,
    logoAlt: "de Bois Entertainment",
    websiteUrl: null,
  },
  visual: {
    primaryColor: cesDefaults.primaryColor,
    secondaryColor: cesDefaults.secondaryColor,
    accentColor: cesDefaults.accentColor,
    surfaceTint: cesDefaults.surfaceTint,
    borderRadiusPreset: cesDefaults.borderRadiusPreset,
    motionPreset: cesDefaults.motionPreset,
  },
  hospitality: {
    welcomeEyebrow: cesDefaults.welcomeEyebrow,
    reassuranceLine: cesDefaults.reassuranceLine,
    supportTone: cesDefaults.supportTone,
    portalSidebarLabel: cesDefaults.portalSidebarLabel,
    partnerFooterLine: cesDefaults.partnerFooterLine,
    showPartnerMark: cesDefaults.showKxdPartnerMark,
  },
  enabledModules: cesDefaults.enabledModules,
  enabledPortalModules: [...inferredModules],
  reportingCapabilities: [],
  presentation: null,
  terminology: cesDefaults.terminology,
  cssVars: {},
};
const navLabels = getEnabledPortalNavGroups(inferredProfile).flatMap((group) =>
  group.items.map((item) => item.label),
);
check(
  "inferred profile nav includes Website Review",
  navLabels.includes("Website Review"),
);
check(
  "inferred profile nav includes Account",
  navLabels.some((label) => label.toLowerCase().includes("account") || label === "Settings"),
);

const inferSrc = read("lib/ces/profile/infer-portal-modules.ts");
const linkSrc = read("lib/client-launch-wizard/draft/linked-client.ts");
check(
  "infer modules matches launch drafts in memory via handoff",
  inferSrc.includes("launchDraftLinkedClientId") &&
    linkSrc.includes("commercialHandoff") &&
    !inferSrc.includes("payload.commercialHandoff.sourceClientId"),
);

const homeSrc = read("components/ces/portal/CesClientCommandHome.tsx");
check(
  "home hides reporting-not-enabled for launch-stage",
  homeSrc.includes("launch-stage") && homeSrc.includes("Website project"),
);

const css = read("design-system/ces/styles/kxd-ces.css");
check(
  "sidebar logo max dimensions increased",
  css.includes("13.5rem") && css.includes("4.25rem"),
);

console.log("\nPortal pre-launch polish checks finished.\n");
