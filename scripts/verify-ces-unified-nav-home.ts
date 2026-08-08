/**
 * Phase 2 — Unified entitlement-aware portal nav + home.
 * Pure. No database. No OTP/Don/production writes.
 *
 * Run: npm run verify:ces-unified-nav-home
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { ResolvedExperienceProfile } from "../lib/ces/types.ts";
import {
  resolvePortalHomeComposition,
  resolvePortalHomeShell,
  shouldUseCesPortalHome,
} from "../lib/ces/modules/home.ts";
import {
  isActiveCesHqAllowlist,
  isPortalModuleVisible,
} from "../lib/ces/modules/visibility.ts";
import { isPortalNavVisibleForCesLaunch } from "../lib/portal/ces-launch-safety.ts";
import { getEnabledPortalNavGroups } from "../lib/portal/nav.ts";
import { isBatchGClientHqSurfaceAvailable } from "../lib/portal/requests-files-reports/surface-access.ts";
import { CES_LAUNCH_HIDDEN_NAV_IDS } from "../lib/portal/ces-launch-safety.ts";
import { computeEffectiveModules } from "../lib/client-plans/resolve.ts";
import { isInternalOnlyEntitlement } from "../lib/client-plans/modules.ts";

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

function stubProfile(
  input: Partial<ResolvedExperienceProfile> & {
    enabledModules?: ResolvedExperienceProfile["enabledModules"];
    source?: ResolvedExperienceProfile["source"];
  } = {},
): ResolvedExperienceProfile {
  return {
    profileId: input.source === "profile" ? 14 : null,
    source: input.source ?? "fallback",
    identity: {
      clientId: input.identity?.clientId ?? 14,
      clientName: input.identity?.clientName ?? "OTP Carts",
      clientSlug: input.identity?.clientSlug ?? "otp-carts",
      logoUrl: null,
      logoAlt: "OTP Carts",
      websiteUrl: "https://otpcarts.com",
    },
    visual: {
      primaryColor: "#0B0B0B",
      secondaryColor: "#141414",
      accentColor: "#C9A962",
      surfaceTint: null,
      borderRadiusPreset: "default",
      motionPreset: "calm",
    },
    hospitality: {
      welcomeEyebrow: "Welcome",
      reassuranceLine: "You’re in good hands.",
      supportTone: "warm-professional",
      portalSidebarLabel: "OTP Carts",
      partnerFooterLine: "Powered by Kreate by Design",
      showPartnerMark: true,
    },
    enabledModules: input.enabledModules ?? [],
    enabledPortalModules: input.enabledPortalModules,
    reportingCapabilities: input.reportingCapabilities ?? [],
    presentation: input.presentation ?? null,
    terminology: input.terminology ?? {},
    cssVars: {},
  };
}

function navHas(groups: ReturnType<typeof getEnabledPortalNavGroups>, id: string): boolean {
  return groups.some((g) => g.items.some((item) => item.id === id));
}

console.log("\nCES Phase 2 — unified nav + home\n");

const page = readFileSync(
  path.join(root, "app/(portal)/portal/(app)/page.tsx"),
  "utf8",
);
check(
  "home page uses resolvePortalHomeComposition (not website-review product switch)",
  page.includes("resolvePortalHomeComposition") &&
    page.includes('home.shell === "ces"') &&
    !page.includes("shouldUseCesPortalHome(profile)"),
);

check("CES_LAUNCH_HIDDEN_NAV_IDS is empty (flagship hide retired)", CES_LAUNCH_HIDDEN_NAV_IDS.length === 0);

const otpOff = stubProfile({
  source: "fallback",
  enabledModules: [],
  identity: { clientId: 14, clientName: "OTP Carts", clientSlug: "otp-carts", logoUrl: null, logoAlt: "OTP Carts", websiteUrl: null },
});
check("OTP WR-off uses HQ shell", resolvePortalHomeShell(otpOff) === "hq");
check("OTP WR-off shouldUseCesPortalHome is false", shouldUseCesPortalHome(otpOff) === false);
check(
  "OTP WR-off still shows analytics/reports/projects",
  isPortalModuleVisible("analytics", { profile: otpOff }) &&
    isPortalModuleVisible("reports", { profile: otpOff }) &&
    isPortalModuleVisible("projects", { profile: otpOff }) &&
    !isPortalModuleVisible("website-review", { profile: otpOff }),
);

const otpOn = stubProfile({
  source: "profile",
  enabledModules: ["website-review"],
  enabledPortalModules: ["website-review", "analytics", "reports", "projects"],
});
check("OTP WR-on + HQ modules uses CES shell", resolvePortalHomeShell(otpOn) === "ces");
check("OTP hypothetical uses active CES HQ allowlist", isActiveCesHqAllowlist(otpOn));
check(
  "OTP hypothetical shows WR + analytics + reports + projects",
  isPortalModuleVisible("website-review", { profile: otpOn }) &&
    isPortalModuleVisible("analytics", { profile: otpOn }) &&
    isPortalModuleVisible("reports", { profile: otpOn }) &&
    isPortalModuleVisible("projects", { profile: otpOn }),
);
check(
  "OTP hypothetical hides unlisted advisor/resources",
  !isPortalModuleVisible("advisor", { profile: otpOn }) &&
    !isPortalModuleVisible("resources", { profile: otpOn }),
);

const otpNav = getEnabledPortalNavGroups(otpOn, { billingNavAvailable: false });
check("OTP hypothetical nav includes Website Review", navHas(otpNav, "website-review"));
check("OTP hypothetical nav includes Analytics", navHas(otpNav, "analytics"));
check("OTP hypothetical nav includes Reports", navHas(otpNav, "reports"));
check("OTP hypothetical nav includes Projects", navHas(otpNav, "projects"));
check("OTP hypothetical nav omits Billing when ineligible", !navHas(otpNav, "invoices"));

const primal = stubProfile({
  source: "profile",
  enabledModules: [
    "website-review",
    "website-workspace",
    "executive-performance",
    "executive-review",
    "inventory",
  ],
  enabledPortalModules: [
    "website-review",
    "website-workspace",
    "executive-performance",
    "executive-review",
    "inventory",
  ],
  identity: {
    clientId: 1,
    clientName: "Primal Motorsports",
    clientSlug: "primal-motorsports",
    logoUrl: null,
    logoAlt: "Primal",
    websiteUrl: "https://primalmotorsports.com",
  },
});
check("Primal uses CES shell", resolvePortalHomeShell(primal) === "ces");
check(
  "Primal CES modules remain visible",
  isPortalModuleVisible("website-review", { profile: primal }) &&
    isPortalModuleVisible("website-workspace", { profile: primal }) &&
    isPortalModuleVisible("inventory", { profile: primal }) &&
    isPortalModuleVisible("executive-review", { profile: primal }),
);
check(
  "Primal CES-only profile allowlists HQ (no noisy default HQ nav)",
  isActiveCesHqAllowlist(primal) &&
    !isPortalModuleVisible("projects", { profile: primal }) &&
    !isPortalModuleVisible("reports", { profile: primal }) &&
    !isPortalModuleVisible("analytics", { profile: primal }) &&
    !isPortalModuleVisible("resources", { profile: primal }) &&
    !isPortalModuleVisible("team", { profile: primal }) &&
    !isPortalModuleVisible("meetings", { profile: primal }) &&
    !isPortalModuleVisible("assets", { profile: primal }) &&
    !isPortalModuleVisible("advisor", { profile: primal }),
);

const primalNav = getEnabledPortalNavGroups(primal, {
  billingNavAvailable: false,
  portfolioNavAvailable: false,
});
const primalNavIds = primalNav.flatMap((g) => g.items.map((item) => item.id)).sort();
const expectedPrimalNavIds = [
  "executive-review",
  "inventory",
  "overview",
  "partnership",
  "settings",
  "website-review",
  "website-workspace",
].sort();
check(
  "Primal intended nav is CES + overview/settings/partnership only",
  primalNavIds.join(",") === expectedPrimalNavIds.join(","),
);

check(
  "Advisor hidden on generic HQ fallback (stub fails closed)",
  !isPortalModuleVisible("advisor", { profile: otpOff }),
);
const advisorExplicit = stubProfile({
  source: "fallback",
  enabledModules: [],
  enabledPortalModules: ["advisor"],
});
check(
  "Advisor visible only when explicitly listed",
  isPortalModuleVisible("advisor", { profile: advisorExplicit }),
);

const inactive = stubProfile({ source: "fallback", enabledModules: [] });
check("inactive/fallback CES profile uses HQ shell", resolvePortalHomeShell(inactive) === "hq");
check(
  "inactive profile home composition is unified",
  resolvePortalHomeComposition({ profile: inactive }).architecture === "unified",
);

const previewSame = getEnabledPortalNavGroups(otpOn, {
  billingNavAvailable: true,
  portfolioNavAvailable: false,
});
const liveSame = getEnabledPortalNavGroups(otpOn, {
  billingNavAvailable: true,
  portfolioNavAvailable: false,
});
check(
  "operator preview uses identical visibility helper (same composition)",
  JSON.stringify(previewSame) === JSON.stringify(liveSame) &&
    isPortalNavVisibleForCesLaunch("analytics", otpOn) ===
      isPortalModuleVisible("analytics", { profile: otpOn }),
);

const accountA = stubProfile({
  source: "profile",
  enabledModules: ["website-review"],
  identity: {
    clientId: 9,
    clientName: "On Track Performance",
    clientSlug: "otp",
    logoUrl: null,
    logoAlt: "OTP",
    websiteUrl: null,
  },
});
const accountB = stubProfile({
  source: "fallback",
  enabledModules: [],
  identity: {
    clientId: 14,
    clientName: "OTP Carts",
    clientSlug: "otp-carts",
    logoUrl: null,
    logoAlt: "OTP Carts",
    websiteUrl: null,
  },
});
check(
  "multi-account re-resolves shell per active client",
  resolvePortalHomeShell(accountA) === "ces" &&
    resolvePortalHomeShell(accountB) === "hq",
);

const paused = computeEffectiveModules({
  planKey: "growth",
  planStatus: "paused",
  addOnModules: ["website-review", "morning-brief", "observer"],
  removedModules: [],
});
check("paused plan effective modules empty", paused.effectiveModules.length === 0);
check(
  "internal-only never effective even if add-on",
  !paused.effectiveModules.includes("morning-brief") &&
    isInternalOnlyEntitlement("observer"),
);

check(
  "internal-only keys are never portal-visible",
  !isPortalModuleVisible("observer", { profile: otpOn }) &&
    !isPortalModuleVisible("morning-brief", { profile: otpOn }) &&
    !isPortalModuleVisible("relationship-intelligence", { profile: otpOn }) &&
    !isPortalModuleVisible("csi", { profile: otpOn }),
);

check(
  "Batch G surfaces follow unified visibility",
  isBatchGClientHqSurfaceAvailable("reports", otpOn) === true &&
    isBatchGClientHqSurfaceAvailable("requests", otpOn) === false,
);

check(
  "billing remains eligibility-gated",
  isPortalModuleVisible("invoices", { profile: otpOff, billingNavAvailable: false }) ===
    false &&
    isPortalModuleVisible("invoices", { profile: otpOff, billingNavAvailable: true }) ===
      true,
);

check(
  "portfolio remains membership-gated",
  isPortalModuleVisible("portfolio", { profile: otpOff, portfolioNavAvailable: false }) ===
    false &&
    isPortalModuleVisible("portfolio", { profile: otpOff, portfolioNavAvailable: true }) ===
      true,
);

if (failed > 0) {
  console.error(`\nFAILED ${failed}  passed ${passed}`);
  process.exit(1);
}
console.log(`\nOK — ${passed} checks`);
assert.equal(failed, 0);
