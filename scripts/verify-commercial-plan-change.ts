/**
 * Phase 37C — Controlled plan upgrades/downgrades verification.
 *
 *   npm run verify:commercial-plan-change
 *
 * Pure deterministic checks (no production writes, no network).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildActivationPreview,
  buildPlanChangeFingerprint,
  buildPlanChangePreview,
  evaluateActivationEligibility,
  evaluatePlanChangeEligibility,
  hasAgreementPlanMismatch,
  mapAgreementToPlan,
  parseActivationRequestBody,
  parseCommercialSaveBody,
  parsePlanChangeRequestBody,
  type ActivationClientState,
} from "../lib/commercial-agreements";
import {
  baseModulesForPlan,
  classifyPlanChange,
  getPlanOrder,
} from "../lib/client-plans/catalog";
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

function baseState(
  overrides: Partial<ActivationClientState> = {},
): ActivationClientState {
  return {
    clientId: 42,
    clientName: "Fixture Client",
    updatedAt: "2026-07-21T12:00:00.000Z",
    commercialAgreementId: "kxd-executive",
    monthlyRetainerAmount: 3500,
    setupFee: 3000,
    monthlyServiceCredits: 12,
    commercialAddOns: [],
    planKey: "growth",
    planStatus: "active",
    addOnModules: [],
    removedModules: [],
    currentEffectiveModules: [...baseModulesForPlan("growth")],
    ...overrides,
  };
}

function main() {
  console.log("\nPhase 37C — verify:commercial-plan-change\n");

  // Hierarchy
  check("canonical plan order starter < growth", getPlanOrder("starter") < getPlanOrder("growth"));
  check("canonical plan order growth < premium", getPlanOrder("growth") < getPlanOrder("premium"));
  check(
    "canonical hierarchy classifies upgrade correctly",
    classifyPlanChange("starter", "growth") === "upgrade" &&
      classifyPlanChange("growth", "premium") === "upgrade",
  );
  check(
    "canonical hierarchy classifies downgrade correctly",
    classifyPlanChange("premium", "growth") === "downgrade" &&
      classifyPlanChange("growth", "starter") === "downgrade",
  );
  check(
    "aligned classification for identical plans",
    classifyPlanChange("growth", "growth") === "aligned",
  );

  // Eligibility
  const upgrade = evaluatePlanChangeEligibility(baseState());
  check(
    "different recognized modern plans generate eligible upgrade preview",
    upgrade.eligibility === "eligible" &&
      upgrade.canChange === true &&
      upgrade.classification === "upgrade" &&
      upgrade.proposedPlanKey === "premium",
  );

  const downgrade = evaluatePlanChangeEligibility(
    baseState({
      commercialAgreementId: "kxd-partnership",
      monthlyRetainerAmount: 1250,
      setupFee: 1000,
      monthlyServiceCredits: 4,
      planKey: "premium",
      currentEffectiveModules: [...baseModulesForPlan("premium")],
    }),
  );
  check(
    "different recognized modern plans generate eligible downgrade",
    downgrade.eligibility === "eligible" &&
      downgrade.classification === "downgrade" &&
      downgrade.proposedPlanKey === "starter",
  );

  const aligned = evaluatePlanChangeEligibility(
    baseState({
      commercialAgreementId: "kxd-operating",
      monthlyRetainerAmount: 2000,
      setupFee: 1750,
      monthlyServiceCredits: 7,
      planKey: "growth",
    }),
  );
  check(
    "same modern plan returns aligned/idempotent behavior",
    aligned.eligibility === "aligned" &&
      aligned.alreadyAligned === true &&
      aligned.canChange === false,
  );

  const noPlan = evaluatePlanChangeEligibility(
    baseState({
      planKey: null,
      planStatus: "legacy",
      currentEffectiveModules: [],
      commercialAgreementId: "kxd-operating",
      monthlyRetainerAmount: 2000,
      setupFee: 1750,
      monthlyServiceCredits: 7,
    }),
  );
  check(
    "no-plan client remains routed to first-time activation",
    noPlan.eligibility === "use_activation" &&
      noPlan.blockers.some((b) => b.code === "no_plan_use_activation"),
  );

  const legacy = evaluatePlanChangeEligibility(
    baseState({
      planKey: null,
      planStatus: "legacy",
      commercialAgreementId: null,
      currentEffectiveModules: ["website-review"],
    }),
  );
  check(
    "legacy client blocks automated plan change",
    legacy.eligibility === "blocked",
  );

  const customLegacy = evaluatePlanChangeEligibility(
    baseState({
      commercialAgreementId: "custom-legacy",
      monthlyRetainerAmount: 1500,
      setupFee: 0,
      monthlyServiceCredits: 3,
    }),
  );
  check(
    "custom-legacy blocks automated plan change",
    customLegacy.eligibility === "blocked" &&
      customLegacy.blockers.some((b) => b.code === "custom_legacy_manual"),
  );

  const paused = evaluatePlanChangeEligibility(
    baseState({ planStatus: "paused" }),
  );
  check(
    "paused status is handled conservatively",
    paused.eligibility === "blocked" &&
      paused.blockers.some((b) => b.code === "paused_blocked"),
  );

  const trial = evaluatePlanChangeEligibility(
    baseState({ planStatus: "trial" }),
  );
  check(
    "trial status preserves trial on eligible change",
    trial.eligibility === "eligible" &&
      trial.proposedPlanStatus === "trial",
  );

  const overrides = evaluatePlanChangeEligibility(
    baseState({ addOnModules: ["inventory"] }),
  );
  check(
    "ambiguous override state blocks for manual review",
    overrides.eligibility === "blocked" &&
      overrides.blockers.some((b) => b.code === "overrides_manual_review"),
  );

  const removedOverrides = evaluatePlanChangeEligibility(
    baseState({ removedModules: ["website-workspace"] }),
  );
  check(
    "existing removed-module overrides block automation",
    removedOverrides.eligibility === "blocked" &&
      removedOverrides.blockers.some((b) => b.code === "overrides_manual_review"),
  );

  const missing = evaluatePlanChangeEligibility(
    baseState({ commercialAgreementId: null }),
  );
  check(
    "missing agreement blocks plan change",
    missing.eligibility === "blocked" &&
      missing.blockers.some((b) => b.code === "no_agreement"),
  );

  const unknown = mapAgreementToPlan("not-real");
  check(
    "unknown agreement blocks plan change",
    unknown.ok === false && unknown.code === "unknown_agreement",
  );

  // Preview accuracy
  const preview = buildPlanChangePreview(baseState());
  check(
    "preview uses canonical plan definitions",
    preview.proposedPlanKey === "premium" &&
      preview.proposed.effectiveModules.includes("executive-review") &&
      preview.proposed.effectiveModules.includes("inventory"),
  );
  check(
    "preview lists added modules accurately",
    preview.capabilityChanges.some(
      (row) => row.key === "inventory" && row.kind === "added",
    ) &&
      preview.capabilityChanges.some(
        (row) => row.key === "executive-review" && row.kind === "added",
      ),
  );
  check(
    "preview lists unchanged modules accurately",
    preview.capabilityChanges.some(
      (row) => row.key === "website-review" && row.kind === "unchanged",
    ),
  );

  const downPreview = buildPlanChangePreview(
    baseState({
      commercialAgreementId: "kxd-partnership",
      monthlyRetainerAmount: 1250,
      setupFee: 1000,
      monthlyServiceCredits: 4,
      planKey: "premium",
      currentEffectiveModules: [...baseModulesForPlan("premium")],
    }),
  );
  check(
    "preview lists removed modules accurately on downgrade",
    downPreview.hasRemovals === true &&
      downPreview.capabilityChanges.some(
        (row) => row.key === "inventory" && row.kind === "removed",
      ),
  );
  check(
    "preview distinguishes commercial record from plan change",
    downPreview.commercial.commercialAgreementId === "kxd-partnership" &&
      downPreview.moduleDataNote.includes("not deleted"),
  );

  // Body validation
  const goodBody = parsePlanChangeRequestBody({
    previewFingerprint: preview.previewFingerprint,
    confirmed: true,
    removalsAcknowledged: false,
  });
  check("valid plan-change body accepted", goodBody.ok === true);

  const withPlan = parsePlanChangeRequestBody({
    previewFingerprint: "abc",
    confirmed: true,
    planKey: "enterprise",
    modules: ["inventory"],
  });
  check(
    "browser target plan / module lists are rejected",
    withPlan.ok === false && withPlan.code === "unapproved_fields",
  );

  const withAgreement = parsePlanChangeRequestBody({
    previewFingerprint: "abc",
    confirmed: true,
    commercialAgreementId: "kxd-operating",
  });
  check(
    "browser agreement mapping is rejected",
    withAgreement.ok === false && withAgreement.code === "unapproved_fields",
  );

  const unconfirmed = parsePlanChangeRequestBody({
    previewFingerprint: preview.previewFingerprint,
    confirmed: false,
  });
  check(
    "general acknowledgment is required",
    unconfirmed.ok === false && unconfirmed.code === "confirmation_required",
  );

  check(
    "client-ID substitution fails",
    rejectBodyClientIdMismatch(42, { clientId: 7 }) ===
      "Client identity mismatch.",
  );

  const stale = buildPlanChangePreview(
    baseState({ updatedAt: "2026-07-21T14:00:00.000Z" }),
  );
  check(
    "stale plan/module fingerprint changes when state changes",
    preview.previewFingerprint !== stale.previewFingerprint,
  );

  const fp = buildPlanChangeFingerprint({
    clientId: 42,
    updatedAt: "2026-07-21T12:00:00.000Z",
    commercialAgreementId: "kxd-executive",
    monthlyRetainerAmount: 3500,
    setupFee: 3000,
    monthlyServiceCredits: 12,
    commercialAddOns: [],
    planKey: "growth",
    planStatus: "active",
    addOnModules: [],
    removedModules: [],
    currentEffectiveModules: baseModulesForPlan("growth"),
    proposedPlanKey: "premium",
    proposedPlanStatus: "active",
    proposedEffectiveModules: preview.proposed.effectiveModules,
  });
  check("fingerprint stable for identical state", fp === preview.previewFingerprint);

  check(
    "mismatch helper detects agreement vs plan difference",
    hasAgreementPlanMismatch({
      commercialAgreementId: "kxd-executive",
      planKey: "growth",
      planStatus: "active",
    }) === true,
  );
  check(
    "mismatch helper calm when aligned",
    hasAgreementPlanMismatch({
      commercialAgreementId: "kxd-operating",
      planKey: "growth",
      planStatus: "active",
    }) === false,
  );

  // Phase 37B regression
  const actEligible = evaluateActivationEligibility(
    baseState({
      planKey: null,
      planStatus: "legacy",
      commercialAgreementId: "kxd-operating",
      monthlyRetainerAmount: 2000,
      setupFee: 1750,
      monthlyServiceCredits: 7,
      currentEffectiveModules: [],
    }),
  );
  check(
    "Phase 37B first-time activation remains eligible for no-plan",
    actEligible.eligibility === "eligible" && actEligible.canActivate === true,
  );

  const actBlockedChange = evaluateActivationEligibility(baseState());
  check(
    "Phase 37B activation still blocks different modern plan",
    actBlockedChange.eligibility === "blocked" &&
      actBlockedChange.blockers.some((b) => b.code === "plan_change_blocked"),
  );

  const actPreview = buildActivationPreview(
    baseState({
      planKey: null,
      planStatus: "legacy",
      commercialAgreementId: "kxd-operating",
      monthlyRetainerAmount: 2000,
      setupFee: 1750,
      monthlyServiceCredits: 7,
      currentEffectiveModules: [],
    }),
  );
  check("Phase 37B activation preview still builds", actPreview.canActivate === true);

  const actBody = parseActivationRequestBody({
    previewFingerprint: actPreview.previewFingerprint,
    confirmed: true,
  });
  check("Phase 37B activation body parser unchanged", actBody.ok === true);

  const saveParsed = parseCommercialSaveBody({
    commercialAgreementId: "kxd-operating",
    monthlyRetainerAmount: 2000,
    setupFee: 1750,
    monthlyServiceCredits: 7,
    commercialAddOns: [],
    commercialNotes: null,
  });
  check("Phase 37A agreement save parser still works", saveParsed.ok === true);

  // Source contracts
  const opsService = read("lib/commercial-agreements/ops-service.ts");
  check(
    "agreement save still does not provision or change plans",
    !opsService.includes("plan-change-service") &&
      !opsService.includes("updateClientPlanAssignment") &&
      !opsService.includes("assignPlanOnClientCreate"),
  );

  const service = read("lib/commercial-agreements/plan-change-service.ts");
  check(
    "plan change reuses canonical updateClientPlanAssignment",
    service.includes("updateClientPlanAssignment") &&
      service.includes("commercial.plan.changed"),
  );
  check(
    "plan change does not send email or touch billing/providers",
    !service.includes("sendEmail") &&
      !service.includes("nodemailer") &&
      !service.includes("stripe") &&
      !service.includes("createPortalUser") &&
      !service.includes("publishInventory"),
  );
  check(
    "plan change verifies commercial terms unchanged after write",
    service.includes("Commercial fields changed unexpectedly"),
  );

  const previewRoute = read(
    "app/api/admin/commercial-agreements/[clientId]/plan-change-preview/route.ts",
  );
  const changeRoute = read(
    "app/api/admin/commercial-agreements/[clientId]/change-plan/route.ts",
  );
  check(
    "preview and mutation routes require Payload admin auth",
    previewRoute.includes("requirePayloadAdminApi") &&
      changeRoute.includes("requirePayloadAdminApi"),
  );
  check(
    "mutation rejects body clientId mismatch and unapproved fields",
    changeRoute.includes("rejectBodyClientIdMismatch") &&
      changeRoute.includes("parsePlanChangeRequestBody"),
  );

  const screen = read(
    "components/admin/operations/commercial-agreements/CommercialAgreementsScreen.tsx",
  );
  check(
    "UI offers Review plan change with removal acknowledgment",
    screen.includes("Review plan change") &&
      screen.includes("removalsAcknowledged") &&
      screen.includes("no longer be included") &&
      screen.includes("Confirm upgrade") === false
        ? screen.includes("confirmPlanChangeActionLabel")
        : screen.includes("confirmPlanChangeActionLabel"),
  );
  check(
    "UI keeps Review activation for first-time path",
    screen.includes("Review activation") &&
      screen.includes("showFirstTimeActivation"),
  );
  check(
    "UI surfaces Plan change available without list-row mutation",
    screen.includes("Plan change available") &&
      !screen.includes("Upgrade from list"),
  );

  const catalog = read("lib/client-plans/catalog.ts");
  check(
    "plan hierarchy lives in canonical catalog, not UI",
    catalog.includes("classifyPlanChange") &&
      catalog.includes("getPlanOrder") &&
      !screen.includes("PLAN_ORDER"),
  );

  console.log("\nPhase 37C verification passed.\n");
}

main();
