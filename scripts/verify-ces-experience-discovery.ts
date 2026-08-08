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
  isSameManagedOrigin,
} from "../lib/client-command/experience/composer/discover/html.ts";
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
    ui.includes("Import This Logo") &&
    ui.includes("Use This Property"),
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

if (failed > 0) {
  console.error(`\nFAILED ${failed}  passed ${passed}`);
  process.exit(1);
}
console.log(`\nOK — ${passed} checks`);
