/**
 * Client Experience discovery + import safety.
 * Run: npm run verify:ces-experience-discovery
 */

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  extractColorCandidates,
  extractLogoCandidates,
  extractMeasurementIds,
  isManagedSiteAsset,
  isSameManagedOrigin,
  logoUrlsMatch,
} from "../lib/client-command/experience/composer/discover/html.ts";
import {
  isSvgLogo,
  prepareManagedLogoUpload,
} from "../lib/client-command/experience/composer/import-logo.ts";
import { resolveMediaAssetUrl } from "../lib/client-command/experience/media-url.ts";
import { composeExperienceRecommendation } from "../lib/client-command/experience/composer/recommend.ts";
import type { ExperienceSignals } from "../lib/client-command/experience/composer/types.ts";
import { EMPTY_SERVICE_SCOPE } from "../lib/service-capabilities/resolve.ts";
import {
  classifyGscSite,
  findImportableGa4Property,
  findImportableGscSite,
  proposeUnverifiedGscCandidate,
  scoreGa4Property,
} from "../lib/client-command/experience/composer/discover/google-match.ts";
import { extractGa4PropertyIdFromEvidence, isKxdGoldHex } from "../lib/client-command/experience/composer/readiness.ts";
import { normalizeGa4PropertyId } from "../lib/reporting/providers/connection-resolve.ts";

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

console.log("\nCES — Experience Discovery + Import Safety\n");

const composerDir = path.join(root, "lib/client-command/experience/composer");
const composerSource = walkTs(composerDir).map((f) => readFileSync(f, "utf8")).join("\n");
check(
  "discovery has no OTP/Primal slug branching",
  !/otp-carts|primal-motorsports|ON_TRACK|PRIMAL_CLIENT_SLUG/.test(composerSource),
);

const html = `
<title>Example Carts | Home</title>
<meta property="og:site_name" content="Example Carts" />
<meta name="theme-color" content="#1F4E79" />
<meta property="og:image" content="/media/brand/social-share.png" />
<link rel="icon" href="/favicon.ico" />
<script type="application/ld+json">{"@type":"Organization","name":"Example Carts","logo":"/media/brand/logo-example-mark.svg"}</script>
<img src="/media/brand/logo-example-mark.svg" alt="Example Carts" />
<script>gtag('config','G-ABCDEF12XY');</script>
<style>.x{color:#C9A962}</style>
`;

const logos = extractLogoCandidates(html, "https://example-carts.com");
check(
  "managed-site logo path is a high-confidence candidate",
  logos.some(
    (logo) =>
      logo.url.includes("/media/brand/logo-example-mark.svg") && logo.confidence === "high",
  ),
);
check(
  "multiple logo candidates are presented rather than silently choosing one",
  logos.length >= 2,
);

const colors = extractColorCandidates(html, [
  { source: "https://example-carts.com/media/brand/logo-example-mark.svg", svg: '<svg><path fill="#1F4E79"/></svg>' },
]);
check("KXD gold is never a discovered client color", colors.every((c) => !isKxdGoldHex(c.hex) && c.hex !== "#C9A962"));
check("trusted site/svg colors remain candidates", colors.some((c) => c.hex === "#1F4E79"));

const measurements = extractMeasurementIds(html);
check(
  "measurement IDs are discovered separately from property IDs",
  measurements.includes("G-ABCDEF12XY") &&
    extractGa4PropertyIdFromEvidence(measurements) === null &&
    normalizeGa4PropertyId("G-ABCDEF12XY") === null,
);

check(
  "same-origin managed website proof is required",
  isSameManagedOrigin("https://example-carts.com", "https://www.example-carts.com/media/brand/logo-example-mark.svg") &&
    !isSameManagedOrigin("https://example-carts.com", "https://other-client.com/logo.svg"),
);
check(
  "logo import matches www/apex and ignores cache-busting query strings",
  logoUrlsMatch(
    "https://www.example-carts.com/media/brand/logo-example-mark.svg",
    "https://example-carts.com/media/brand/logo-example-mark.svg?dpl=abc",
  ) &&
    !logoUrlsMatch(
      "https://example-carts.com/media/brand/logo-example-mark.svg",
      "https://other-client.com/media/brand/logo-example-mark.svg",
    ),
);
check(
  "cross-client managed-site asset cannot be imported",
  isManagedSiteAsset(
    "https://www.example-carts.com/media/brand/logo-example-mark.svg",
    "https://example-carts.com",
    "example-carts.com",
  ) &&
    !isManagedSiteAsset(
      "https://other-client.com/media/brand/logo.svg",
      "https://example-carts.com",
      "example-carts.com",
    ),
);

