/**
 * Source contracts and pure composition fixtures for the client doctrine.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { clientMetricLabel, clientStatusLabel } from "../lib/ces/copy/portal-language";
import {
  composeClientHomePresentation,
  isHomeZoneVisible,
  resolveCesHomeSurface,
  resolvePortalHomeComposition,
} from "../lib/ces/modules/home";
import { composePartnershipServiceSummary } from "../lib/ces/partnership/service-value";
import type { PartnershipBriefing } from "../lib/ces/partnership/types";
import type { ResolvedExperienceProfile } from "../lib/ces/types";
import type { ResolvedServiceScope } from "../lib/service-capabilities";
import { buildWorkPerformanceNextMoves } from "../lib/portal/work-performance/next-moves";
import type { WorkPerformanceModel } from "../lib/portal/work-performance";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function check(label: string, pass: boolean) {
  console.log(pass ? `  ✔ ${label}` : `  ✗ ${label}`);
  if (!pass) throw new Error(label);
}

const profile: ResolvedExperienceProfile = {
  profileId: 1,
  source: "profile",
  identity: {
    clientId: 14,
    clientName: "Fixture Company",
    clientSlug: "fixture-company",
    logoUrl: null,
    logoAlt: "Fixture Company",
    websiteUrl: "https://example.com",
  },
  visual: {
    primaryColor: "#111111",
    secondaryColor: "#222222",
    accentColor: "#c7a65c",
    surfaceTint: null,
    borderRadiusPreset: "default",
    motionPreset: "calm",
  },
  hospitality: {
    welcomeEyebrow: "Welcome",
    reassuranceLine: "In good hands",
    supportTone: "warm-professional",
    portalSidebarLabel: "Workspace",
    partnerFooterLine: "Kreate by Design",
    showPartnerMark: true,
  },
  enabledModules: ["executive-performance"],
  enabledPortalModules: ["overview", "executive-performance", "reports"],
  reportingCapabilities: [],
  presentation: null,
  terminology: {},
  cssVars: {},
};

const briefing = {
  clientSlug: "fixture-company",
  clientName: "Fixture Company",
  overview: {
    relationshipStatus: "Active partnership",
    currentPhase: "Ongoing partnership",
    currentFocus: "Managing active work",
    lastMajorMilestone: "Workspace opened",
    nextMilestone: "Advance the next agreed priority",
    recommendationLine: "Keep moving",
  },
  services: { relationshipLabel: "Active relationship", items: [] },
  needsAttention: {
    action: null,
    href: null,
    emptyMessage: "Nothing is waiting on you",
  },
  recommendation: {
    headline: "Keep moving",
    rationale: "Verified work is moving forward.",
    evidenceLabels: ["Recorded work"],
  },
} as unknown as PartnershipBriefing;

const work = {
  clientId: 14,
  clientName: "Fixture Company",
  clientSlug: "fixture-company",
  reportingMonthLabel: "August 2026",
  comparisonPeriodLabel: null,
  valueSummary: {
    periodLabel: "August 2026",
    completedCount: 1,
    activeCount: 1,
    awaitingClientCount: 0,
    headline: "Work moved forward",
    lead: "Evidence-bound.",
  },
  completedThisMonth: [
    {
      id: "completed-1",
      title: "Website update",
      completedAt: "2026-08-08T12:00:00.000Z",
      updatedAt: "2026-08-08T12:00:00.000Z",
      categoryLabel: "Website",
      href: null,
      source: "deliverable",
    },
  ],
  currentlyInProgress: [
    {
      id: "active-1",
      title: "Search review",
      statusLabel: "KXD is working on it",
      owner: "kxd",
      updatedAt: "2026-08-09T12:00:00.000Z",
      href: null,
      source: "project",
    },
  ],
  updateRequests: {
    availability: "empty",
    openCount: 0,
    awaitingClientCount: 0,
    inProgressCount: 0,
    completedThisMonthCount: 0,
    priority: [],
    primaryAction: null,
  },
  analytics: {
    availability: "empty",
    periodLabel: "August 2026",
    freshnessNote: null,
    metrics: [],
    statusNote: null,
  },
  leads: {
    availability: "empty",
    periodLabel: "August 2026",
    conversionCount: null,
    conversionLabel: "Tracked website actions",
    statusNote: null,
    salesPipelineAvailable: false,
  },
  wins: [],
  nextMoves: [],
  monthlySummaryScopeNote: "Recorded work only.",
  emptyStates: {
    completed: { title: "None", lead: "None" },
    active: { title: "None", lead: "None" },
    requests: { title: "None", lead: "None" },
    analytics: { title: "None", lead: "None" },
    leads: { title: "None", lead: "None" },
    wins: { title: "None", lead: "None" },
    nextMoves: { title: "None", lead: "None" },
  },
} as WorkPerformanceModel;

function main() {
  console.log("\nKXD Client Experience Doctrine verification\n");

  const scope: ResolvedServiceScope = {
    hasAuthoritativeScope: true,
    relationshipLabel: "Managed growth partnership",
    activeCapabilityIds: ["managed_website", "performance_component"],
    grantedModules: ["overview"],
    grantedReporting: [],
    assignments: [],
  };
  const services = composePartnershipServiceSummary(scope);
  check(
    "commercial service adapter hides performance mechanics and capability IDs",
    services.items.length === 1 &&
      services.items[0]?.label === "Website Management" &&
      !JSON.stringify(services).includes("managed_website") &&
      !JSON.stringify(services).includes("performance_component"),
  );

  const home = composeClientHomePresentation({
    greeting: "Good afternoon, Avery.",
    profile,
    briefing,
    workPerformance: work,
  });
  check(
    "home hierarchy uses recorded work and preserves calm empty attention",
    home.welcome.greeting === "Good afternoon, Avery." &&
      home.accomplishments[0]?.title === "Website update" &&
      home.advancing[0]?.title === "Search review" &&
      home.attention.items.length === 0 &&
      home.businessImpact === null,
  );

  const composition = resolvePortalHomeComposition({ profile });
  check(
    "home and routes remain entitlement filtered",
    composition.zones.some((zone) => zone.id === "partnership-briefing" && zone.visible) &&
      composition.zones.some((zone) => zone.id === "requests" && !zone.visible),
  );
  check(
    "composed Executive Performance keeps the EP home surface",
    isHomeZoneVisible(composition, "executive-performance") &&
      resolveCesHomeSurface({
        homeComposition: composition,
        hasExecutivePerformance: true,
        hasWorkPerformance: true,
      }) === "executive-performance",
  );
  check(
    "workPerformance data alone does not switch an EP home to command home",
    resolveCesHomeSurface({
      homeComposition: composition,
      hasExecutivePerformance: true,
      hasWorkPerformance: true,
    }) !== "client-command",
  );
  const genericProfile: ResolvedExperienceProfile = {
    ...profile,
    enabledModules: ["website-review"],
    enabledPortalModules: ["overview", "website-review", "reports"],
  };
  const genericComposition = resolvePortalHomeComposition({ profile: genericProfile });
  check(
    "generic CES without EP-owned home can use command home",
    !isHomeZoneVisible(genericComposition, "executive-performance") &&
      resolveCesHomeSurface({
        homeComposition: genericComposition,
        hasExecutivePerformance: false,
        hasWorkPerformance: true,
      }) === "client-command",
  );
  check(
    "EP zone without a composed briefing does not invent the EP workspace",
    resolveCesHomeSurface({
      homeComposition: composition,
      hasExecutivePerformance: false,
      hasWorkPerformance: true,
    }) === "client-command",
  );
  const homeRenderSource = [
    read("lib/ces/modules/home.ts"),
    read("components/ces/portal/CesPortalHome.tsx"),
  ].join("\n");
  check(
    "home precedence has no slug or client-id branching",
    !/primal-motorsports|otp-carts|PRIMAL_CLIENT|clientSlug\s*===|clientId\s*===\s*14/.test(
      homeRenderSource,
    ) && read("components/ces/portal/CesPortalHome.tsx").includes("resolveCesHomeSurface"),
  );
  const moves = buildWorkPerformanceNextMoves({
    profile,
    awaitingClientCount: 0,
    activeReviewCount: 0,
    hasAnalytics: true,
    completedThisMonth: 1,
  });
  check(
    "recommended routes cannot drift beyond profile services",
    moves.some((move) => move.href === "/portal/reports") &&
      !moves.some((move) => move.href === "/portal/requests"),
  );

  check(
    "shared client language translates workflow and reporting terms",
    clientStatusLabel("triaged") === "Reviewed by KXD" &&
      clientStatusLabel("waiting_on_client") === "Waiting on you" &&
      clientMetricLabel("sessions") === "Website visits" &&
      clientMetricLabel("ctr") === "Search result click rate",
  );

  const clientSources = [
    "components/ces/modules/inventory/InventoryEditor.tsx",
    "components/ces/modules/website-workspace/WebsiteWorkspaceEditPanel.tsx",
    "components/portal/AnalyticsVisibilityWorkspace.tsx",
    "components/client-hq/WebsiteHealthScreen.tsx",
    "lib/portal/analytics-visibility/compose.ts",
  ]
    .map(read)
    .join("\n");
  const forbidden = [
    "KXD OS admin",
    "Editorial copy",
    ">CTA<",
    "Synced reporting facts",
    "No GA4 property configured",
    "No Search Console site configured",
  ];
  check(
    "client-visible source contains no known internal vocabulary",
    forbidden.every((phrase) => !clientSources.includes(phrase)),
  );

  const partnershipSource = [
    read("lib/ces/partnership/compose.ts"),
    read("lib/ces/partnership/recommend.ts"),
  ].join("\n");
  check(
    "generic partnership composition contains no unconditional launch or advertising claims",
    !partnershipSource.includes("Flagship site rebuilt") &&
      !partnershipSource.includes("Growth advertising") &&
      !partnershipSource.includes("Lead tracking verified") &&
      !partnershipSource.includes("Website launch"),
  );
  check(
    "generic partnership fallbacks stay evidence-bound",
    !partnershipSource.includes("portalLive: true") &&
      !partnershipSource.includes("Active partnership") &&
      !partnershipSource.includes("Maintaining momentum") &&
      !partnershipSource.includes("Active and moving forward") &&
      !partnershipSource.includes("Everything is in good hands.") &&
      !partnershipSource.includes("Managed website connected") &&
      !partnershipSource.includes("Review the website and leave any remaining notes") &&
      !partnershipSource.includes("The foundation is in place") &&
      !partnershipSource.includes("Partnership foundations established") &&
      !partnershipSource.includes("Private partnership workspace"),
  );

  const executiveRoute = read("app/(portal)/portal/(app)/executive-review/page.tsx");
  const partnershipRoute = read("app/(portal)/portal/(app)/partnership/page.tsx");
  check(
    "entitled routes provide graceful content fallbacks",
    executiveRoute.includes("CesExecutiveReviewUnavailable") &&
      partnershipRoute.includes("CesPartnershipBriefing"),
  );

  const cesStyles = read("design-system/ces/styles/kxd-ces.css");
  const commandHome = read("components/ces/portal/CesClientCommandHome.tsx");
  check(
    "client primitives preserve keyboard focus, reduced motion, and semantic sections",
    cesStyles.includes(":focus-visible") &&
      cesStyles.includes("@media (prefers-reduced-motion: reduce)") &&
      commandHome.includes('aria-labelledby="client-attention-title"') &&
      commandHome.includes("aria-labelledby={id}"),
  );

  console.log("\nClient Experience Doctrine verification passed.\n");
}

main();
