/**
 * Phase 37D — Pure legacy conversion eligibility, module mapping, fingerprint, preview.
 * Free of server-only so verification scripts can import them.
 */

import { createHash } from "node:crypto";
import {
  baseModulesForPlan,
  getClientPlanDefinition,
  isClientPlanKey,
} from "@/lib/client-plans/catalog";
import {
  canonicalizeEntitlementModule,
  getEntitlementModuleLabel,
  isInternalOnlyEntitlement,
  isKnownEntitlementModule,
  normalizeModuleList,
} from "@/lib/client-plans/modules";
import { computeEffectiveModules } from "@/lib/client-plans/resolve";
import { rejectInvalidOverrideModules } from "@/lib/client-plans/validate";
import type { ClientPlanKey, ClientPlanStatus } from "@/lib/client-plans/types";
import type { ActivationClientState } from "./activation-logic";
import {
  buildCapabilityChanges,
  mapAgreementToPlan,
  validateCommercialForActivation,
} from "./activation-logic";
import { getCommercialAgreement, isCommercialAgreementId } from "./definitions";
import {
  LEGACY_CONVERSION_EXCLUDED_ACTIONS,
  LEGACY_CONVERSION_MODULE_DATA_NOTE,
  LEGACY_CONVERSION_OVERRIDE_HANDLING,
  type LegacyConversionBlockCode,
  type LegacyConversionEligibilityStatus,
  type LegacyConversionPreview,
  type LegacyModuleBucket,
} from "./legacy-conversion-types";

export type LegacyConversionClientState = ActivationClientState & {
  /** Raw CES enabledModules before effective filtering. */
  rawCesModules: string[];
};

