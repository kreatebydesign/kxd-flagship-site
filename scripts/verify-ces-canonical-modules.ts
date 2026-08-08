/**
 * Phase 1 — Canonical CES/portal capability registry.
 * Pure. No database. No production writes.
 *
 * Run: npm run verify:ces-canonical-modules
 */

import assert from "node:assert/strict";
import {
  CANONICAL_CAPABILITY_REGISTRY,
  CES_EXPERIENCE_MODULE_IDS,
  CLIENT_HQ_PORTAL_MODULE_IDS,
  canonicalizeCapabilityKey,
  getCanonicalCapability,
  impliedPortalModulesFromReporting,
  isInternalOnlyCapability,
  isPortalModuleId,
  normalizeCesExperienceModuleList,
  normalizePortalModuleList,
  normalizeReportingCapabilityList,
} from "../lib/ces/modules/canonical.ts";
import { CES_MODULE_REGISTRY } from "../lib/ces/modules/registry.ts";
import {
  ENTITLEMENT_MODULE_REGISTRY,
  canonicalizeEntitlementModule,
  isInternalOnlyEntitlement,
  PORTAL_CES_ENTITLEMENT_KEYS,
} from "../lib/client-plans/modules.ts";
import { CLIENT_HQ_MODULES } from "../lib/portal/modules.ts";
import { PROVISIONING_MODULE_CATALOG } from "../lib/client-provisioning/modules/catalog.ts";
import { WORKSPACE_MODULE_REGISTRY } from "../lib/portal/workspace-personalization/modules.ts";

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

console.log("\nCES Phase 1 — canonical module registry\n");

const keys = CANONICAL_CAPABILITY_REGISTRY.map((d) => d.key);
check("canonical keys are unique", new Set(keys).size === keys.length);

check(
  "CES experience modules are portal + not internal",
  CES_EXPERIENCE_MODULE_IDS.every((id) => {
    const def = getCanonicalCapability(id);
    return def?.kind === "portal" && def.internalOnly === false && def.portal?.cesRegistry;
  }),
);

check(
  "executive-performance is a client-facing CES registry module",
  CES_MODULE_REGISTRY.some((m) => m.moduleId === "executive-performance") &&
    CES_MODULE_REGISTRY.find((m) => m.moduleId === "executive-performance")?.routes
      .landing === "/portal/partnership",
);

check(
  "visual-review aliases website-review",
  canonicalizeCapabilityKey("visual-review") === "website-review",
);
check(
  "public-showroom aliases inventory",
  canonicalizeCapabilityKey("public-showroom") === "inventory",
);
check(
  "partnership aliases executive-performance",
  canonicalizeCapabilityKey("partnership") === "executive-performance",
);

check(
  "reporting capabilities never marked portal kind",
  CANONICAL_CAPABILITY_REGISTRY.filter((d) => d.kind === "reporting").every(
    (d) => !d.portal && !d.internalOnly,
  ),
);

const forbidden = [
  "observer",
  "business-brain",
  "pulse",
  "executive-narrative",
  "rituals",
  "work-engine",
  "relationship-intelligence",
  "client-command",
  "csi",
  "morning-brief",
  "focus-mode",
];
check(
  "internal KXD systems are internal-only and not portal ids",
  forbidden.every(
    (key) => isInternalOnlyCapability(key) && !isPortalModuleId(key),
  ),
);

check(
  "normalize drops internal-only from portal lists",
  normalizePortalModuleList(["website-review", "observer", "morning-brief", "projects"])
    .join(",") === "website-review,projects",
);
check(
  "normalize CES list ignores HQ and reporting ids",
  normalizeCesExperienceModuleList([
    "website-review",
    "projects",
    "website-analytics",
    "observer",
  ]).join(",") === "website-review",
);
check(
  "normalize reporting ignores portal and internal",
  normalizeReportingCapabilityList([
    "seo",
    "website-review",
    "observer",
    "executive-reporting",
  ]).join(",") === "seo,executive-reporting",
);

check(
  "plans registry derives from canonical (same keys)",
  ENTITLEMENT_MODULE_REGISTRY.every((e) => canonicalizeCapabilityKey(e.key) === e.key) &&
    CANONICAL_CAPABILITY_REGISTRY.every((c) =>
      ENTITLEMENT_MODULE_REGISTRY.some((e) => e.key === c.key),
    ),
);

check(
  "PORTAL_CES_ENTITLEMENT_KEYS match CES experience ids",
  PORTAL_CES_ENTITLEMENT_KEYS.join(",") === CES_EXPERIENCE_MODULE_IDS.join(","),
);

check(
  "internal-only entitlements still denied",
  isInternalOnlyEntitlement("morning-brief") &&
    canonicalizeEntitlementModule("morning-brief") === "morning-brief",
);

check(
  "Client HQ module map derives from canonical HQ ids",
  CLIENT_HQ_PORTAL_MODULE_IDS.every((id) => CLIENT_HQ_MODULES[id]?.id === id),
);

check(
  "provisioning entitlement ids are known canonical keys or empty",
  PROVISIONING_MODULE_CATALOG.every((mod) =>
    mod.entitlementIds.every((id) => canonicalizeCapabilityKey(id) != null),
  ),
);

check(
  "workspace personalization hrefs stay on /portal",
  WORKSPACE_MODULE_REGISTRY.every((mod) => mod.href.startsWith("/portal")),
);

check(
  "seo implies analytics + website-health",
  impliedPortalModulesFromReporting(["seo"]).join(",") ===
    "analytics,website-health",
);

check(
  "brain alias does not become a portal module",
  canonicalizeCapabilityKey("brain") === "business-brain" &&
    !isPortalModuleId("brain"),
);

check(
  "Advisor is opt-in (stub fails closed until explicitly enabled)",
  getCanonicalCapability("advisor")?.portal?.activation === "opt-in" &&
    getCanonicalCapability("advisor")?.internalOnly === false,
);

if (failed > 0) {
  console.error(`\nFAILED ${failed}  passed ${passed}`);
  process.exit(1);
}
console.log(`\nOK — ${passed} checks`);
assert.equal(failed, 0);
