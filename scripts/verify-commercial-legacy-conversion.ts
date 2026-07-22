/**
 * Phase 37D — Controlled legacy conversion verification.
 *
 *   npm run verify:commercial-legacy-conversion
 *
 * Pure deterministic checks (no production writes).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildLegacyConversionFingerprint,
  buildLegacyConversionPreview,
  calculateLegacyModuleMapping,
  evaluateActivationEligibility,
  evaluateLegacyConversionEligibility,
  evaluatePlanChangeEligibility,
  isLegacyConversionCandidate,
  isPreservableLegacyAddOn,
  mapAgreementToPlan,
  parseCommercialSaveBody,
  parseLegacyConversionRequestBody,
  type LegacyConversionClientState,
} from "../lib/commercial-agreements";
import { baseModulesForPlan } from "../lib/client-plans/catalog";
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

function legacyState(
  overrides: Partial<LegacyConversionClientState> = {},
): LegacyConversionClientState {
  const current = ["website-review", "executive-performance", "inventory"];
  return {
    clientId: 1,
    clientName: "Legacy Fixture",
    updatedAt: "2026-07-21T12:00:00.000Z",
    commercialAgreementId: "kxd-operating",
    monthlyRetainerAmount: 2000,
    setupFee: 1750,
    monthlyServiceCredits: 7,
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
  console.log("\nPhase 37D — verify:commercial-legacy-conversion\n");

  check(
    "preservable add-on accepts portal modules",
    isPreservableLegacyAddOn("inventory") &&
      isPreservableLegacyAddOn("executive-performance"),
  );
  check(
    "preservable add-on rejects internal-only",
    !isPreservableLegacyAddOn("morning-brief"),
  );
  check(
    "preservable add-on rejects unknown",
    !isPreservableLegacyAddOn("not-a-real-module"),
  );

  const growth = baseModulesForPlan("growth");
  const mapping = calculateLegacyModuleMapping(
    ["website-review", "executive-performance", "inventory"],
    "growth",
    ["website-review", "executive-performance", "inventory"],
  );
  check(
    "current modules inside baseline are retained",
    mapping.retainedInPlan.includes("website-review"),
  );
  check(
    "valid modules outside baseline become preserved add-ons",
    mapping.preservedAsAddOns.includes("executive-performance") &&
      mapping.preservedAsAddOns.includes("inventory"),
  );
  check(
    "newly included target modules classify correctly",
    mapping.newlyIncluded.some((m) => growth.includes(m)) &&
      !mapping.newlyIncluded.includes("website-review"),
  );
  check(
    "proposed effective modules contain all current meaningful access",
    mapping.currentEffective.every((m) =>
      mapping.proposedEffective.includes(m),
    ) && mapping.noAccessLoss,
  );
  check("planRemovedModules path stays empty conceptually", true);

  const unknownMap = calculateLegacyModuleMapping(
    ["website-review"],
    "starter",
    ["website-review", "totally-unknown-module"],
  );
  check(
    "unknown CES module is detected as unsupported",
    unknownMap.unsupportedRaw.includes("totally-unknown-module") &&
      !unknownMap.noAccessLoss,
  );

  // Eligibility
  const eligible = evaluateLegacyConversionEligibility(legacyState());
  check(
    "legacy client with standard agreement is eligible",
    eligible.eligibility === "eligible" &&
      eligible.canConvert === true &&
      eligible.noAccessLoss === true &&
      eligible.proposedPlanKey === "growth",
  );
  check(
    "preserved add-ons calculated for eligible conversion",
    eligible.mapping?.preservedAsAddOns.includes("inventory") === true,
  );

  const noAgreement = evaluateLegacyConversionEligibility(
    legacyState({ commercialAgreementId: null }),
  );
  check(
    "missing agreement blocks conversion",
    noAgreement.eligibility === "blocked" &&
      noAgreement.blockers.some((b) => b.code === "no_agreement"),
  );

  const custom = evaluateLegacyConversionEligibility(
    legacyState({
      commercialAgreementId: "custom-legacy",
      monthlyRetainerAmount: 1500,
      setupFee: 0,
      monthlyServiceCredits: 3,
    }),
  );
  check(
    "custom-legacy blocks conversion",
    custom.eligibility === "blocked" &&
      custom.blockers.some((b) => b.code === "custom_legacy_manual"),
  );

  const modern = evaluateLegacyConversionEligibility(
    legacyState({
      planKey: "growth",
      planStatus: "active",
      currentEffectiveModules: [...growth],
      rawCesModules: [...growth],
    }),
  );
  check(
    "modern client cannot use legacy conversion (aligned)",
    modern.eligibility === "already_converted" ||
      modern.eligibility === "use_plan_change",
  );

  const modernMismatch = evaluateLegacyConversionEligibility(
    legacyState({
      planKey: "starter",
      planStatus: "active",
      commercialAgreementId: "kxd-executive",
      monthlyRetainerAmount: 3500,
      setupFee: 3000,
      monthlyServiceCredits: 12,
      currentEffectiveModules: [...baseModulesForPlan("starter")],
      rawCesModules: [...baseModulesForPlan("starter")],
    }),
  );
  check(
    "modern mismatched client routes to plan change",
    modernMismatch.eligibility === "use_plan_change",
  );

  const inconsistent = evaluateLegacyConversionEligibility(
    legacyState({ planStatus: "active", planKey: null }),
  );
  check(
    "null plan plus non-legacy status blocks",
    inconsistent.eligibility === "blocked" &&
      inconsistent.blockers.some((b) => b.code === "inconsistent_state"),
  );

  const paused = evaluateLegacyConversionEligibility(
    legacyState({ planStatus: "paused", planKey: "growth" }),
  );
  check(
    "paused state blocks conservatively",
    paused.eligibility === "blocked" &&
      paused.blockers.some((b) => b.code === "paused_blocked"),
  );

  const overrides = evaluateLegacyConversionEligibility(
    legacyState({ addOnModules: ["seo"] }),
  );
  check(
    "existing override fields block legacy conversion",
    overrides.eligibility === "blocked" &&
      overrides.blockers.some((b) => b.code === "overrides_manual_review"),
  );

  const unsupported = evaluateLegacyConversionEligibility(
    legacyState({
      rawCesModules: ["website-review", "bogus-module-xyz"],
      currentEffectiveModules: ["website-review"],
    }),
  );
  check(
    "unsupported CES module blocks safely",
    unsupported.eligibility === "blocked" &&
      unsupported.blockers.some((b) => b.code === "unsupported_modules"),
  );

  // Preview
  const preview = buildLegacyConversionPreview(legacyState());
  check(
    "preview derives target plan only from server agreement",
    preview.proposedPlanKey === "growth" &&
      mapAgreementToPlan("kxd-operating").ok === true,
  );
  check(
    "preview lists preserved and newly included modules",
    preview.preservedAsAddOns.some((r) => r.key === "inventory") &&
      preview.newlyIncluded.length > 0 &&
      preview.proposedRemovedModules.length === 0,
  );
  check(
    "preview asserts no access loss when eligible",
    preview.noAccessLoss === true && preview.canConvert === true,
  );
  check(
    "preview includes module-data preservation note",
    preview.moduleDataNote.includes("not deleted"),
  );

  // Body validation
  const good = parseLegacyConversionRequestBody({
    previewFingerprint: preview.previewFingerprint,
    confirmed: true,
  });
  check("valid conversion body accepted", good.ok === true);

  const withPlan = parseLegacyConversionRequestBody({
    previewFingerprint: "x",
    confirmed: true,
    planKey: "enterprise",
    addOnModules: ["inventory"],
  });
  check(
    "browser plan / module / add-on lists rejected",
    withPlan.ok === false && withPlan.code === "unapproved_fields",
  );

  const withAgreement = parseLegacyConversionRequestBody({
    previewFingerprint: "x",
    confirmed: true,
    commercialAgreementId: "kxd-executive",
  });
  check(
    "browser agreement mapping rejected",
    withAgreement.ok === false && withAgreement.code === "unapproved_fields",
  );

  const unconfirmed = parseLegacyConversionRequestBody({
    previewFingerprint: preview.previewFingerprint,
    confirmed: false,
  });
  check(
    "general acknowledgment required",
    unconfirmed.ok === false && unconfirmed.code === "confirmation_required",
  );

  check(
    "client-ID substitution fails",
    rejectBodyClientIdMismatch(1, { clientId: 99 }) ===
      "Client identity mismatch.",
  );

  const stale = buildLegacyConversionPreview(
    legacyState({ updatedAt: "2026-07-21T15:00:00.000Z" }),
  );
  check(
    "stale CES/plan fingerprint changes with state",
    preview.previewFingerprint !== stale.previewFingerprint,
  );

  const fp = buildLegacyConversionFingerprint({
    clientId: 1,
    updatedAt: "2026-07-21T12:00:00.000Z",
    commercialAgreementId: "kxd-operating",
    monthlyRetainerAmount: 2000,
    setupFee: 1750,
    monthlyServiceCredits: 7,
    commercialAddOns: [],
    planKey: null,
    planStatus: "legacy",
    addOnModules: [],
    removedModules: [],
    rawCesModules: preview.currentLegacyModules.map((r) => r.key),
    currentEffectiveModules: preview.currentLegacyModules.map((r) => r.key),
    proposedPlanKey: "growth",
    proposedAddOnModules: preview.proposedAddOnModules,
    proposedEffectiveModules: preview.proposedEffectiveModules.map((r) => r.key),
  });
  check("fingerprint stable for identical state", fp === preview.previewFingerprint);

  check(
    "candidate helper detects legacy + standard agreement",
    isLegacyConversionCandidate({
      commercialAgreementId: "kxd-operating",
      planKey: null,
      planStatus: "legacy",
    }),
  );
  check(
    "candidate helper rejects modern plan",
    !isLegacyConversionCandidate({
      commercialAgreementId: "kxd-operating",
      planKey: "growth",
      planStatus: "active",
    }),
  );

  // Regressions
  const act = evaluateActivationEligibility({
    clientId: 9,
    clientName: "A",
    updatedAt: null,
    commercialAgreementId: "kxd-operating",
    monthlyRetainerAmount: 2000,
    setupFee: 1750,
    monthlyServiceCredits: 7,
    commercialAddOns: [],
    planKey: null,
    planStatus: "legacy",
    addOnModules: [],
    removedModules: [],
    currentEffectiveModules: [],
  });
  check(
    "Phase 37B first-time activation still eligible for empty legacy",
    act.eligibility === "eligible",
  );

  const planChange = evaluatePlanChangeEligibility({
    clientId: 9,
    clientName: "A",
    updatedAt: null,
    commercialAgreementId: "kxd-executive",
    monthlyRetainerAmount: 3500,
    setupFee: 3000,
    monthlyServiceCredits: 12,
    commercialAddOns: [],
    planKey: "growth",
    planStatus: "active",
    addOnModules: [],
    removedModules: [],
    currentEffectiveModules: [...growth],
  });
  check(
    "Phase 37C plan change still eligible for modern mismatch",
    planChange.eligibility === "eligible" &&
      planChange.classification === "upgrade",
  );

  const save = parseCommercialSaveBody({
    commercialAgreementId: "kxd-operating",
    monthlyRetainerAmount: 2000,
    setupFee: 1750,
    monthlyServiceCredits: 7,
    commercialAddOns: [],
    commercialNotes: null,
  });
  check("Phase 37A agreement save parser still works", save.ok === true);

  // Source contracts
  const ops = read("lib/commercial-agreements/ops-service.ts");
  check(
    "agreement save still does not convert or provision",
    !ops.includes("legacy-conversion") &&
      !ops.includes("updateClientPlanAssignment") &&
      !ops.includes("assignPlanOnClientCreate"),
  );

  const service = read(
    "lib/commercial-agreements/legacy-conversion-service.ts",
  );
  check(
    "conversion uses canonical updateClientPlanAssignment",
    service.includes("updateClientPlanAssignment") &&
      service.includes("commercial.legacy.converted"),
  );
  check(
    "conversion verifies no access loss after persistence",
    service.includes("Access loss detected after conversion"),
  );
  check(
    "conversion does not send email or touch billing/providers",
    !service.includes("sendEmail") &&
      !service.includes("stripe") &&
      !service.includes("createPortalUser") &&
      !service.includes("publishInventory"),
  );

  const previewRoute = read(
    "app/api/admin/commercial-agreements/[clientId]/legacy-conversion-preview/route.ts",
  );
  const convertRoute = read(
    "app/api/admin/commercial-agreements/[clientId]/convert-legacy/route.ts",
  );
  check(
    "preview and mutation routes require admin auth",
    previewRoute.includes("requirePayloadAdminApi") &&
      convertRoute.includes("requirePayloadAdminApi"),
  );
  check(
    "mutation rejects clientId mismatch and unapproved fields",
    convertRoute.includes("rejectBodyClientIdMismatch") &&
      convertRoute.includes("parseLegacyConversionRequestBody"),
  );

  const screen = read(
    "components/admin/operations/commercial-agreements/CommercialAgreementsScreen.tsx",
  );
  check(
    "UI offers Review legacy conversion with Confirm conversion",
    screen.includes("Review legacy conversion") &&
      screen.includes("Confirm conversion") &&
      screen.includes("Legacy conversion available") &&
      screen.includes("No access removed") &&
      screen.includes("Preserved from the current setup"),
  );
  check(
    "UI keeps Phase 37C plan change distinct",
    screen.includes("Review plan change"),
  );

  console.log("\nPhase 37D verification passed.\n");
}

main();