function toBuckets(keys: readonly string[]): LegacyModuleBucket[] {
  return [...keys]
    .slice()
    .sort()
    .map((key) => ({
      key,
      label: getEntitlementModuleLabel(key),
    }));
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

/**
 * A module may be preserved as a plan add-on when it is known and not internal-only.
 */
export function isPreservableLegacyAddOn(raw: string): boolean {
  if (!isKnownEntitlementModule(raw)) return false;
  if (isInternalOnlyEntitlement(raw)) return false;
  const invalid = rejectInvalidOverrideModules([raw]);
  return invalid.unknown.length === 0 && invalid.internalOnly.length === 0;
}

export type LegacyModuleMapping = {
  currentEffective: string[];
  targetBaseline: string[];
  retainedInPlan: string[];
  preservedAsAddOns: string[];
  newlyIncluded: string[];
  proposedEffective: string[];
  unsupportedRaw: string[];
  noAccessLoss: boolean;
  accessLossModules: string[];
};

/**
 * Compare current effective legacy CES modules to a target plan baseline.
 * Preserved add-ons = current − baseline. Removal list stays empty.
 */
export function calculateLegacyModuleMapping(
  currentEffectiveModules: readonly string[],
  targetPlanKey: ClientPlanKey,
  rawCesModules: readonly string[] = [],
): LegacyModuleMapping {
  const currentEffective = uniqueSorted(
    normalizeModuleList(currentEffectiveModules).filter(
      (m) => !isInternalOnlyEntitlement(m),
    ),
  );
  const targetBaseline = uniqueSorted(baseModulesForPlan(targetPlanKey));
  const baselineSet = new Set(targetBaseline);

  const retainedInPlan = currentEffective.filter((m) => baselineSet.has(m));
  const preservedAsAddOns = currentEffective.filter((m) => !baselineSet.has(m));
  const newlyIncluded = targetBaseline.filter(
    (m) => !currentEffective.includes(m),
  );
  const proposedEffective = uniqueSorted([
    ...targetBaseline,
    ...preservedAsAddOns,
  ]);

  const unsupportedRaw = uniqueSorted(
    rawCesModules
      .map((raw) => String(raw).trim())
      .filter(Boolean)
      .filter((raw) => {
        const canonical = canonicalizeEntitlementModule(raw);
        if (!canonical) return true;
        // Internal-only is not client-facing access; not an unsupported blocker by itself
        // unless it somehow appears as effective (it should not).
        return false;
      }),
  );

  // Any preserved candidate that cannot be stored as an add-on is access-loss risk
  const unpreservable = preservedAsAddOns.filter((m) => !isPreservableLegacyAddOn(m));
  const accessLossModules = uniqueSorted([
    ...unpreservable,
    ...currentEffective.filter((m) => !proposedEffective.includes(m)),
  ]);

  return {
    currentEffective,
    targetBaseline,
    retainedInPlan,
    preservedAsAddOns,
    newlyIncluded,
    proposedEffective,
    unsupportedRaw,
    noAccessLoss: accessLossModules.length === 0 && unsupportedRaw.length === 0,
    accessLossModules,
  };
}

export type LegacyConversionEligibilityDecision = {
  eligibility: LegacyConversionEligibilityStatus;
  canConvert: boolean;
  alreadyConverted: boolean;
  noAccessLoss: boolean;
  blockers: Array<{ code: LegacyConversionBlockCode; message: string }>;
  warnings: string[];
  proposedPlanKey: ClientPlanKey | null;
  proposedPlanLabel: string | null;
  proposedPlanStatus: ClientPlanStatus | null;
  agreementId: import("./types").CommercialAgreementId | null;
  agreementName: string | null;
  mapping: LegacyModuleMapping | null;
};

export function evaluateLegacyConversionEligibility(
  state: LegacyConversionClientState,
): LegacyConversionEligibilityDecision {
  const blockers: Array<{ code: LegacyConversionBlockCode; message: string }> =
    [];
  const warnings: string[] = [];

  // Modern plan already assigned — use Phase 37C, not legacy conversion
  if (state.planKey != null && isClientPlanKey(state.planKey)) {
    if (state.planStatus === "active" || state.planStatus === "trial") {
      const mapping = mapAgreementToPlan(state.commercialAgreementId);
      const aligned =
        mapping.ok && mapping.proposedPlanKey === state.planKey;
      return {
        eligibility: aligned ? "already_converted" : "use_plan_change",
        canConvert: false,
        alreadyConverted: aligned,
        noAccessLoss: true,
        blockers: aligned
          ? []
          : [
              {
                code: "modern_plan_use_plan_change",
                message:
                  "This client already has a modern plan. Use Review plan change instead of legacy conversion.",
              },
            ],
        warnings: aligned
          ? ["Client is already on a modern plan matching the recorded agreement."]
          : [],
        proposedPlanKey: mapping.ok ? mapping.proposedPlanKey : state.planKey,
        proposedPlanLabel: mapping.ok
          ? mapping.proposedPlanLabel
          : getClientPlanDefinition(state.planKey)?.label ?? state.planKey,
        proposedPlanStatus: state.planStatus,
        agreementId: isCommercialAgreementId(state.commercialAgreementId)
          ? state.commercialAgreementId
          : null,
        agreementName:
          getCommercialAgreement(state.commercialAgreementId)?.name ?? null,
        mapping: null,
      };
    }
  }

  if (state.planStatus === "paused") {
    return {
      eligibility: "blocked",
      canConvert: false,
      alreadyConverted: false,
      noAccessLoss: false,
      blockers: [
        {
          code: "paused_blocked",
          message:
            "Paused clients cannot be converted through this flow. Resume separately first.",
        },
      ],
      warnings,
      proposedPlanKey: null,
      proposedPlanLabel: null,
      proposedPlanStatus: null,
      agreementId: isCommercialAgreementId(state.commercialAgreementId)
        ? state.commercialAgreementId
        : null,
      agreementName:
        getCommercialAgreement(state.commercialAgreementId)?.name ?? null,
      mapping: null,
    };
  }

  // Genuine legacy: null planKey + legacy status
  if (state.planKey != null || state.planStatus !== "legacy") {
    return {
      eligibility: "blocked",
      canConvert: false,
      alreadyConverted: false,
      noAccessLoss: false,
      blockers: [
        {
          code: state.planKey == null ? "inconsistent_state" : "not_legacy",
          message:
            state.planKey == null
              ? "Client has no modern plan but is not in legacy status. Resolve the inconsistency before conversion."
              : "Legacy conversion is only for clients without a modern plan assignment.",
        },
      ],
      warnings,
      proposedPlanKey: null,
      proposedPlanLabel: null,
      proposedPlanStatus: null,
      agreementId: isCommercialAgreementId(state.commercialAgreementId)
        ? state.commercialAgreementId
        : null,
      agreementName:
        getCommercialAgreement(state.commercialAgreementId)?.name ?? null,
      mapping: null,
    };
  }

  if (state.addOnModules.length > 0 || state.removedModules.length > 0) {
    blockers.push({
      code: "overrides_manual_review",
      message:
        "This legacy client already has plan override fields set. Resolve manually before conversion.",
    });
  }

  const mappingResult = mapAgreementToPlan(state.commercialAgreementId);
  if (!mappingResult.ok) {
    const code =
      mappingResult.code === "plan_change_blocked"
        ? "inconsistent_state"
        : (mappingResult.code as LegacyConversionBlockCode);
    return {
      eligibility: "blocked",
      canConvert: false,
      alreadyConverted: false,
      noAccessLoss: false,
      blockers: [{ code, message: mappingResult.message }],
      warnings,
      proposedPlanKey: null,
      proposedPlanLabel: null,
      proposedPlanStatus: null,
      agreementId: isCommercialAgreementId(state.commercialAgreementId)
        ? state.commercialAgreementId
        : null,
      agreementName:
        getCommercialAgreement(state.commercialAgreementId)?.name ?? null,
      mapping: null,
    };
  }

  const commercialCheck = validateCommercialForActivation({
    commercialAgreementId: mappingResult.agreementId,
    monthlyRetainerAmount: state.monthlyRetainerAmount,
    setupFee: state.setupFee,
    monthlyServiceCredits: state.monthlyServiceCredits,
  });
  if (!commercialCheck.ok) {
    blockers.push({
      code: "invalid_commercial",
      message: commercialCheck.message,
    });
  }

  const moduleMapping = calculateLegacyModuleMapping(
    state.currentEffectiveModules,
    mappingResult.proposedPlanKey,
    state.rawCesModules,
  );

  if (moduleMapping.unsupportedRaw.length) {
    blockers.push({
      code: "unsupported_modules",
      message: `Unrecognized CES modules require manual review: ${moduleMapping.unsupportedRaw.join(", ")}.`,
    });
  }

  if (moduleMapping.accessLossModules.length) {
    blockers.push({
      code: "access_loss",
      message: `Conversion would not preserve current access for: ${moduleMapping.accessLossModules.join(", ")}.`,
    });
  }

  if (!moduleMapping.noAccessLoss && !blockers.some((b) => b.code === "access_loss")) {
    blockers.push({
      code: "access_loss",
      message: "Conversion cannot guarantee no access loss for this client.",
    });
  }

  // Verify canonical resolver reproduces proposed effective set
  const resolved = computeEffectiveModules({
    planKey: mappingResult.proposedPlanKey,
    planStatus: "active",
    addOnModules: moduleMapping.preservedAsAddOns,
    removedModules: [],
    legacyEnabledModules: [],
  });
  const resolvedSet = new Set(resolved.effectiveModules);
  const missingFromResolver = moduleMapping.proposedEffective.filter(
    (m) => !resolvedSet.has(m),
  );
  if (missingFromResolver.length) {
    blockers.push({
      code: "access_loss",
      message: `Canonical plan resolution would omit: ${missingFromResolver.join(", ")}.`,
    });
  }
  for (const current of moduleMapping.currentEffective) {
    if (!resolvedSet.has(current)) {
      blockers.push({
        code: "access_loss",
        message: `Canonical plan resolution would remove current access to ${current}.`,
      });
      break;
    }
  }

  if (moduleMapping.newlyIncluded.length) {
    warnings.push(
      "The modern plan includes capabilities not present in the current legacy setup.",
    );
  }

  if (blockers.length) {
    return {
      eligibility: "blocked",
      canConvert: false,
      alreadyConverted: false,
      noAccessLoss: moduleMapping.noAccessLoss && missingFromResolver.length === 0,
      blockers,
      warnings,
      proposedPlanKey: mappingResult.proposedPlanKey,
      proposedPlanLabel: mappingResult.proposedPlanLabel,
      proposedPlanStatus: "active",
      agreementId: mappingResult.agreementId,
      agreementName: mappingResult.agreementName,
      mapping: moduleMapping,
    };
  }

  return {
    eligibility: "eligible",
    canConvert: true,
    alreadyConverted: false,
    noAccessLoss: true,
    blockers: [],
    warnings,
    proposedPlanKey: mappingResult.proposedPlanKey,
    proposedPlanLabel: mappingResult.proposedPlanLabel,
    proposedPlanStatus: "active",
    agreementId: mappingResult.agreementId,
    agreementName: mappingResult.agreementName,
    mapping: moduleMapping,
  };
}

export function buildLegacyConversionFingerprint(input: {
  clientId: number;
  updatedAt: string | null;
  commercialAgreementId: string | null;
  monthlyRetainerAmount: number | null;
  setupFee: number | null;
  monthlyServiceCredits: number | null;
  commercialAddOns: readonly string[];
  planKey: string | null;
  planStatus: string | null;
  addOnModules: readonly string[];
  removedModules: readonly string[];
  rawCesModules: readonly string[];
  currentEffectiveModules: readonly string[];
  proposedPlanKey: string | null;
  proposedAddOnModules: readonly string[];
  proposedEffectiveModules: readonly string[];
}): string {
  const payload = JSON.stringify({
    kind: "legacy-conversion",
    clientId: input.clientId,
    updatedAt: input.updatedAt,
    commercialAgreementId: input.commercialAgreementId,
    monthlyRetainerAmount: input.monthlyRetainerAmount,
    setupFee: input.setupFee,
    monthlyServiceCredits: input.monthlyServiceCredits,
    commercialAddOns: [...input.commercialAddOns].sort(),
    planKey: input.planKey,
    planStatus: input.planStatus,
    addOnModules: [...input.addOnModules].sort(),
    removedModules: [...input.removedModules].sort(),
    rawCesModules: [...input.rawCesModules].sort(),
    currentEffectiveModules: [...input.currentEffectiveModules].sort(),
    proposedPlanKey: input.proposedPlanKey,
    proposedAddOnModules: [...input.proposedAddOnModules].sort(),
    proposedEffectiveModules: [...input.proposedEffectiveModules].sort(),
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 40);
}

export function buildLegacyConversionPreview(
  state: LegacyConversionClientState,
  generatedAt = new Date().toISOString(),
): LegacyConversionPreview {
  const decision = evaluateLegacyConversionEligibility(state);
  const mapping = decision.mapping;

  const proposedAddOns = mapping?.preservedAsAddOns ?? [];
  const proposedEffective = mapping?.proposedEffective ?? [];
  const capabilityChanges = buildCapabilityChanges(
    mapping?.currentEffective ?? state.currentEffectiveModules,
    proposedEffective,
  );

  const previewFingerprint = buildLegacyConversionFingerprint({
    clientId: state.clientId,
    updatedAt: state.updatedAt,
    commercialAgreementId: state.commercialAgreementId,
    monthlyRetainerAmount: state.monthlyRetainerAmount,
    setupFee: state.setupFee,
    monthlyServiceCredits: state.monthlyServiceCredits,
    commercialAddOns: state.commercialAddOns,
    planKey: state.planKey,
    planStatus: state.planStatus,
    addOnModules: state.addOnModules,
    removedModules: state.removedModules,
    rawCesModules: state.rawCesModules,
    currentEffectiveModules: state.currentEffectiveModules,
    proposedPlanKey: decision.proposedPlanKey,
    proposedAddOnModules: proposedAddOns,
    proposedEffectiveModules: proposedEffective,
  });

  return {
    clientId: state.clientId,
    clientName: state.clientName,
    eligibility: decision.eligibility,
    canConvert: decision.canConvert,
    alreadyConverted: decision.alreadyConverted,
    noAccessLoss: decision.noAccessLoss,
    blockers: decision.blockers,
    warnings: decision.warnings,
    agreementId: decision.agreementId,
    agreementName: decision.agreementName,
    currentPlanKey: state.planKey,
    currentPlanStatus: state.planStatus,
    proposedPlanKey: decision.proposedPlanKey,
    proposedPlanLabel: decision.proposedPlanLabel,
    proposedPlanStatus: decision.proposedPlanStatus,
    commercial: {
      commercialAgreementId: decision.agreementId,
      agreementName: decision.agreementName,
      monthlyRetainerAmount: state.monthlyRetainerAmount,
      setupFee: state.setupFee,
      monthlyServiceCredits: state.monthlyServiceCredits,
      commercialAddOns: [...state.commercialAddOns],
    },
    currentLegacyModules: toBuckets(mapping?.currentEffective ?? state.currentEffectiveModules),
    targetBaselineModules: toBuckets(mapping?.targetBaseline ?? []),
    retainedInPlan: toBuckets(mapping?.retainedInPlan ?? []),
    preservedAsAddOns: toBuckets(mapping?.preservedAsAddOns ?? []),
    newlyIncluded: toBuckets(mapping?.newlyIncluded ?? []),
    unsupportedModules: toBuckets(mapping?.unsupportedRaw ?? []),
    proposedEffectiveModules: toBuckets(proposedEffective),
    proposedAddOnModules: [...proposedAddOns],
    proposedRemovedModules: [],
    capabilityChanges,
    overrideHandling: LEGACY_CONVERSION_OVERRIDE_HANDLING,
    unchangedSystems: [...LEGACY_CONVERSION_EXCLUDED_ACTIONS],
    moduleDataNote: LEGACY_CONVERSION_MODULE_DATA_NOTE,
    previewFingerprint,
    generatedAt,
  };
}

export function parseLegacyConversionRequestBody(
  body: unknown,
):
  | {
      ok: true;
      previewFingerprint: string;
      confirmed: boolean;
    }
  | { ok: false; code: LegacyConversionBlockCode; message: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      code: "unapproved_fields",
      message: "Invalid legacy-conversion request.",
    };
  }

  const record = body as Record<string, unknown>;
  const unapproved = [
    "planKey",
    "planStatus",
    "addOnModules",
    "removedModules",
    "enabledModules",
    "effectiveModules",
    "entitlements",
    "modules",
    "monthlyRetainerAmount",
    "setupFee",
    "commercialAgreementId",
    "proposedPlanKey",
    "preservedAddOns",
    "noAccessLoss",
  ].filter((key) => key in record);

  if (unapproved.length) {
    return {
      ok: false,
      code: "unapproved_fields",
      message:
        "Legacy-conversion request must not supply plan, entitlement, or commercial provisioning fields.",
    };
  }

  const fingerprint = record.previewFingerprint;
  if (typeof fingerprint !== "string" || !fingerprint.trim()) {
    return {
      ok: false,
      code: "stale_preview",
      message: "A fresh legacy-conversion preview is required.",
    };
  }

  if (record.confirmed !== true) {
    return {
      ok: false,
      code: "confirmation_required",
      message: "Explicit confirmation is required before legacy conversion.",
    };
  }

  return {
    ok: true,
    previewFingerprint: fingerprint.trim(),
    confirmed: true,
  };
}

/** UI helper: legacy client with recorded standard agreement eligible for review. */
export function isLegacyConversionCandidate(state: {
  commercialAgreementId: string | null;
  planKey: string | null;
  planStatus: string | null;
}): boolean {
  if (state.planKey != null) return false;
  if (state.planStatus !== "legacy") return false;
  if (!state.commercialAgreementId) return false;
  const mapping = mapAgreementToPlan(state.commercialAgreementId);
  return mapping.ok;
}
