/**
 * Phase 37B — Controlled Agreement Activation verification.
 *
 *   npm run verify:commercial-activation
 *
 * Pure deterministic checks (no production writes, no network).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ACTIVATABLE_AGREEMENT_IDS,
  ACTIVATION_EXCLUDED_ACTIONS,
  assertCommercialBaselineMatches,
  buildActivationFingerprint,
  buildActivationPreview,
  evaluateActivationEligibility,
  mapAgreementToPlan,
  parseActivationRequestBody,
  parseCommercialSaveBody,
  type ActivationClientState,
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

function baseState(
  overrides: Partial<ActivationClientState> = {},
): ActivationClientState {
  return {
    clientId: 42,
    clientName: "Fixture Client",
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
    currentEffectiveModules: [],
    ...overrides,
  };
}

function main() {
  console.log("\nPhase 37B — verify:commercial-activation\n");

  // --- Mapping ---
  const partnership = mapAgreementToPlan("kxd-partnership");
  check(
    "standard agreement maps to correct canonical plan (partnership→starter)",
    partnership.ok === true &&
      partnership.ok &&
      partnership.proposedPlanKey === "starter",
  );

  const operating = mapAgreementToPlan("kxd-operating");
  check(
    "standard agreement maps to correct canonical plan (operating→growth)",
    operating.ok === true &&
      operating.ok &&
      operating.proposedPlanKey === "growth",
  );

  const executive = mapAgreementToPlan("kxd-executive");
  check(
    "standard agreement maps to correct canonical plan (executive→premium)",
    executive.ok === true &&
      executive.ok &&
      executive.proposedPlanKey === "premium",
  );

  const custom = mapAgreementToPlan("custom-legacy");
  check(
    "custom-legacy is blocked when no safe automated mapping",
    custom.ok === false &&
      custom.ok === false &&
      custom.code === "custom_legacy_manual",
  );

  const missing = mapAgreementToPlan(null);
  check(
    "missing agreement blocks activation",
    missing.ok === false && missing.code === "no_agreement",
  );

  const unknown = mapAgreementToPlan("not-a-real-agreement");
  check(
    "unknown agreement ID blocks activation",
    unknown.ok === false && unknown.code === "unknown_agreement",
  );

  check(
    "only three agreements are auto-activatable",
    ACTIVATABLE_AGREEMENT_IDS.length === 3 &&
      ACTIVATABLE_AGREEMENT_IDS.includes("kxd-partnership") &&
      ACTIVATABLE_AGREEMENT_IDS.includes("kxd-operating") &&
      ACTIVATABLE_AGREEMENT_IDS.includes("kxd-executive"),
  );

  // --- Eligibility ---
  const eligible = evaluateActivationEligibility(baseState());
  check(
    "no-plan eligible client can be previewed",
    eligible.eligibility === "eligible" &&
      eligible.canActivate === true &&
      eligible.proposedPlanKey === "growth",
  );

  const already = evaluateActivationEligibility(
    baseState({
      planKey: "growth",
      planStatus: "active",
      currentEffectiveModules: [...baseModulesForPlan("growth")],
    }),
  );
  check(
    "same active plan returns already-active/idempotent behavior",
    already.eligibility === "already_active" &&
      already.alreadyActive === true &&
      already.canActivate === false,
  );

  const planChange = evaluateActivationEligibility(
    baseState({
      planKey: "starter",
      planStatus: "active",
    }),
  );
  check(
    "different modern plan blocks unintended plan replacement",
    planChange.eligibility === "blocked" &&
      planChange.blockers.some((b) => b.code === "plan_change_blocked"),
  );

  const legacyNoAgreement = evaluateActivationEligibility(
    baseState({
      commercialAgreementId: null,
      planKey: null,
      planStatus: "legacy",
      currentEffectiveModules: ["website-review"],
    }),
  );
  check(
    "legacy client without agreement blocks automatic conversion",
    legacyNoAgreement.eligibility === "blocked" &&
      legacyNoAgreement.blockers.some((b) => b.code === "no_agreement") &&
      legacyNoAgreement.canActivate === false,
  );

  const customState = evaluateActivationEligibility(
    baseState({
      commercialAgreementId: "custom-legacy",
      monthlyRetainerAmount: 1500,
      setupFee: 0,
      monthlyServiceCredits: 3,
    }),
  );
  check(
    "custom-legacy recorded agreement blocks automated activation",
    customState.eligibility === "blocked" &&
      customState.blockers.some((b) => b.code === "custom_legacy_manual"),
  );

  const tamperedCommercial = evaluateActivationEligibility(
    baseState({
      monthlyRetainerAmount: 9999,
    }),
  );
  check(
    "required commercial values must remain valid for activation",
    tamperedCommercial.eligibility === "blocked" &&
      tamperedCommercial.blockers.some((b) => b.code === "invalid_commercial"),
  );

  // --- Preview ---
  const preview = buildActivationPreview(baseState());
  check(
    "preview is generated from server-side canonical data",
    preview.canActivate === true &&
      preview.proposedPlanKey === "growth" &&
      preview.proposed.effectiveModules.includes("website-review") &&
      preview.proposed.effectiveModules.includes("website-workspace") &&
      preview.previewFingerprint.length >= 32,
  );

  check(
    "preview distinguishes commercial record from plan assignment",
    preview.commercial.commercialAgreementId === "kxd-operating" &&
      preview.proposed.planKey === "growth" &&
      preview.current.planKey === null,
  );

  check(
    "preview lists systems not activated here",
    ACTIVATION_EXCLUDED_ACTIONS.length >= 8 &&
      preview.unchangedSystems.some((row) => row.id === "billing") &&
      preview.unchangedSystems.some((row) => row.id === "providers") &&
      preview.unchangedSystems.some((row) => row.id === "portal-users"),
  );

  const stale = buildActivationPreview(
    baseState({ updatedAt: "2026-07-21T13:00:00.000Z" }),
  );
  check(
    "stale preview fingerprint changes when client state changes",
    preview.previewFingerprint !== stale.previewFingerprint,
  );

  const fp = buildActivationFingerprint({
    clientId: 42,
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
    currentEffectiveModules: [],
    proposedPlanKey: "growth",
    proposedEffectiveModules: preview.proposed.effectiveModules,
  });
  check(
    "fingerprint is stable for identical state",
    fp === preview.previewFingerprint,
  );

  // --- Request body validation ---
  const goodBody = parseActivationRequestBody({
    previewFingerprint: preview.previewFingerprint,
    confirmed: true,
  });
  check(
    "valid activation body accepted",
    goodBody.ok === true && goodBody.ok && goodBody.confirmed === true,
  );

  const withPlan = parseActivationRequestBody({
    previewFingerprint: "abc",
    confirmed: true,
    planKey: "enterprise",
    addOnModules: ["inventory"],
  });
  check(
    "browser-supplied plan or entitlement values are rejected",
    withPlan.ok === false && withPlan.code === "unapproved_fields",
  );

  const unconfirmed = parseActivationRequestBody({
    previewFingerprint: preview.previewFingerprint,
    confirmed: false,
  });
  check(
    "activation requires explicit confirmation",
    unconfirmed.ok === false && unconfirmed.code === "confirmation_required",
  );

  check(
    "client identity mismatch helper rejects substituted ids",
    rejectBodyClientIdMismatch(42, { clientId: 99 }) ===
      "Client identity mismatch.",
  );

  check(
    "invalid client id pattern is rejected by route helper",
    rejectBodyClientIdMismatch(42, { clientId: "abc" }) ===
      "Invalid client identity in request body.",
  );

  // --- Agreement save still does not provision ---
  const saveParsed = parseCommercialSaveBody({
    commercialAgreementId: "kxd-operating",
    monthlyRetainerAmount: 2000,
    setupFee: 1750,
    monthlyServiceCredits: 7,
    commercialAddOns: [],
    commercialNotes: null,
  });
  check("Phase 37A agreement save parser still works", saveParsed.ok === true);

  const baseline = assertCommercialBaselineMatches("kxd-partnership", {
    monthlyStarting: 1250,
    setupFee: 1000,
    monthlyServiceCredits: 4,
  });
  check("commercial baseline enforcement unchanged", baseline.ok === true);

  // --- Source contracts ---
  const opsService = read("lib/commercial-agreements/ops-service.ts");
  check(
    "agreement save service does not import activation or plan assignment",
    !opsService.includes("activation-service") &&
      !opsService.includes("assignPlanOnClientCreate") &&
      !opsService.includes("updateClientPlanAssignment"),
  );

  const activationService = read(
    "lib/commercial-agreements/activation-service.ts",
  );
  check(
    "activation reuses canonical assignPlanOnClientCreate",
    activationService.includes("assignPlanOnClientCreate") &&
      !activationService.includes("payload.create") &&
      activationService.includes("commercial.plan.activated"),
  );
  check(
    "activation does not send email or connect providers",
    !activationService.includes("nodemailer") &&
      !activationService.includes("sendEmail") &&
      !activationService.includes("stripe") &&
      !activationService.includes("createPortalUser") &&
      !activationService.includes("publishInventory"),
  );

  const previewRoute = read(
    "app/api/admin/commercial-agreements/[clientId]/activation-preview/route.ts",
  );
  const activateRoute = read(
    "app/api/admin/commercial-agreements/[clientId]/activate/route.ts",
  );
  check(
    "preview and activate routes require Payload admin auth",
    previewRoute.includes("requirePayloadAdminApi") &&
      activateRoute.includes("requirePayloadAdminApi"),
  );
  check(
    "activate route rejects body clientId mismatch",
    activateRoute.includes("rejectBodyClientIdMismatch"),
  );
  check(
    "activate route uses parseActivationRequestBody (rejects unapproved fields)",
    activateRoute.includes("parseActivationRequestBody"),
  );

  const screen = read(
    "components/admin/operations/commercial-agreements/CommercialAgreementsScreen.tsx",
  );
  check(
    "UI offers Review activation with deliberate confirm, not list-row activate",
    screen.includes("Review activation") &&
      screen.includes("Activate plan") &&
      screen.includes("activationAcknowledged") &&
      screen.includes("No recorded agreement available for activation") &&
      screen.includes("onClick={() => void confirmActivation()}") &&
      !screen.includes("Activate from list"),
  );
  check(
    "UI confirmation lists excluded actions",
    screen.includes("does not bill") &&
      screen.includes("connect providers") &&
      screen.includes("create portal users"),
  );

  const page = read("app/admin/operations/commercial-agreements/page.tsx");
  check(
    "operations page remains operator-guarded",
    page.includes("requirePayloadAdminPage"),
  );

  console.log("\nPhase 37B verification passed.\n");
}

main();