const svgUpload = await prepareManagedLogoUpload({
  buffer: Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20"><rect width="40" height="20" fill="#1F4E79"/></svg>',
  ),
  mime: "image/svg+xml",
  filename: "logo-example-mark.svg",
});
check("SVG logos are detected before Payload media create", isSvgLogo("image/svg+xml", "logo.svg"));
check(
  "SVG import rasterizes to PNG for the existing media collection",
  svgUpload.ok === true &&
    svgUpload.ok &&
    svgUpload.file.mime === "image/png" &&
    svgUpload.file.filename.endsWith(".png") &&
    svgUpload.file.rasterizedFromSvg &&
    svgUpload.file.buffer.length > 0,
);
check(
  "experience loader resolves filename-only media as a logo URL",
  resolveMediaAssetUrl({ id: 44, filename: "logo-example-mark.png" }) === "/media/logo-example-mark.png" &&
    resolveMediaAssetUrl({ id: 44, url: "/media/stored.png" }) === "/media/stored.png" &&
    resolveMediaAssetUrl(44) === null,
);

const clientA = scoreGa4Property({
  property: {
    propertyId: "111111111",
    displayName: "Example Carts",
    accountDisplayName: "KXD",
    measurementIds: ["G-ABCDEF12XY"],
    streamUris: ["https://example-carts.com"],
  },
  clientName: "Example Carts",
  host: "example-carts.com",
  siteMeasurementIds: ["G-ABCDEF12XY"],
});
const clientB = scoreGa4Property({
  property: {
    propertyId: "222222222",
    displayName: "Other Motors",
    accountDisplayName: "KXD",
    measurementIds: ["G-ZZZZZZZZZZ"],
    streamUris: ["https://other-motors.com"],
  },
  clientName: "Example Carts",
  host: "example-carts.com",
  siteMeasurementIds: ["G-ABCDEF12XY"],
});
check("matched GA4 property is importable", clientA.importable && clientA.propertyId === "111111111");
check(
  "cross-client GA4 candidate cannot be applied",
  !clientB.importable &&
    findImportableGa4Property([clientA, clientB], "222222222") === null &&
    findImportableGa4Property([clientA], "222222222") === null,
);
check(
  "measurement IDs cannot populate the numeric property field",
  findImportableGa4Property([clientA], "G-ABCDEF12XY") === null,
);

const verified = classifyGscSite({
  siteUrl: "sc-domain:example-carts.com",
  permissionLevel: "siteFullUser",
  host: "example-carts.com",
});
const listedUnverified = classifyGscSite({
  siteUrl: "sc-domain:example-carts.com",
  permissionLevel: "siteUnverifiedUser",
  host: "example-carts.com",
});
const proposed = proposeUnverifiedGscCandidate("example-carts.com");
check(
  "verified GSC access is distinguishable from an unverified proposal",
  verified.state === "verified_accessible" &&
    verified.importable &&
    listedUnverified.state === "listed_unverified" &&
    listedUnverified.importable === false &&
    proposed?.state === "proposed_unverified" &&
    proposed.importable === false &&
    findImportableGscSite([listedUnverified, proposed!], proposed?.siteUrl) === null &&
    findImportableGscSite([verified], "sc-domain:example-carts.com")?.importable === true,
);

const discoverRoute = read("app/api/admin/clients/[clientId]/experience/discover/route.ts");
const provisionRoute = read("app/api/admin/clients/[clientId]/experience/provision/route.ts");
const provisionLib = read("lib/client-command/experience/composer/provision.ts");
const activate = read("lib/client-command/experience/composer/activate.ts");
const ui = read("components/admin/operations/client-command/ClientExperienceComposer.tsx");

