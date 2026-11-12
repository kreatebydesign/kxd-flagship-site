/**
 * Primal per-member Reports access — Tyler denied, JB allowed.
 * Run: npx tsx scripts/verify-primal-member-reports-access.ts
 */

import assert from "node:assert/strict";
import { PRIMAL_EXPERIENCE_PROFILE } from "../lib/ces/profile/primal";
import { isPortalModuleVisible } from "../lib/ces/modules/visibility";
import type { ResolvedExperienceProfile } from "../lib/ces";
import { getEnabledPortalNavGroups } from "../lib/portal/nav";
import { isPortalReportsSurfaceAvailable } from "../lib/portal/requests-files-reports";
import { canPortalMemberAccessReports } from "../lib/portal/member-reports-access";

function check(label: string, condition: boolean) {
  assert.equal(condition, true, label);
  console.log(`  ✓ ${label}`);
}

function stubPrimalProfile(): ResolvedExperienceProfile {
  const p = PRIMAL_EXPERIENCE_PROFILE;
  return {
    source: "profile",
    profileId: 1,
    identity: {
      clientId: 1,
      clientName: "Primal Motorsports",
      clientSlug: "primal-motorsports",
      logoUrl: null,
      logoAlt: "Primal Motorsports",
      websiteUrl: "https://primalmotorsports.com",
    },
    visual: {
      primaryColor: p.primaryColor,
      secondaryColor: p.secondaryColor,
      accentColor: p.accentColor,
      surfaceTint: p.surfaceTint,
      borderRadiusPreset: p.borderRadiusPreset,
      motionPreset: p.motionPreset,
    },
    hospitality: {
      welcomeEyebrow: p.welcomeEyebrow,
      reassuranceLine: p.reassuranceLine,
      supportTone: p.supportTone,
      portalSidebarLabel: p.portalSidebarLabel,
      partnerFooterLine: p.partnerFooterLine,
      showPartnerMark: p.showKxdPartnerMark,
    },
    enabledModules: [...p.enabledModules],
    enabledPortalModules: [...p.enabledPortalModules],
    reportingCapabilities: [],
    presentation: null,
    terminology: { ...p.terminology },
    cssVars: {},
  };
}

const primalProfile = stubPrimalProfile();
const jb = "jb.layman@primalmotorsports.com";
const tyler = "tyler.edwards@primalmotorsports.com";

console.log("\nPrimal member Reports access\n");

check(
  "JB on allowlist",
  canPortalMemberAccessReports({
    clientSlug: "primal-motorsports",
    portalUserEmail: jb,
  }),
);
check(
  "Tyler not on allowlist",
  !canPortalMemberAccessReports({
    clientSlug: "primal-motorsports",
    portalUserEmail: tyler,
  }),
);
check(
  "JB sees reports module",
  isPortalModuleVisible("reports", {
    profile: primalProfile,
    portalMemberEmail: jb,
  }),
);
check(
  "Tyler does not see reports module",
  !isPortalModuleVisible("reports", {
    profile: primalProfile,
    portalMemberEmail: tyler,
  }),
);
check(
  "Tyler still sees analytics",
  isPortalModuleVisible("analytics", {
    profile: primalProfile,
    portalMemberEmail: tyler,
  }),
);

const jbNav = getEnabledPortalNavGroups(primalProfile, { portalMemberEmail: jb });
const tylerNav = getEnabledPortalNavGroups(primalProfile, { portalMemberEmail: tyler });
const navHasReports = (groups: ReturnType<typeof getEnabledPortalNavGroups>) =>
  groups.some((g) => g.items.some((i) => i.id === "reports"));

check("JB nav includes Reports", navHasReports(jbNav));
check("Tyler nav excludes Reports", !navHasReports(tylerNav));

check(
  "JB reports surface",
  isPortalReportsSurfaceAvailable(primalProfile, { email: jb, isOperatorPreview: false }),
);
check(
  "Tyler reports surface denied",
  !isPortalReportsSurfaceAvailable(primalProfile, { email: tyler, isOperatorPreview: false }),
);

console.log("\nAll checks passed.\n");
