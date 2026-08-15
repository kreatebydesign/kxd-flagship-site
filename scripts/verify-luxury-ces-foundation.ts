/**
 * Luxury CES foundation — Phases 1–4.
 * Pure contracts. No DB. No OTP/Don/production writes.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { resolveCesInteractiveAccent } from "../lib/ces/profile/accent";
import { clientPortalNavLabel } from "../lib/ces/copy/client-nav-labels";
import {
  composeClientHomePresentation,
  resolveCesHomeSurface,
  resolvePortalHomeComposition,
  resolvePortalHomeShell,
} from "../lib/ces/modules/home";
import type { PartnershipBriefing } from "../lib/ces/partnership/types";
import type { ResolvedExperienceProfile } from "../lib/ces/types";
import {
  portalTimeGreeting,
  resolvePortalGreetingName,
} from "../lib/portal/greeting";
import { getEnabledPortalNavGroups } from "../lib/portal/nav";
import type { WorkPerformanceModel } from "../lib/portal/work-performance";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

let failed = 0;

function check(label: string, pass: boolean) {
  console.log(pass ? `  ✔ ${label}` : `  ✘ ${label}`);
  if (!pass) failed += 1;
}

const profile: ResolvedExperienceProfile = {
  profileId: 9,
  source: "profile",
  identity: {
    clientId: 9,
    clientName: "Fixture Company",
    clientSlug: "fixture-company",
    logoUrl: "/logo.svg",
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
    welcomeEyebrow: "Your partnership",
    reassuranceLine: "In good hands",
    supportTone: "warm-professional",
    portalSidebarLabel: "Workspace",
    partnerFooterLine: "Kreate by Design",
    showPartnerMark: true,
  },
  enabledModules: ["website-review"],
  enabledPortalModules: ["overview", "website-review", "analytics", "reports", "requests"],
  reportingCapabilities: ["website-analytics"],
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
    currentFocus: "Managing website care and requests.",
    lastMajorMilestone: "",
    nextMilestone: "",
    recommendationLine: "",
  },
  services: {
    relationshipLabel: "Managed growth partnership",
    items: [
      {
        id: "active-service-1",
        label: "Website Management",
        value: "Website care, updates, and day-to-day partnership support.",
      },
      {
        id: "active-service-2",
        label: "Analytics & Performance Reporting",
        value: "Website and search performance reporting for this partnership.",
      },
    ],
  },
  needsAttention: { action: null, href: null, emptyMessage: "Nothing is waiting on you" },
  recommendation: {
    headline: "Keep moving",
    rationale: "Verified work is moving forward.",
    evidenceLabels: ["Recorded work"],
  },
} as unknown as PartnershipBriefing;

const work = {
  clientId: 9,
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
    availability: "ready",
    periodLabel: "August 2026",
    freshnessNote: null,
    metrics: [
      {
        key: "sessions",
        label: "Sessions",
        valueLabel: "1,240",
        previousLabel: null,
        deltaLabel: null,
        trend: "up",
        domain: "website",
      },
    ],
    statusNote: null,
  },
  leads: {
    availability: "ready",
    periodLabel: "August 2026",
    conversionCount: 12,
    conversionLabel: "Tracked website actions",
    statusNote: null,
    salesPipelineAvailable: false,
  },
  wins: [],
  nextMoves: [],
  clientValue: null,
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

console.log("\nLuxury CES foundation\n");

const shell = read("components/client-hq/ClientHqShell.tsx");
const cesCss = read("design-system/ces/styles/kxd-ces.css");
const osCss = read("design-system/os/styles/kxd-os.css");
const sessionSrc = read("lib/portal/session.ts");
const greetingSrc = read("lib/portal/greeting.ts");
const homeSrc = read("lib/ces/modules/home.ts");
const commandHome = read("components/ces/portal/CesClientCommandHome.tsx");

check(
  "preview banner is rendered before .kxd-os-app",
  shell.indexOf("OperatorPortalPreviewBanner") < shell.indexOf("kxd-os-app${"),
);
check(
  "preview banner sits outside KxdShell so atelier width cannot trap studio chrome",
  shell.indexOf("OperatorPortalPreviewBanner") < shell.indexOf("<KxdShell"),
);
check(
  "sidebar/main have explicit CES grid columns",
  cesCss.includes(".kxd-ces-app .kxd-os-sidebar.kxd-ces-sidebar") &&
    cesCss.includes("grid-column: 1") &&
    cesCss.includes(".kxd-ces-app .kxd-os-app__main") &&
    cesCss.includes("grid-column: 2"),
);
const luxuryDesktopIdx = cesCss.indexOf("@media (min-width: 1600px)");
const luxuryMobileIdx = cesCss.lastIndexOf("Drawer lock");
const drawerLockCss = luxuryMobileIdx >= 0 ? cesCss.slice(luxuryMobileIdx) : "";
check(
  "CES shell has 961 / 1281 / 1600 / 960 breakpoint contracts",
  cesCss.includes("@media (min-width: 961px) and (max-width: 1280px)") &&
    cesCss.includes("@media (min-width: 1281px) and (max-width: 1599px)") &&
    cesCss.includes("@media (min-width: 1600px)") &&
    cesCss.includes("@media (max-width: 960px)") &&
    cesCss.includes("max-width: min(120rem, 92vw)") &&
    luxuryDesktopIdx >= 0,
);
check(
  "mobile drawer lock preserves fixed hidden/open behavior after luxury ≤960 rules",
  drawerLockCss.includes("display: none") &&
    drawerLockCss.includes("position: fixed") &&
    drawerLockCss.includes(".kxd-ces-nav-open") &&
    drawerLockCss.includes(".kxd-ces-nav-check:checked") &&
    drawerLockCss.includes("display: flex") &&
    luxuryMobileIdx > luxuryDesktopIdx &&
    shell.includes("kxd-ces-nav-check") &&
    shell.includes("htmlFor={`${navId}-toggle`}"),
);
check(
  "global admin .kxd-os-app sidebar width remains 13rem",
  osCss.includes("--kxd-os-sidebar-width: 13rem") &&
    /--kxd-os-sidebar-width:\s*13rem/.test(osCss) &&
    !cesCss.includes(".kxd-os-app {\n  display: grid") &&
    cesCss.includes('.kxd-ces-app[data-ces-shell="ces"]'),
);
check(
  "forced SaaS blue accent is gone",
  !cesCss.includes("#0071e3 !important") && !cesCss.includes("--kxd-ces-accent: #0071e3"),
);
check(
  "unsafe gold brand does not become interactive accent",
  resolveCesInteractiveAccent("#c7a65c") === "#1c1917",
);
check(
  "safe ink/red can remain interactive accent",
  resolveCesInteractiveAccent("#A83424") === "#A83424",
);

check(
  "preview greeting never becomes Operator",
  resolvePortalGreetingName({
    displayName: "Operator Preview · Fixture Company",
    greetingName: "",
    isOperatorPreview: true,
  }) === "" &&
    portalTimeGreeting("Operator", {
      now: new Date("2026-08-10T02:00:00.000Z"),
      timeZone: "America/Los_Angeles",
    }) === "Good evening.",
);
check(
  "real member greeting uses first name",
  portalTimeGreeting(
    resolvePortalGreetingName({
      displayName: "Don Smith",
      greetingName: "Don",
      isOperatorPreview: false,
    }),
    { now: new Date("2026-08-10T02:00:00.000Z"), timeZone: "America/Los_Angeles" },
  ) === "Good evening, Don.",
);
check(
  "timezone-aware hour uses Pacific rather than UTC",
  portalTimeGreeting("Don", {
    now: new Date("2026-08-10T16:00:00.000Z"),
    timeZone: "America/Los_Angeles",
  }) === "Good morning, Don." &&
    portalTimeGreeting("Don", {
      now: new Date("2026-08-10T16:00:00.000Z"),
      timeZone: "UTC",
    }) === "Good afternoon, Don.",
);
check(
  "session keeps preview audit displayName but empty greetingName",
  sessionSrc.includes('displayName: `Operator Preview · ${clientName}`') &&
    sessionSrc.includes('greetingName: ""') &&
    greetingSrc.includes("resolvePortalGreetingName"),
);

const epProfile: ResolvedExperienceProfile = {
  ...profile,
  enabledModules: ["executive-performance", "website-review"],
  enabledPortalModules: ["overview", "executive-performance", "website-review"],
};
const epComposition = resolvePortalHomeComposition({ profile: epProfile });
check(
  "Primal-equivalent EP precedence is unchanged",
  resolvePortalHomeShell(epProfile) === "ces" &&
    resolveCesHomeSurface({
      homeComposition: epComposition,
      hasExecutivePerformance: true,
      hasWorkPerformance: true,
    }) === "executive-performance",
);
const genericComposition = resolvePortalHomeComposition({ profile });
check(
  "generic CES command home still requires workPerformance and no composed EP",
  resolveCesHomeSurface({
    homeComposition: genericComposition,
    hasExecutivePerformance: false,
    hasWorkPerformance: true,
  }) === "client-command",
);

const home = composeClientHomePresentation({
  greeting: "Good evening, Avery.",
  profile,
  briefing,
  workPerformance: work,
});
check(
  "outcome-first home has welcome, attention, work, performance, and services",
  home.welcome.greeting === "Good evening, Avery." &&
    home.attention.items.length === 0 &&
    home.accomplishments.length === 1 &&
    home.advancing[0]?.title === "Search review" &&
    home.performance.visible &&
    home.performance.facts[0]?.label === "Website visits" &&
    home.services[0]?.title === "Website Management" &&
    home.services[1]?.title === "Analytics & Performance Reporting" &&
    /website/i.test(home.welcome.lead) &&
    /performance reporting/i.test(home.welcome.lead) &&
    !/supporting activity|shared workflow/i.test(home.welcome.lead),
);
const websiteOnlyHome = composeClientHomePresentation({
  greeting: "Good evening, Avery.",
  profile,
  briefing: {
    ...briefing,
    services: {
      ...briefing.services,
      items: [briefing.services.items[0]!],
    },
  },
  workPerformance: work,
});
check(
  "performance band is omitted when analytics is not commercially assigned",
  websiteOnlyHome.performance.visible === false &&
    websiteOnlyHome.services.every((item) => !/analytics|performance reporting/i.test(item.title)),
);
const entitledEmptyAnalytics = composeClientHomePresentation({
  greeting: "Good evening, Avery.",
  profile,
  briefing,
  workPerformance: {
    ...work,
    analytics: {
      ...work.analytics,
      availability: "empty",
      metrics: [],
      statusNote: null,
    },
  },
});
check(
  "entitled analytics without data uses a prepared-state note",
  entitledEmptyAnalytics.performance.visible &&
    entitledEmptyAnalytics.performance.facts.length === 0 &&
    entitledEmptyAnalytics.performance.statusNote === "Performance reporting is being prepared.",
);
check(
  "GA4 conversion counts do not create a Lead & Business Impact band",
  home.businessImpact === null,
);
check(
  "fake commission aggregates are rejected",
  composeClientHomePresentation({
    greeting: "Good evening.",
    profile,
    briefing,
    workPerformance: work,
    businessImpact: {
      items: [{ id: "x", title: "$300 commission due", detail: null, meta: null, href: null }],
      note: null,
    },
  }).businessImpact === null,
);

const nav = getEnabledPortalNavGroups(profile);
const labels = nav.flatMap((group) => group.items.map((item) => `${item.id}:${item.label}`));
check(
  "CES nav uses client-safe labels without renaming module ids",
  labels.includes("overview:Home") &&
    labels.includes("website-review:Website feedback") &&
    labels.includes("analytics:Performance") &&
    clientPortalNavLabel("website-health", {}, "Website Health") === "Website status" &&
    clientPortalNavLabel("assets", {}, "Files") === "Documents" &&
    clientPortalNavLabel("settings", {}, "Settings") === "Account" &&
    clientPortalNavLabel("executive-review", {}, "Executive Review") === "Monthly review" &&
    clientPortalNavLabel("website-review", { "nav.website-review": "Website Review" }, "Website Review") ===
      "Website Review",
);

const hqProfile: ResolvedExperienceProfile = {
  ...profile,
  source: "fallback",
  enabledModules: [],
  enabledPortalModules: [],
};
check(
  "non-CES HQ shell stays hq and keeps Overview label",
  resolvePortalHomeShell(hqProfile) === "hq" &&
    getEnabledPortalNavGroups(hqProfile)
      .flatMap((group) => group.items)
      .some((item) => item.id === "overview" && item.label === "Overview"),
);

check(
  "command home has no fashion hero, Operator, commission, or GA4 language",
  !commandHome.includes("kxd-client-home__hero") &&
    !commandHome.includes("Operator") &&
    !commandHome.includes("commission") &&
    !commandHome.includes("GA4") &&
    !commandHome.includes("CesEmptyState") &&
    !commandHome.includes("shared workflow") &&
    !homeSrc.includes("otp-carts") &&
    !homeSrc.includes("primal-motorsports") &&
    !homeSrc.includes("HOME_SERVICE_MODULE_IDS"),
);
const resolveSrc = read("lib/ces/profile/resolve.ts");
check(
  "preview identity prefers durable media URLs over /api/media/file",
  resolveSrc.includes("generatePayloadMediaFileUrl") &&
    resolveSrc.includes("/api/media/file/") &&
    resolveSrc.includes("isEphemeralApi"),
);
check(
  "no 34rem hero remains in CES CSS",
  !cesCss.includes("min-height: clamp(22rem, 48vw, 34rem)") &&
    !cesCss.includes("34rem fashion") &&
    cesCss.includes(".kxd-client-home__welcome"),
);

if (failed > 0) {
  console.error(`\nFAILED ${failed} luxury CES foundation checks\n`);
  process.exit(1);
}
console.log("\nLuxury CES foundation verification passed.\n");
