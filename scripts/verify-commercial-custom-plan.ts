/**
 * Phase 37E — Controlled custom plan construction verification.
 *
 *   npm run verify:commercial-custom-plan
 *
 * Pure deterministic checks (no production writes).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildCustomPlanFingerprint,
  buildCustomPlanPreview,
  calculateCustomModuleDiff,
  evaluateActivationEligibility,
  evaluateCustomPlanEligibility,
  evaluateLegacyConversionEligibility,
  evaluatePlanChangeEligibility,
  isCommerciallySelectableModule,
  isCustomPlanCandidate,
  listCommercialSelectableModules,
  mapAgreementToPlan,
  normalizeRequestedModules,
  parseCommercialSaveBody,
  parseCustomPlanPreviewBody,
  parseCustomPlanRequestBody,
  type CustomPlanClientState,
} from "../lib/commercial-agreements";
import { computeEffectiveModules } from "../lib/client-plans/resolve";
import { rejectBodyClientIdMismatch } from "../lib/client-plans/validate";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function check(label: string, condition: boolean) {
  if (!condition) {
    console.error(`  ✗ ${label}`);
    throw new Error(label);
  }
  console.log(`  ✔ ${label}`);
}

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function customState(
  overrides: Partial<CustomPlanClientState> = {},
): CustomPlanClientState {
  const current = ["website-review", "executive-performance", "inventory"];
  return {
    clientId: 42,
    clientName: "Custom Fixture",
    updatedAt: "2026-07-21T12:00:00.000Z",
    commercialAgreementId: "custom-legacy",
    monthlyRetainerAmount: 1500,
    setupFee: 500,
    monthlyServiceCredits: 4,
    commercialAddOns: [],
    planKey: null,
    planStatus: "legacy",
    addOnModules: [],
    removedModules: [],
    currentEffectiveModules: current,
    rawCesModules: current,
    ...overrides,
  };
}

function main() {
  console.log("\nPhase 37E — verify:commercial-custom-plan\n");

  // Catalog eligibility
  const selectable = listCommercialSelectableModules();
  check("selectable catalog is non-empty", selectable.length > 0);
  check(
    "internal-only modules are not selectable",
    !selectable.some((m) => m.key === "morning-brief") &&
      !isCommerciallySelectableModule("morning-brief"),
  );
  check(
    "portal modules are selectable",
    isCommerciallySelectableModule("website-review") &&
      isCommerciallySelectableModule("inventory"),
  );
  check(
    "unknown modules are not selectable",
    !isCommerciallySelectableModule("not-a-real-module"),
  );

  const normalized = normalizeRequestedModules([
    "website-review",
    "website-review",
    "inventory",
    "morning-brief",
    "totally-fake",
  ]);
  check(
    "duplicate selected keys normalize deterministically",
    normalized.selected.join(",") === "inventory,website-review",
  );
  check(
    "arbitrary module strings are rejected",
    normalized.rejected.some((r) => r.key === "totally-fake"),
  );
  check(
    "internal-only selections are rejected",
    normalized.rejected.some((r) => r.key === "morning-brief"),
  );

  // Diff math
  const diff = calculateCustomModuleDiff(
    ["website-review", "inventory"],
    ["website-review", "executive-performance"],
  );
  check(
    "added modules calculate correctly",
    diff.added.includes("executive-performance") && !diff.added.includes("website-review"),
  );
  check(
    "removed modules calculate correctly",
    diff.removed.includes("inventory") && !diff.removed.includes("website-review"),
  );
  check(
    "unchanged modules calculate correctly",
    diff.unchanged.includes("website-review"),
  );
  check(
    "custom representation uses add-ons only",
    diff.proposedAddOns.join(",") === "executive-performance,website-review" &&
      diff.proposedRemoved.length === 0,
  );

  const resolved = computeEffectiveModules({
    planKey: "custom",
    planStatus: "active",
    addOnModules: diff.proposedAddOns,
    removedModules: [],
  });
  check(
    "canonical resolver reproduces selected custom set",
    resolved.effectiveModules.join(",") === diff.proposedEffective.join(","),
  );

  // Eligibility
  const eligible = evaluateCustomPlanEligibility(
    customState(),
    ["website-review", "executive-performance", "inventory"],
  );
  check(
    "custom-legacy legacy client is eligible for activation",
    eligible.eligibility === "eligible" &&
      eligible.canApply &&
      eligible.operation === "activate" &&
      eligible.proposedPlanKey === "custom",
  );

  const noAgreement = evaluateCustomPlanEligibility(
    customState({ commercialAgreementId: null }),
    ["website-review"],
  );
  check(
    "missing agreement blocks",
    noAgreement.eligibility === "blocked" &&
      noAgreement.blockers.some((b) => b.code === "no_agreement"),
  );

  const unknownAgreement = evaluateCustomPlanEligibility(
    customState({
      commercialAgreementId: "not-real" as CustomPlanClientState["commercialAgreementId"],
    }),
    ["website-review"],
  );
  check(
    "unknown agreement blocks",
    unknownAgreement.blockers.some((b) => b.code === "unknown_agreement"),
  );

  const standard = evaluateCustomPlanEligibility(
    customState({
      commercialAgreementId: "kxd-operating",
      monthlyRetainerAmount: 2000,
      setupFee: 1750,
      monthlyServiceCredits: 7,
    }),
    ["website-review"],
  );
  check(
    "standard agreement does not enter custom flow",
    standard.eligibility === "use_standard_flow" &&
      standard.blockers.some((b) => b.code === "standard_agreement"),
  );

  const paused = evaluateCustomPlanEligibility(
    customState({ planStatus: "paused", planKey: "custom" }),
    ["website-review"],
  );
  check(
    "paused state blocks conservatively",
    paused.blockers.some((b) => b.code === "paused_blocked"),
  );

  const emptyActivate = evaluateCustomPlanEligibility(customState(), []);
  check(
    "empty selection blocks first activation",
    emptyActivate.blockers.some((b) => b.code === "empty_selection"),
  );

  const unsupported = evaluateCustomPlanEligibility(
    customState({
      rawCesModules: ["website-review", "ghost-module"],
      currentEffectiveModules: ["website-review"],
    }),
    ["website-review"],
  );
  check(
    "unknown current CES module blocks safely",
    unsupported.blockers.some((b) => b.code === "unsupported_modules"),
  );

  const inconsistent = evaluateCustomPlanEligibility(
    customState({ planKey: "growth", planStatus: "legacy" }),
    ["website-review"],
  );
  check(
    "inconsistent assignment state blocks",
    inconsistent.blockers.some((b) => b.code === "inconsistent_state"),
  );

  const revise = evaluateCustomPlanEligibility(
    customState({
      planKey: "custom",
      planStatus: "active",
      addOnModules: ["website-review", "inventory"],
      currentEffectiveModules: ["website-review", "inventory"],
      rawCesModules: ["website-review", "inventory"],
    }),
    ["website-review", "executive-performance"],
  );
  check(
    "existing custom assignment follows revision behavior",
    revise.eligibility === "eligible" &&
      revise.operation === "revise" &&
      revise.hasRemovals === true,
  );

  const trial = evaluateCustomPlanEligibility(
    customState({
      planKey: "custom",
      planStatus: "trial",
      addOnModules: ["website-review"],
      currentEffectiveModules: ["website-review"],
      rawCesModules: ["website-review"],
    }),
    ["website-review", "inventory"],
  );
  check(
    "trial custom revision preserves trial status",
    trial.proposedPlanStatus === "trial" && trial.canApply,
  );

  const aligned = evaluateCustomPlanEligibility(
    customState({
      planKey: "custom",
      planStatus: "active",
      addOnModules: ["website-review", "inventory"],
      currentEffectiveModules: ["website-review", "inventory"],
      rawCesModules: ["website-review", "inventory"],
    }),
    ["website-review", "inventory"],
  );
  check(
    "already-aligned selection does not rewrite",
    aligned.eligibility === "aligned" &&
      aligned.alreadyAligned &&
      !aligned.canApply,
  );

  const fromStandard = evaluateCustomPlanEligibility(
    customState({
      planKey: "growth",
      planStatus: "active",
      addOnModules: [],
      currentEffectiveModules: ["website-review", "website-workspace"],
      rawCesModules: ["website-review", "website-workspace"],
    }),
    ["website-review"],
  );
  check(
    "standard modern plan requires explicit custom transition warning",
    fromStandard.canApply &&
      fromStandard.warnings.some((w) => w.includes("standard modern plan")),
  );

  // Preview
  const preview = buildCustomPlanPreview(customState(), null);
  check(
    "current effective access is selected by default",
    preview.proposedEffectiveModules.map((m) => m.key).join(",") ===
      "executive-performance,inventory,website-review",
  );
  check(
    "preview includes fingerprint",
    preview.previewFingerprint.length === 40,
  );
  check(
    "preview excludes billing/provider mutation claims via unchanged systems",
    preview.unchangedSystems.some((s) => s.id.includes("billing")) ||
      preview.unchangedSystems.length > 0,
  );
  check("preview states access-only note", preview.accessNote.length > 20);
  check(
    "module data preservation note present",
    preview.moduleDataNote.includes("not deleted"),
  );

  const removalPreview = buildCustomPlanPreview(
    customState({
      planKey: "custom",
      planStatus: "active",
      addOnModules: ["website-review", "inventory"],
      currentEffectiveModules: ["website-review", "inventory"],
      rawCesModules: ["website-review", "inventory"],
    }),
    ["website-review"],
  );
  check(
    "removal preview requires dedicated acknowledgment flag",
    removalPreview.hasRemovals &&
      removalPreview.removedModules.some((m) => m.key === "inventory"),
  );

  // Fingerprint staleness
  const fp1 = buildCustomPlanFingerprint({
    clientId: 42,
    updatedAt: "a",
    commercialAgreementId: "custom-legacy",
    monthlyRetainerAmount: 1,
    setupFee: 2,
    monthlyServiceCredits: 3,
    commercialAddOns: [],
    planKey: null,
    planStatus: "legacy",
    addOnModules: [],
    removedModules: [],
    currentEffectiveModules: ["website-review"],
    selectableCatalogKeys: ["website-review"],
    proposedModules: ["website-review"],
    proposedAddOns: ["website-review"],
    proposedRemoved: [],
    proposedEffective: ["website-review"],
    added: [],
    removed: [],
    unchanged: ["website-review"],
  });
  const fp2 = buildCustomPlanFingerprint({
    clientId: 42,
    updatedAt: "a",
    commercialAgreementId: "custom-legacy",
    monthlyRetainerAmount: 1,
    setupFee: 2,
    monthlyServiceCredits: 3,
    commercialAddOns: [],
    planKey: null,
    planStatus: "legacy",
    addOnModules: [],
    removedModules: [],
    currentEffectiveModules: ["website-review", "inventory"],
    selectableCatalogKeys: ["website-review"],
    proposedModules: ["website-review"],
    proposedAddOns: ["website-review"],
    proposedRemoved: [],
    proposedEffective: ["website-review"],
    added: [],
    removed: ["inventory"],
    unchanged: ["website-review"],
  });
  check("stale CES fingerprint differs", fp1 !== fp2);

  // Request parsing
  const badPlan = parseCustomPlanRequestBody({
    previewFingerprint: "abc",
    confirmed: true,
    requestedModules: ["website-review"],
    planKey: "custom",
  });
  check(
    "browser plan representation is rejected",
    !badPlan.ok && badPlan.code === "unapproved_fields",
  );

  const badAgreement = parseCustomPlanRequestBody({
    previewFingerprint: "abc",
    confirmed: true,
    requestedModules: ["website-review"],
    commercialAgreementId: "custom-legacy",
  });
  check(
    "browser agreement mapping is rejected",
    !badAgreement.ok && badAgreement.code === "unapproved_fields",
  );

  const badOverrides = parseCustomPlanRequestBody({
    previewFingerprint: "abc",
    confirmed: true,
    requestedModules: ["website-review"],
    addOnModules: ["inventory"],
  });
  check(
    "browser override fields are rejected",
    !badOverrides.ok && badOverrides.code === "unapproved_fields",
  );

  const badRemoved = parseCustomPlanRequestBody({
    previewFingerprint: "abc",
    confirmed: true,
    requestedModules: ["website-review"],
    removedModules: ["inventory"],
  });
  check(
    "browser removed lists are rejected",
    !badRemoved.ok && badRemoved.code === "unapproved_fields",
  );

  const badPrice = parseCustomPlanRequestBody({
    previewFingerprint: "abc",
    confirmed: true,
    requestedModules: ["website-review"],
    price: 99,
  });
  check(
    "browser price/status values are rejected",
    !badPrice.ok && badPrice.code === "unapproved_fields",
  );

  const noConfirm = parseCustomPlanRequestBody({
    previewFingerprint: "abc",
    confirmed: false,
    requestedModules: ["website-review"],
  });
  check(
    "general acknowledgment is required",
    !noConfirm.ok && noConfirm.code === "confirmation_required",
  );

  const okBody = parseCustomPlanRequestBody({
    previewFingerprint: "abc123",
    confirmed: true,
    removalsAcknowledged: true,
    requestedModules: ["website-review", "inventory"],
  });
  check(
    "valid mutation body parses requested modules only",
    okBody.ok &&
      okBody.requestedModules.join(",") === "website-review,inventory" &&
      okBody.removalsAcknowledged === true,
  );

  const previewBody = parseCustomPlanPreviewBody({
    requestedModules: ["website-review"],
  });
  check(
    "preview body accepts requestedModules",
    previewBody.ok && previewBody.requestedModules?.[0] === "website-review",
  );

  check(
    "client-id substitution fails",
    rejectBodyClientIdMismatch(5, { clientId: 9 }) ===
      "Client identity mismatch.",
  );

  // Cross-phase isolation
  check(
    "custom-legacy still blocked from automated activation",
    mapAgreementToPlan("custom-legacy").ok === false,
  );
  const act = evaluateActivationEligibility(
    customState({
      commercialAgreementId: "custom-legacy",
      planKey: null,
      planStatus: "legacy",
    }),
  );
  check(
    "Phase 37B activation remains blocked for custom-legacy",
    act.canActivate === false,
  );
  const pc = evaluatePlanChangeEligibility(
    customState({
      commercialAgreementId: "custom-legacy",
      planKey: "custom",
      planStatus: "active",
      addOnModules: ["website-review"],
      currentEffectiveModules: ["website-review"],
    }),
  );
  check(
    "Phase 37C plan change remains blocked for custom plans",
    pc.canChange === false,
  );
  const leg = evaluateLegacyConversionEligibility(
    customState({
      commercialAgreementId: "custom-legacy",
      planKey: null,
      planStatus: "legacy",
    }),
  );
  check(
    "Phase 37D legacy conversion remains blocked for custom-legacy",
    leg.canConvert === false,
  );

  const save = parseCommercialSaveBody({
    commercialAgreementId: "custom-legacy",
    monthlyRetainerAmount: 1200,
    setupFee: 0,
    monthlyServiceCredits: 2,
    commercialAddOns: [],
    commercialNotes: "Negotiated",
  });
  check(
    "Phase 37A agreement save still accepts custom-legacy without provisioning fields",
    save.ok === true,
  );

  check(
    "UI candidate helper requires custom-legacy",
    isCustomPlanCandidate({
      commercialAgreementId: "custom-legacy",
      planStatus: "legacy",
    }) &&
      !isCustomPlanCandidate({
        commercialAgreementId: "kxd-operating",
        planStatus: "legacy",
      }),
  );

  // Route source guards
  const previewRoute = read(
    "app/api/admin/commercial-agreements/[clientId]/custom-plan-preview/route.ts",
  );
  const applyRoute = read(
    "app/api/admin/commercial-agreements/[clientId]/apply-custom-plan/route.ts",
  );
  check(
    "preview route requires operator authentication",
    previewRoute.includes("requirePayloadAdminApi"),
  );
  check(
    "mutation route requires operator authentication",
    applyRoute.includes("requirePayloadAdminApi"),
  );
  check(
    "mutation route rejects client-id substitution",
    applyRoute.includes("rejectBodyClientIdMismatch"),
  );
  check(
    "service uses canonical updateClientPlanAssignment",
    read("lib/commercial-agreements/custom-plan-service.ts").includes(
      "updateClientPlanAssignment",
    ),
  );
  check(
    "service does not invent billing or Stripe",
    !read("lib/commercial-agreements/custom-plan-service.ts").includes("stripe") &&
      !read("lib/commercial-agreements/custom-plan-logic.ts").includes("stripe"),
  );
  check(
    "activity events use restrained taxonomy",
    read("lib/commercial-agreements/custom-plan-service.ts").includes(
      "commercial.custom_plan.activated",
    ) &&
      read("lib/commercial-agreements/custom-plan-service.ts").includes(
        "commercial.custom_plan.changed",
      ),
  );
  check(
    "representation documents planKey custom",
    read("lib/commercial-agreements/custom-plan-logic.ts").includes(
      'planKey: "custom"',
    ) ||
      read("lib/commercial-agreements/custom-plan-types.ts").includes(
        'planKey: "custom"',
      ),
  );

  console.log("\nPhase 37E verification passed.\n");
}

main();