check(
  "discovery GET cannot write",
  discoverRoute.includes("export async function GET") &&
    !discoverRoute.includes("export async function POST") &&
    !discoverRoute.includes("payload.update") &&
    !discoverRoute.includes("payload.create") &&
    !discoverRoute.includes("applyExperienceProvision") &&
    !discoverRoute.includes("saveOperatorExperience"),
);
check(
  "import requires explicit operator POST",
  provisionRoute.includes("export async function POST") &&
    !provisionRoute.includes("export async function GET") &&
    provisionRoute.includes("import-branding-logo") &&
    provisionRoute.includes("candidateValue"),
);
check(
  "provision never activates CES or invites",
  !provisionLib.includes("saveOperatorExperience") &&
    !provisionLib.includes("listPortalInvitations") &&
    !provisionLib.includes("ensurePortalMembership") &&
    provisionLib.includes("mutatesProfile: false") &&
    provisionLib.includes("invites: false"),
);
check(
  "activate still refuses gold and blockers",
  activate.includes("activationEligible") && activate.includes("KXD gold"),
);
const readiness = read("lib/client-command/experience/composer/readiness.ts");
check(
  "UI discover buttons are wired",
  ui.includes("/experience/discover") &&
    ui.includes("discoverKind") &&
    ui.includes("Discover From Managed Website") &&
    ui.includes("Import This Logo") &&
    ui.includes("Use This Property"),
);
check(
  "logo import loading state is scoped to the selected candidate",
  ui.includes('isProvisionBusy(provisioning, "import-branding-logo", logo.url)') &&
    ui.includes("function provisionBusyKey") &&
    !ui.includes('provisioning === "import-branding-logo" ? "Importing'),
);
check(
  "branding discovery sits in the main Branding section, not only Advanced",
  ui.includes("kxd-ces-exp__branding") &&
    ui.indexOf("Discover From Managed Website") < ui.indexOf("Advanced Configuration"),
);
check(
  "Google integration discovery sits in the main Integrations section",
  ui.includes("Discover Google Integrations") &&
    ui.includes('discover("google")') &&
    ui.indexOf("Discover Google Integrations") < ui.indexOf("Advanced Configuration") &&
    ui.indexOf("kxd-ces-exp__integrations") < ui.indexOf("Advanced Configuration"),
);
check(
  "discover route accepts combined google kind",
  discoverRoute.includes('"google"') && discoverRoute.includes("KINDS"),
);
const signalsSrc = read("lib/client-command/experience/composer/signals.ts");
check(
  "CES signals read infrastructure property IDs rather than integration prose",
  signalsSrc.includes("normalizeGa4PropertyId") &&
    signalsSrc.includes("normalizeSearchConsoleSiteUrl") &&
    signalsSrc.includes("resolveInfrastructureForClient") &&
    !signalsSrc.includes("ga4.detail") &&
    !signalsSrc.includes("gsc.detail"),
);
check(
  "confirmed Search Console persist aligns status enum with stored site URL",
  provisionLib.includes("searchConsoleSiteUrl: match.siteUrl") &&
    provisionLib.includes('searchConsoleStatus: "connected"'),
);
check(
  "Inventory stays navigate-only until a reusable adapter exists",
  readiness.includes('label: "Open Inventory"') &&
    readiness.includes("signed site→OS inventory adapter"),
);
check(
  "Advisor/internal systems remain untouched by discovery/import",
  !provisionLib.includes("advisor") &&
    !discoverRoute.includes("advisor") &&
    !provisionLib.includes("client-experience-profiles"),
);

const load = read("lib/client-command/experience/load.ts");
check(
  "existing experience loader still resolves active profiles independently",
  load.includes("client-experience-profiles") && load.includes("asStatus(profile.status)"),
);
check(
  "loader uses shared media URL resolver and can hydrate numeric logo IDs",
  load.includes("resolveMediaAssetUrl") && load.includes("relMediaId") && load.includes('collection: "media"'),
);
check(
  "logo import no longer requires a brittle exact URL rematch",
  provisionLib.includes("prepareManagedLogoUpload") &&
    provisionLib.includes("isManagedSiteAsset") &&
    !provisionLib.includes("logos.find((logo) => logo.url === candidateUrl)"),
);
check(
  "failed logo import rolls back media and onboarding instead of leaving partial state",
  provisionLib.includes("rollbackLogoImport") &&
    provisionLib.includes("createdOnboardingId") &&
    provisionLib.includes("previousLogoFiles") &&
    provisionLib.includes("durable file URL"),
);
check(
  "logo import requires durable Payload media storage before attach",
  provisionLib.includes("requireDurablePayloadMedia") &&
    provisionLib.includes("isDurablePayloadMediaUrl") &&
    provisionLib.includes("explainPayloadMediaUploadFailure"),
);
check(
  "UI keeps import confirmation while refreshing readiness",
  ui.includes("preserveFeedback") &&
    ui.includes('role="status"') &&
    ui.includes("Import failed") &&
    ui.includes("Nothing was saved") &&
    ui.includes("Branding") &&
    ui.includes('role="alert"'),
);

function miniSignals(partial: Partial<ExperienceSignals> = {}): ExperienceSignals {
  return {
    clientId: 99,
    clientName: "Example Client",
    clientSlug: "example-client",
    clientStatus: "active",
    websiteUrl: "https://example.com",
    brandTier: null,
    monthlyRetainerAmount: 300,
    commercialAgreementId: null,
    currentServices: "SEO\nWebsite Management",
    industry: null,
    serviceScope: EMPTY_SERVICE_SCOPE,
    hasHostingInfra: true,
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
    logoHasFile: false,
    logoSource: "none",
    infrastructureId: 12,
    searchConsoleStatus: "unknown",
    analyticsProvider: null,
    executiveAnalyticsStatus: null,
    executiveSearchConsoleStatus: null,
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

const missingLogo = composeExperienceRecommendation(miniSignals());
const importedLogo = composeExperienceRecommendation(
  miniSignals({ logoHasFile: true, logoSource: "onboarding" }),
);
check(
  "readiness reports logo missing until onboarding media resolves",
  missingLogo.branding.logoHasFile === false &&
    missingLogo.readiness.dependencies.find((d) => d.id === "logo")?.status === "unresolved",
);
check(
  "canonical onboarding logo clears the readiness logo blocker",
  importedLogo.branding.logoHasFile === true &&
    importedLogo.readiness.dependencies.find((d) => d.id === "logo")?.status === "satisfied",
);

if (failed > 0) {
  console.error(`\nFAILED ${failed}  passed ${passed}`);
  process.exit(1);
}
console.log(`\nOK — ${passed} checks`);
