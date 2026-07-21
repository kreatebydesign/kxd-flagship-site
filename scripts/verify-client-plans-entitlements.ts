/**
 * Phase 35A — Client Plans & Entitlements verification.
 * Pure resolver/catalog checks. No database. No Stripe.
 *
 * Run: npm run verify:client-plans
 */

import {
  baseModulesForPlan,
  CLIENT_PLAN_CATALOG,
  getClientPlanDefinition,
  isClientPlanKey,
} from "../lib/client-plans/catalog.ts";
import { derivePlanOverridesFromSelection } from "../lib/client-plans/derive.ts";
import {
  canonicalizeEntitlementModule,
  isInternalOnlyEntitlement,
  isKnownEntitlementModule,
  PORTAL_CES_ENTITLEMENT_KEYS,
  rejectUnknownModules,
} from "../lib/client-plans/modules.ts";
import {
  clientHasModule,
  computeEffectiveModules,
  resolveEntitlementsFromAssignment,
} from "../lib/client-plans/resolve.ts";
import {
  buildPlanAccessActivityChanges,
  parseRouteClientId,
  planUpdateErrorMessage,
  rejectBodyClientIdMismatch,
  rejectInvalidOverrideModules,
  shouldSyncCesEnabledModules,
} from "../lib/client-plans/validate.ts";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
}

console.log("\nPhase 35A — Client Plans & Entitlements\n");

console.log("Catalog");
assert(CLIENT_PLAN_CATALOG.length === 5, "five plans in catalog");
assert(
  CLIENT_PLAN_CATALOG.map((p) => p.key).join(",") ===
    "starter,growth,premium,enterprise,custom",
  "plans ordered starter → custom",
);
assert(isClientPlanKey("growth"), "growth is a plan key");
assert(!isClientPlanKey("pro"), "unknown plan key rejected");
assert(
  (getClientPlanDefinition("starter")?.includedModules ?? []).includes(
    "website-review",
  ),
  "starter includes website-review",
);
assert(
  (getClientPlanDefinition("growth")?.includedModules ?? []).includes(
    "website-workspace",
  ),
  "growth portal extension includes website-workspace",
);
assert(
  (getClientPlanDefinition("premium")?.includedModules ?? []).includes(
    "inventory",
  ),
  "premium portal extension includes inventory",
);
assert(
  (getClientPlanDefinition("custom")?.includedModules ?? []).length === 0,
  "custom has no universal base modules",
);

console.log("\nStandard plan inheritance");
{
  const result = computeEffectiveModules({
    planKey: "starter",
    planStatus: "active",
    addOnModules: [],
    removedModules: [],
  });
  assert(
    result.effectiveModules.includes("website-review"),
    "starter inherits website-review",
  );
  assert(!result.isLegacy, "starter assignment is not legacy");
  assert(
    !result.effectiveModules.includes("inventory"),
    "starter does not include inventory",
  );
}

console.log("\nAdd-on inclusion");
{
  const result = computeEffectiveModules({
    planKey: "starter",
    planStatus: "active",
    addOnModules: ["inventory", "seo"],
    removedModules: [],
  });
  assert(result.effectiveModules.includes("inventory"), "add-on inventory included");
  assert(result.effectiveModules.includes("seo"), "add-on seo included");
  assert(
    result.moduleSources.find((s) => s.module === "inventory")?.sources.includes(
      "add-on",
    ) === true,
    "inventory sourced as add-on",
  );
}

console.log("\nRemoved module exclusion");
{
  const base = baseModulesForPlan("growth");
  assert(base.includes("website-review"), "growth base has website-review");
  const result = computeEffectiveModules({
    planKey: "growth",
    planStatus: "active",
    addOnModules: ["website-review"],
    removedModules: ["website-review"],
  });
  assert(
    !result.effectiveModules.includes("website-review"),
    "removed wins over plan + add-on",
  );
}

console.log("\nOverride precedence");
{
  const result = computeEffectiveModules({
    planKey: "premium",
    planStatus: "active",
    addOnModules: ["gbp"],
    removedModules: ["executive-performance", "gbp"],
  });
  assert(
    !result.effectiveModules.includes("executive-performance"),
    "removed plan module excluded",
  );
  assert(!result.effectiveModules.includes("gbp"), "removed add-on excluded");
}

