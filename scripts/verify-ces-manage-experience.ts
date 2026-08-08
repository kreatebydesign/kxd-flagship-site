/**
 * Phase 3 — Manage Client Experience.
 * Pure composition fixtures + source contracts. No database. No OTP/Don writes.
 *
 * Run: npm run verify:ces-manage-experience
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { PRIMAL_EXPERIENCE_PROFILE } from "../lib/ces/profile/primal.ts";
import { isInternalOnlyCapability } from "../lib/ces/modules/canonical.ts";
import {
  composeOperatorExperienceProfile,
  composeOperatorHomeShell,
  composeOperatorModuleRows,
  composeOperatorNavPreview,
  sanitizeSelectedPortalModules,
} from "../lib/client-command/experience/compose.ts";
import {
  isOperatorToggleablePortalModule,
  listOperatorPortalModuleIds,
  operatorModuleKind,
} from "../lib/client-command/experience/module-catalog.ts";
import { composeOperatorExperienceWarnings } from "../lib/client-command/experience/warnings.ts";
import type { ExperienceComposeInput } from "../lib/client-command/experience/compose.ts";

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

function baseInput(
  partial: Partial<ExperienceComposeInput> &
    Pick<ExperienceComposeInput, "clientId" | "clientName" | "clientSlug" | "profileStatus">,
): ExperienceComposeInput {
  return {
    selectedPortalModules: [],
    reportingCapabilities: [],
    entitlements: { isLegacy: true, isPaused: false, effectiveModules: [] },
    billingNavAvailable: false,
    portfolioNavAvailable: false,
    ...partial,
  };
}

console.log("\nCES Phase 3 — Manage Client Experience\n");

const tabs = read("lib/client-command/tabs.ts");
const panel = read("components/admin/operations/client-command/ClientExperiencePanel.tsx");
const route = read("app/api/admin/clients/[clientId]/experience/route.ts");
const save = read("lib/client-command/experience/save.ts");
const load = read("lib/client-command/experience/load.ts");
const workspace = read("components/admin/operations/client-command/CommandWorkspaceTabPanel.tsx");
const actions = read("lib/client-command/workspace-actions.ts");

const composerUi = read(
  "components/admin/operations/client-command/ClientExperienceComposer.tsx",
);
const servicesRoute = read("app/api/admin/clients/[clientId]/experience/services/route.ts");
check(
  "Composer commercial review wraps discovery in Advanced Configuration",
  composerUi.includes("Active services") &&
    composerUi.includes("Advanced Configuration") &&
    composerUi.includes("/experience/services") &&
    composerUi.includes("Manage Experience"),
);
check(
  "Service assignment API is studio-gated and never activates CES",
  servicesRoute.includes("isStudioPayloadOperator") &&
    servicesRoute.includes("mutatesProfile: false") &&
    servicesRoute.includes("invites: false") &&
    !servicesRoute.includes("activateRecommendedExperience"),
);
check(
  "Experience tab registered in Client Command",
  tabs.includes('{ id: "experience", label: "Experience" }'),
);
check(
  "Workspace panel mounts ClientExperiencePanel",
  workspace.includes("ClientExperiencePanel") && workspace.includes('case "experience"'),
);
check(
  "Quick action Manage Client Experience present",
  actions.includes('id: "manage-client-experience"') &&
    actions.includes("tab=experience"),
);
check(
  "API is studio-operator gated",
  route.includes("isStudioPayloadOperator") &&
    route.includes("requirePayloadAdminApi") &&
    route.includes("Restricted staff cannot manage"),
);
check(
  "Save rejects advisor and internal-only",
  save.includes('raw === "advisor"') && save.includes("isInternalOnlyCapability"),
);
check(
  "Save does not send invitations",
  !save.includes("createPortalInvitation") && !panel.includes("send invite"),
);
check(
  "Preview reuses PortalPreviewQuickAction",
  panel.includes("PortalPreviewQuickAction") &&
    panel.includes('label="Preview Portal"'),
);
check(
  "Manage Portal Access links existing surface",
  panel.includes("Manage Portal Access") &&
    load.includes("/admin/operations/portal-access?client="),
);
check(
  "Loader uses reporting connection + billing eligibility + memberships",
  load.includes("loadClientReportingConnection") &&
    load.includes("isPortalBillingNavEligible") &&
    load.includes("MEMBERSHIP_COLLECTION") &&
    load.includes("listPortalInvitations"),
);

const primal = baseInput({
  clientId: 1,
  clientName: "Primal Motorsports",
  clientSlug: "primal-motorsports",
  profileStatus: "active",
  selectedPortalModules: [...PRIMAL_EXPERIENCE_PROFILE.enabledModules],
  entitlements: {
    isLegacy: true,
    isPaused: false,
    effectiveModules: [...PRIMAL_EXPERIENCE_PROFILE.enabledModules],
  },
});
const primalRows = composeOperatorModuleRows(primal);
const primalNav = composeOperatorNavPreview(primal).flatMap((g) =>
  g.items.map((i) => i.id),
);
check("Primal uses CES shell", composeOperatorHomeShell(primal) === "ces");
check(
  "Primal CES modules visible",
  ["website-review", "website-workspace", "inventory", "executive-review"].every(
    (id) => primalRows.find((r) => r.id === id)?.effective === "visible",
  ),
);
check(
  "Primal HQ stay hidden without explicit allowlist",
  ["projects", "analytics", "reports", "resources", "team", "advisor"].every(
    (id) => {
      const row = primalRows.find((r) => r.id === id);
      return row?.effective === "hidden" || row?.effective === "not-available";
    },
  ),
);
check("Primal nav omits advisor", !primalNav.includes("advisor"));
check(
  "Primal nav includes Website Review + Inventory",
  primalNav.includes("website-review") && primalNav.includes("inventory"),
);

const genericHq = baseInput({
  clientId: 20,
  clientName: "Generic HQ Client",
  clientSlug: "generic-hq",
  profileStatus: "none",
  selectedPortalModules: [],
});
const genericRows = composeOperatorModuleRows(genericHq);
check("Generic HQ uses HQ shell", composeOperatorHomeShell(genericHq) === "hq");
check(
  "Generic HQ defaults show projects/analytics",
  genericRows.find((r) => r.id === "projects")?.effective === "visible" &&
    genericRows.find((r) => r.id === "analytics")?.effective === "visible",
);
check(
  "Generic HQ Advisor is not available",
  genericRows.find((r) => r.id === "advisor")?.effective === "not-available",
);

const otpHypothetical = baseInput({
  clientId: 14,
  clientName: "OTP Carts",
  clientSlug: "otp-carts",
  profileStatus: "active",
  selectedPortalModules: [
    "website-review",
    "website-health",
    "analytics",
    "reports",
    "projects",
    "requests",
    "deliverables",
    "executive-review",
  ],
  reportingCapabilities: ["seo", "website-analytics", "executive-reporting"],
  entitlements: {
    isLegacy: true,
    isPaused: false,
    effectiveModules: ["website-review", "seo", "website-analytics"],
  },
  billingNavAvailable: false,
});
const otpRows = composeOperatorModuleRows(otpHypothetical);
const otpNav = composeOperatorNavPreview(otpHypothetical).flatMap((g) =>
  g.items.map((i) => i.id),
);
check("OTP hypothetical uses CES shell", composeOperatorHomeShell(otpHypothetical) === "ces");
check(
  "OTP hypothetical shows WR + health + analytics + reports + projects + requests + deliverables + executive review",
  [
    "website-review",
    "website-health",
    "analytics",
    "reports",
    "projects",
    "requests",
    "deliverables",
    "executive-review",
  ].every(
    (id) => otpRows.find((r) => r.id === id)?.effective === "visible" && otpNav.includes(id),
  ),
);
check("OTP hypothetical billing hidden without mapping", !otpNav.includes("invoices"));
check("OTP hypothetical advisor stays not-available", otpRows.find((r) => r.id === "advisor")?.effective === "not-available");
check("OTP hypothetical inventory stays hidden unless enabled", otpRows.find((r) => r.id === "inventory")?.effective === "hidden");

const ineligible = baseInput({
  clientId: 8,
  clientName: "Starter Client",
  clientSlug: "starter",
  profileStatus: "active",
  selectedPortalModules: ["website-review", "website-workspace"],
  entitlements: {
    isLegacy: false,
    isPaused: false,
    effectiveModules: ["website-review"],
  },
});
check(
  "Ineligible CES module is ineligible",
  composeOperatorModuleRows(ineligible).find((r) => r.id === "website-workspace")
    ?.effective === "ineligible",
);

check(
  "sanitize drops internal-only and advisor",
  sanitizeSelectedPortalModules([
    "website-review",
    "observer",
    "advisor",
    "projects",
    "morning-brief",
  ]).join(",") === "website-review,projects",
);
check("observer remains internal-only", isInternalOnlyCapability("observer"));

const reportingWarn = composeOperatorExperienceWarnings({
  hasLogo: true,
  profileStatus: "active",
  selectedPortalModules: ["analytics"],
  welcomeEyebrow: "Welcome",
  reassuranceLine: "Steady.",
  accentColor: "#111111",
  hasPortalMembership: true,
  inventoryRecordCount: 0,
  integrations: [
    {
      id: "ga4",
      label: "GA4",
      status: "entitled-unconfigured",
      detail: "none",
      href: null,
    },
  ],
});
check(
  "Reporting without connection warns",
  reportingWarn.some((w) => w.id === "reporting-without-connection"),
);

const noMembership = composeOperatorExperienceWarnings({
  hasLogo: false,
  profileStatus: "none",
  selectedPortalModules: [],
  welcomeEyebrow: "",
  reassuranceLine: "",
  accentColor: "",
  hasPortalMembership: false,
  inventoryRecordCount: 0,
  integrations: [],
});
check(
  "No membership + no profile + no logo warn",
  noMembership.some((w) => w.id === "no-portal-membership") &&
    noMembership.some((w) => w.id === "no-active-profile") &&
    noMembership.some((w) => w.id === "no-logo"),
);

const multiAccount = baseInput({
  clientId: 9,
  clientName: "Multi Account Client",
  clientSlug: "multi-account",
  profileStatus: "none",
  portfolioNavAvailable: true,
});
const multiRows = composeOperatorModuleRows(multiAccount);
const multiNav = composeOperatorNavPreview(multiAccount).flatMap((g) =>
  g.items.map((i) => i.id),
);
check(
  "Multi-membership shows portfolio as gated visible",
  operatorModuleKind("portfolio") === "gated" &&
    multiRows.find((r) => r.id === "portfolio")?.effective === "visible" &&
    multiNav.includes("portfolio") &&
    !isOperatorToggleablePortalModule("portfolio"),
);

const noMembershipRows = composeOperatorModuleRows(
  baseInput({
    clientId: 11,
    clientName: "No Membership Client",
    clientSlug: "no-membership",
    profileStatus: "none",
  }),
);
check(
  "No-membership client still composes HQ overview/settings",
  noMembershipRows.find((r) => r.id === "overview")?.effective === "visible" &&
    noMembershipRows.find((r) => r.id === "settings")?.effective === "visible" &&
    !composeOperatorNavPreview(
      baseInput({
        clientId: 11,
        clientName: "No Membership Client",
        clientSlug: "no-membership",
        profileStatus: "none",
      }),
    )
      .flatMap((g) => g.items.map((i) => i.id))
      .includes("portfolio"),
);

check(
  "Operator catalog excludes internal-only capabilities",
  !listOperatorPortalModuleIds().some((id) => isInternalOnlyCapability(id)),
);
check(
  "Advisor is listed as locked, not toggleable",
  listOperatorPortalModuleIds().includes("advisor") &&
    operatorModuleKind("advisor") === "locked" &&
    !isOperatorToggleablePortalModule("advisor"),
);

const leakedInternal = composeOperatorExperienceProfile(
  baseInput({
    clientId: 12,
    clientName: "Leak Test",
    clientSlug: "leak",
    profileStatus: "active",
    selectedPortalModules: ["website-review", "observer", "advisor", "csi", "work-engine"],
  }),
);
const leakedPortal = leakedInternal.enabledPortalModules ?? [];
check(
  "Compose strips internal-only + advisor even if accidentally present",
  leakedPortal.includes("website-review") &&
    !leakedPortal.includes("advisor") &&
    !(leakedInternal.enabledModules as readonly string[]).includes("observer"),
);

const profile = composeOperatorExperienceProfile(primal);
check(
  "Compose uses same source=profile for active CES",
  profile.source === "profile" && profile.identity.clientId === 1,
);
check(
  "Internal keys never selected",
  !sanitizeSelectedPortalModules(["relationship-intelligence", "csi", "work-engine"]).length,
);

if (failed > 0) {
  console.error(`\nFAILED ${failed}  passed ${passed}`);
  process.exit(1);
}
console.log(`\nOK — ${passed} checks`);
assert.equal(failed, 0);