console.log("\nCustom plan behavior");
{
  const empty = computeEffectiveModules({
    planKey: "custom",
    planStatus: "active",
    addOnModules: [],
    removedModules: [],
  });
  assert(empty.effectiveModules.length === 0, "custom with no add-ons is empty");

  const withAddOns = computeEffectiveModules({
    planKey: "custom",
    planStatus: "active",
    addOnModules: ["website-review", "inventory"],
    removedModules: ["inventory"],
  });
  assert(
    withAddOns.effectiveModules.includes("website-review"),
    "custom add-on website-review kept",
  );
  assert(
    !withAddOns.effectiveModules.includes("inventory"),
    "custom removed add-on excluded",
  );
}

console.log("\nLegacy client fallback");
{
  const result = computeEffectiveModules({
    planKey: null,
    planStatus: "legacy",
    addOnModules: [],
    removedModules: [],
    legacyEnabledModules: ["website-review", "inventory", "seo"],
  });
  assert(result.isLegacy, "null plan is legacy");
  assert(
    result.effectiveModules.includes("website-review") &&
      result.effectiveModules.includes("inventory"),
    "legacy uses CES enabledModules",
  );

  const statusLegacy = computeEffectiveModules({
    planKey: "growth",
    planStatus: "legacy",
    addOnModules: [],
    removedModules: ["website-review"],
    legacyEnabledModules: ["website-review", "seo"],
  });
  assert(
    statusLegacy.isLegacy &&
      statusLegacy.effectiveModules.includes("website-review"),
    "planStatus=legacy prefers CES even with plan key set",
  );
}

console.log("\nPaused-plan behavior");
{
  const result = computeEffectiveModules({
    planKey: "premium",
    planStatus: "paused",
    addOnModules: ["inventory"],
    removedModules: [],
    legacyEnabledModules: ["website-review"],
  });
  assert(result.isPaused, "paused flag set");
  assert(result.effectiveModules.length === 0, "paused clears effective modules");
}

console.log("\nUnknown module rejection");
{
  assert(!isKnownEntitlementModule("not-a-real-module"), "unknown module rejected");
  assert(
    rejectUnknownModules(["website-review", "fake-mod"]).includes("fake-mod"),
    "rejectUnknownModules lists unknowns",
  );
  assert(
    canonicalizeEntitlementModule("visual-review") === "website-review",
    "visual-review alias canonicalizes",
  );
  assert(
    canonicalizeEntitlementModule("public-showroom") === "inventory",
    "public-showroom alias canonicalizes",
  );
}

console.log("\nClient isolation (pure resolve)");
{
  const a = resolveEntitlementsFromAssignment({
    clientId: 101,
    assignment: {
      planKey: "starter",
      planStatus: "active",
      planEffectiveAt: null,
      planNote: null,
      addOnModules: [],
      removedModules: [],
    },
  });
  const b = resolveEntitlementsFromAssignment({
    clientId: 202,
    assignment: {
      planKey: "enterprise",
      planStatus: "active",
      planEffectiveAt: null,
      planNote: null,
      addOnModules: ["inventory"],
      removedModules: [],
    },
  });
  assert(a.clientId === 101 && b.clientId === 202, "client IDs preserved");
  assert(
    !a.effectiveModules.includes("inventory") &&
      b.effectiveModules.includes("inventory"),
    "entitlements isolated per client assignment",
  );
  assert(
    !clientHasModule(a, "inventory") && clientHasModule(b, "inventory"),
    "clientHasModule respects assignment",
  );
}

console.log("\nPortal guard rejection for unentitled module");
{
  const entitlements = resolveEntitlementsFromAssignment({
    clientId: 7,
    assignment: {
      planKey: "starter",
      planStatus: "active",
      planEffectiveAt: null,
      planNote: null,
      addOnModules: [],
      removedModules: [],
    },
  });
  assert(
    !clientHasModule(entitlements, "website-workspace"),
    "starter denied website-workspace",
  );
  assert(
    !clientHasModule(entitlements, "executive-review"),
    "starter denied executive-review",
  );
  // Simulate CES profile gate: filter enabledModules by effective set
  const profileModules = ["website-review", "website-workspace", "inventory"];
  const allowed = new Set(entitlements.effectiveModules);
  const gated = profileModules.filter((m) => allowed.has(m));
  assert(
    gated.length === 1 && gated[0] === "website-review",
    "portal gate strips unentitled CES modules",
  );
}

console.log("\nNo internal-only module leakage");
{
  const result = computeEffectiveModules({
    planKey: "custom",
    planStatus: "active",
    addOnModules: [
      "website-review",
      "morning-brief",
      "focus-mode",
      "client-portal",
      "launch-wizard",
    ],
    removedModules: [],
  });
  assert(
    result.effectiveModules.includes("website-review"),
    "portal module remains effective",
  );
  assert(
    !result.effectiveModules.includes("morning-brief") &&
      !result.effectiveModules.includes("focus-mode") &&
      !result.effectiveModules.includes("client-portal") &&
      !result.effectiveModules.includes("launch-wizard"),
    "internal-only keys never become effective",
  );
  assert(isInternalOnlyEntitlement("morning-brief"), "morning-brief marked internal");
  assert(
    !PORTAL_CES_ENTITLEMENT_KEYS.includes("morning-brief"),
    "morning-brief not in portal CES keys",
  );
  assert(
    !clientHasModule(
      resolveEntitlementsFromAssignment({
        clientId: 1,
        assignment: {
          planKey: "custom",
          planStatus: "active",
          planEffectiveAt: null,
          planNote: "secret note",
          addOnModules: ["morning-brief"],
          removedModules: [],
        },
      }),
      "morning-brief",
    ),
    "clientHasModule denies internal-only even when listed as add-on",
  );
}

console.log("\nLaunch/provision override derivation");
{
  const growth = derivePlanOverridesFromSelection("growth", [
    "website-review",
    "seo",
    "website-analytics",
    "website-workspace",
    "inventory",
  ]);
  assert(growth?.planKey === "growth", "derive growth plan");
  assert(
    growth?.addOnModules.includes("inventory") === true,
    "inventory beyond growth base becomes add-on",
  );
  assert(
    growth?.removedModules.includes("website-review") !== true,
    "selected base modules not removed",
  );

  const custom = derivePlanOverridesFromSelection("custom", [
    "website-review",
    "inventory",
  ]);
  assert(
    Boolean(
      custom?.addOnModules.includes("website-review") &&
        custom?.addOnModules.includes("inventory") &&
        custom.removedModules.length === 0,
    ),
    "custom selection becomes add-ons only",
  );

  const trimmed = derivePlanOverridesFromSelection("starter", []);
  assert(
    trimmed?.removedModules.includes("website-review") === true,
    "deselecting starter base marks website-review removed",
  );
}

console.log("\nAudit gaps — isolation, stale CES, sync policy, notes");
{
  assert(parseRouteClientId("12") === 12, "route client id parses");
  assert(parseRouteClientId("0") == null, "client id 0 rejected");
  assert(parseRouteClientId("12abc") == null, "non-numeric client id rejected");
  assert(
    rejectBodyClientIdMismatch(12, { clientId: 99 }) ===
      "Client identity mismatch.",
    "route/body client mismatch rejected",
  );
  assert(
    rejectBodyClientIdMismatch(12, { planKey: "starter" }) == null,
    "body without clientId allowed",
  );
  assert(
    rejectBodyClientIdMismatch(12, { clientId: 12 }) == null,
    "matching body clientId allowed",
  );

  const invalid = rejectInvalidOverrideModules([
    "website-review",
    "morning-brief",
    "not-real",
  ]);
  assert(invalid.unknown.includes("not-real"), "unknown override rejected");
  assert(
    invalid.internalOnly.includes("morning-brief"),
    "internal-only override rejected for storage",
  );

  assert(
    shouldSyncCesEnabledModules({ isLegacy: true, isPaused: false }) === false,
    "legacy does not sync CES overwrite",
  );
  assert(
    shouldSyncCesEnabledModules({ isLegacy: false, isPaused: true }) === false,
    "paused does not wipe CES via sync",
  );
  assert(
    shouldSyncCesEnabledModules({ isLegacy: false, isPaused: false }) === true,
    "active explicit plan syncs CES",
  );

  const pausedCustom = computeEffectiveModules({
    planKey: "custom",
    planStatus: "paused",
    addOnModules: ["website-review", "inventory"],
    removedModules: [],
  });
  assert(
    pausedCustom.isPaused && pausedCustom.effectiveModules.length === 0,
    "paused custom has no effective modules",
  );

  const unassigned = computeEffectiveModules({
    planKey: null,
    planStatus: "active",
    addOnModules: [],
    removedModules: [],
    legacyEnabledModules: ["website-review", "inventory"],
  });
  assert(
    unassigned.isLegacy && unassigned.effectiveModules.includes("inventory"),
    "unassigned client falls back to CES modules",
  );

  const stale = resolveEntitlementsFromAssignment({
    clientId: 55,
    assignment: {
      planKey: "starter",
      planStatus: "active",
      planEffectiveAt: null,
      planNote: null,
      addOnModules: [],
      removedModules: [],
    },
    legacyEnabledModules: [
      "website-review",
      "website-workspace",
      "inventory",
      "executive-review",
    ],
  });
  assert(
    stale.effectiveModules.includes("website-review") &&
      !stale.effectiveModules.includes("inventory") &&
      !stale.effectiveModules.includes("website-workspace"),
    "explicit plan ignores stale CES modules",
  );
  const staleGate = ["website-review", "inventory", "executive-review"].filter(
    (m) => stale.effectiveModules.includes(m),
  );
  assert(
    staleGate.length === 1 && staleGate[0] === "website-review",
    "portal gate rejects stale CES on explicit plan",
  );

  const duplicates = computeEffectiveModules({
    planKey: "starter",
    planStatus: "active",
    addOnModules: ["seo", "seo", "visual-review"],
    removedModules: null as unknown as string[],
    legacyEnabledModules: null,
  });
  assert(
    duplicates.addOnModules.filter((m) => m === "seo").length === 1,
    "duplicate add-ons collapsed",
  );
  assert(
    duplicates.effectiveModules.includes("website-review"),
    "alias visual-review does not duplicate website-review oddly",
  );

  const emptyNull = computeEffectiveModules({
    planKey: "custom",
    planStatus: "active",
    addOnModules: [],
    removedModules: [],
    legacyEnabledModules: undefined,
  });
  assert(emptyNull.effectiveModules.length === 0, "empty/null arrays safe");

  const withNote = resolveEntitlementsFromAssignment({
    clientId: 9,
    assignment: {
      planKey: "growth",
      planStatus: "active",
      planEffectiveAt: null,
      planNote: "Internal billing caveat — never portal",
      addOnModules: ["inventory"],
      removedModules: [],
    },
  });
  assert(
    withNote.planNote?.includes("Internal billing") === true,
    "resolver retains plan note for admin",
  );
  const activity = buildPlanAccessActivityChanges(
    {
      planKey: "starter",
      planStatus: "active",
      addOnModules: ["seo"],
      removedModules: ["inventory"],
    },
    {
      planKey: "growth",
      planStatus: "trial",
      addOnModules: ["inventory"],
      removedModules: [],
    },
  );
  assert(activity.some((c) => c.startsWith("Plan ")), "activity records plan change");
  assert(activity.some((c) => c.startsWith("Status ")), "activity records status change");
  assert(
    activity.some((c) => c.includes("Add-ons enabled")),
    "activity records add-on enable",
  );
  assert(
    activity.some((c) => c.includes("Add-ons disabled")),
    "activity records add-on disable",
  );
  assert(
    activity.some((c) => c.includes("Modules restored")),
    "activity records module restore",
  );
  assert(
    !JSON.stringify(activity).includes("Internal billing"),
    "activity changes never include plan note",
  );

  const noop = buildPlanAccessActivityChanges(
    {
      planKey: "growth",
      planStatus: "active",
      addOnModules: ["seo"],
      removedModules: [],
    },
    {
      planKey: "growth",
      planStatus: "active",
      addOnModules: ["seo"],
      removedModules: [],
    },
  );
  assert(noop.length === 0, "identical save produces no activity noise");

  assert(
    planUpdateErrorMessage(new Error("relation clients does not exist")) ===
      "Unable to update plan.",
    "DB errors do not leak to clients",
  );
  assert(
    planUpdateErrorMessage(
      new Error("Internal-only module(s) cannot be assigned as client overrides: morning-brief"),
    ).startsWith("Internal-only module"),
    "validation errors remain operator-visible",
  );
}

console.log(
  `\nResult: ${passed} passed, ${failed} failed${failed ? "" : " — Phase 35A entitlements OK"}\n`,
);
process.exit(failed > 0 ? 1 : 0);
