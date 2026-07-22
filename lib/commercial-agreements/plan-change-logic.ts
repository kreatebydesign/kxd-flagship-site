/**
 * Phase 37C — Pure plan-change eligibility, classification, fingerprint, preview.
 * Free of server-only so verification scripts can import them.
 */

import { createHash } from "node:crypto";
import {
  classifyPlanChange,
  getClientPlanDefinition,
  isClientPlanKey,
  type PlanChangeClassification,
} from "@/lib/client-plans/catalog";
import { computeEffectiveModules } from "@/lib/client-plans/resolve";
import type { ClientPlanKey, ClientPlanStatus } from "@/lib/client-plans/types";
import type { ActivationClientState } from "./activation-logic";
import {
  buildCapabilityChanges,
  mapAgreementToPlan,
  validateCommercialForActivation,
} from "./activation-logic";
import { getCommercialAgreement, isCommercialAgreementId } from "./definitions";
import {
  PLAN_CHANGE_EXCLUDED_ACTIONS,
  PLAN_CHANGE_MODULE_DATA_NOTE,
  type PlanChangeBlockCode,
  type PlanChangeEligibilityStatus,
  type PlanChangePreview,
} from "./plan-change-types";

/** Modern plans eligible as the *current* plan for automated agreement-driven change. */
export const PLAN_CHANGE_SOURCE_KEYS: readonly ClientPlanKey[] = [
  "starter",
  "growth",
  "premium",
  "enterprise",
] as const;

export function isPlanChangeSourceKey(
  value: string | null | undefined,
): value is ClientPlanKey {
  return (
    typeof value === "string" &&
    (PLAN_CHANGE_SOURCE_KEYS as readonly string[]).includes(value)
  );
}

export function planChangeClassificationLabel(
  classification: PlanChangeClassification | "blocked" | null,
): string {
  if (classification === "upgrade") return "Upgrade";
  if (classification === "downgrade") return "Downgrade";
  if (classification === "lateral") return "Lateral plan change";
  if (classification === "aligned") return "Plan already aligned";
  if (classification === "blocked") return "Plan change blocked";
  return "Plan change";
}

export type PlanChangeEligibilityDecision = {
  eligibility: PlanChangeEligibilityStatus;
  canChange: boolean;
  alreadyAligned: boolean;
  classification: PlanChangeClassification | "blocked" | null;
  blockers: Array<{ code: PlanChangeBlockCode; message: string }>;
  warnings: string[];
  proposedPlanKey: ClientPlanKey | null;
  proposedPlanLabel: string | null;
  proposedPlanStatus: ClientPlanStatus | null;
  agreementId: import("./types").CommercialAgreementId | null;
  agreementName: string | null;
  overrideHandling: string;
};

/**
 * Evaluate whether an agreement-driven modern plan change is allowed.
 *
 * - No modern plan → use_activation (Phase 37B)
 * - Same plan active/trial → aligned
 * - Different modern plans, empty overrides, active/trial → eligible
 * - Overrides present → block for manual review
 * - Legacy / paused / custom / custom-legacy → block
 */
export function evaluatePlanChangeEligibility(
  state: ActivationClientState,
): PlanChangeEligibilityDecision {
  const blockers: Array<{ code: PlanChangeBlockCode; message: string }> = [];
  const warnings: string[] = [];
  const overrideHandling =
    "Plan change applies the agreement plan baseline and clears client-level add-on and removal overrides. Clients with existing overrides require manual review.";

  const mapping = mapAgreementToPlan(state.commercialAgreementId);
  if (!mapping.ok) {
    const code =
      mapping.code === "plan_change_blocked"
        ? "inconsistent_state"
        : (mapping.code as PlanChangeBlockCode);
    return {
      eligibility: "blocked",
      canChange: false,
      alreadyAligned: false,
      classification: "blocked",
      blockers: [{ code, message: mapping.message }],
      warnings,
      proposedPlanKey: null,
      proposedPlanLabel: null,
      proposedPlanStatus: null,
      agreementId: isCommercialAgreementId(state.commercialAgreementId)
        ? state.commercialAgreementId
        : null,
      agreementName: getCommercialAgreement(state.commercialAgreementId)?.name ?? null,
      overrideHandling,
    };
  }

  // No modern plan — first-time activation is Phase 37B
  if (state.planKey == null) {
    return {
      eligibility: "use_activation",
      canChange: false,
      alreadyAligned: false,
      classification: null,
      blockers: [
        {
          code: "no_plan_use_activation",
          message:
            "No modern plan is assigned. Use Review activation for first-time plan assignment.",
        },
      ],
      warnings,
      proposedPlanKey: mapping.proposedPlanKey,
      proposedPlanLabel: mapping.proposedPlanLabel,
      proposedPlanStatus: null,
      agreementId: mapping.agreementId,
      agreementName: mapping.agreementName,
      overrideHandling,
    };
  }

  if (state.planStatus === "legacy" || !isPlanChangeSourceKey(state.planKey)) {
    const code: PlanChangeBlockCode =
      state.planKey === "custom" ? "custom_plan_blocked" : "legacy_blocked";
    return {
      eligibility: "blocked",
      canChange: false,
      alreadyAligned: false,
      classification: "blocked",
      blockers: [
        {
          code,
          message:
            state.planKey === "custom"
              ? "Custom plans require manual configuration and cannot be changed through this flow."
              : "Legacy clients cannot be converted through automated plan change.",
        },
      ],
      warnings,
      proposedPlanKey: mapping.proposedPlanKey,
      proposedPlanLabel: mapping.proposedPlanLabel,
      proposedPlanStatus: null,
      agreementId: mapping.agreementId,
      agreementName: mapping.agreementName,
      overrideHandling,
    };
  }

  if (state.planStatus === "paused") {
    blockers.push({
      code: "paused_blocked",
      message:
        "Paused clients cannot change plans through this flow. Resume the plan separately first.",
    });
  }

  if (state.planStatus !== "active" && state.planStatus !== "trial" && state.planStatus !== "paused") {
    blockers.push({
      code: "inconsistent_state",
      message: "Client plan status is not eligible for automated plan change.",
    });
  }

  const commercialCheck = validateCommercialForActivation({
    commercialAgreementId: mapping.agreementId,
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

  // Ambiguous overrides — do not silently clear or reinterpret
  if (state.addOnModules.length > 0 || state.removedModules.length > 0) {
    blockers.push({
      code: "overrides_manual_review",
      message:
        "This client has plan add-on or removal overrides. Resolve those manually before an automated plan change.",
    });
  }

  const proposedStatus: ClientPlanStatus =
    state.planStatus === "trial" ? "trial" : "active";

  const classification = classifyPlanChange(
    state.planKey,
    mapping.proposedPlanKey,
  );

  if (
    classification === "aligned" &&
    (state.planStatus === "active" || state.planStatus === "trial") &&
    blockers.length === 0
  ) {
    return {
      eligibility: "aligned",
      canChange: false,
      alreadyAligned: true,
      classification: "aligned",
      blockers: [],
      warnings: ["Client plan already matches the recorded agreement."],
      proposedPlanKey: mapping.proposedPlanKey,
      proposedPlanLabel: mapping.proposedPlanLabel,
      proposedPlanStatus: proposedStatus,
      agreementId: mapping.agreementId,
      agreementName: mapping.agreementName,
      overrideHandling,
    };
  }

  if (blockers.length) {
    return {
      eligibility: "blocked",
      canChange: false,
      alreadyAligned: false,
      classification: "blocked",
      blockers,
      warnings,
      proposedPlanKey: mapping.proposedPlanKey,
      proposedPlanLabel: mapping.proposedPlanLabel,
      proposedPlanStatus: proposedStatus,
      agreementId: mapping.agreementId,
      agreementName: mapping.agreementName,
      overrideHandling,
    };
  }

  if (classification === "downgrade") {
    warnings.push(
      "This is a downgrade. Some modules included today will no longer be part of the plan.",
    );
  }

  return {
    eligibility: "eligible",
    canChange: true,
    alreadyAligned: false,
    classification,
    blockers: [],
    warnings,
    proposedPlanKey: mapping.proposedPlanKey,
    proposedPlanLabel: mapping.proposedPlanLabel,
    proposedPlanStatus: proposedStatus,
    agreementId: mapping.agreementId,
    agreementName: mapping.agreementName,
    overrideHandling,
  };
}

export function buildPlanChangeFingerprint(input: {
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
  currentEffectiveModules: readonly string[];
  proposedPlanKey: string | null;
  proposedPlanStatus: string | null;
  proposedEffectiveModules: readonly string[];
}): string {
  const payload = JSON.stringify({
    kind: "plan-change",
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
    currentEffectiveModules: [...input.currentEffectiveModules].sort(),
    proposedPlanKey: input.proposedPlanKey,
    proposedPlanStatus: input.proposedPlanStatus,
    proposedEffectiveModules: [...input.proposedEffectiveModules].sort(),
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 40);
}

export function buildPlanChangePreview(
  state: ActivationClientState,
  generatedAt = new Date().toISOString(),
): PlanChangePreview {
  const decision = evaluatePlanChangeEligibility(state);
  const proposedPlanKey = decision.proposedPlanKey;
  const proposedPlanStatus = decision.proposedPlanStatus;

  const proposedComputed =
    proposedPlanKey && proposedPlanStatus
      ? computeEffectiveModules({
          planKey: proposedPlanKey,
          planStatus: proposedPlanStatus,
          addOnModules: [],
          removedModules: [],
          legacyEnabledModules: [],
        })
      : null;

  const proposedEffective = proposedComputed?.effectiveModules ?? [];
  const capabilityChanges = buildCapabilityChanges(
    state.currentEffectiveModules,
    proposedEffective,
  );
  const hasRemovals = capabilityChanges.some((row) => row.kind === "removed");

  const currentLabel = state.planKey
    ? getClientPlanDefinition(state.planKey)?.label ?? state.planKey
    : null;

  const previewFingerprint = buildPlanChangeFingerprint({
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
    currentEffectiveModules: state.currentEffectiveModules,
    proposedPlanKey,
    proposedPlanStatus,
    proposedEffectiveModules: proposedEffective,
  });

  return {
    clientId: state.clientId,
    clientName: state.clientName,
    eligibility: decision.eligibility,
    canChange: decision.canChange,
    alreadyAligned: decision.alreadyAligned,
    classification: decision.classification,
    classificationLabel: planChangeClassificationLabel(decision.classification),
    blockers: decision.blockers,
    warnings: decision.warnings,
    agreementId: decision.agreementId,
    agreementName: decision.agreementName,
    currentPlanKey: state.planKey,
    currentPlanLabel: currentLabel,
    currentPlanStatus: state.planStatus,
    proposedPlanKey,
    proposedPlanLabel: decision.proposedPlanLabel,
    proposedPlanStatus,
    commercial: {
      commercialAgreementId: decision.agreementId,
      agreementName: decision.agreementName,
      monthlyRetainerAmount: state.monthlyRetainerAmount,
      setupFee: state.setupFee,
      monthlyServiceCredits: state.monthlyServiceCredits,
      commercialAddOns: [...state.commercialAddOns],
    },
    current: {
      planKey: state.planKey,
      planStatus: state.planStatus,
      addOnModules: [...state.addOnModules],
      removedModules: [...state.removedModules],
      effectiveModules: [...state.currentEffectiveModules],
    },
    proposed: {
      planKey: proposedPlanKey,
      planStatus: proposedPlanStatus,
      addOnModules: [],
      removedModules: [],
      effectiveModules: [...proposedEffective],
    },
    capabilityChanges,
    hasRemovals,
    overrideHandling: decision.overrideHandling,
    unchangedSystems: [...PLAN_CHANGE_EXCLUDED_ACTIONS],
    moduleDataNote: PLAN_CHANGE_MODULE_DATA_NOTE,
    previewFingerprint,
    generatedAt,
  };
}

/**
 * Browser may only send fingerprint + acknowledgments.
 * Removals are always recomputed server-side — never trust a claimed count.
 */
export function parsePlanChangeRequestBody(
  body: unknown,
):
  | {
      ok: true;
      previewFingerprint: string;
      confirmed: boolean;
      removalsAcknowledged: boolean;
    }
  | { ok: false; code: PlanChangeBlockCode; message: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      code: "unapproved_fields",
      message: "Invalid plan-change request.",
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
    "classification",
    "proposedPlanKey",
    "removalCount",
  ].filter((key) => key in record);

  if (unapproved.length) {
    return {
      ok: false,
      code: "unapproved_fields",
      message:
        "Plan-change request must not supply plan, entitlement, or commercial provisioning fields.",
    };
  }

  const fingerprint = record.previewFingerprint;
  if (typeof fingerprint !== "string" || !fingerprint.trim()) {
    return {
      ok: false,
      code: "stale_preview",
      message: "A fresh plan-change preview is required.",
    };
  }

  if (record.confirmed !== true) {
    return {
      ok: false,
      code: "confirmation_required",
      message: "Explicit confirmation is required before changing the plan.",
    };
  }

  return {
    ok: true,
    previewFingerprint: fingerprint.trim(),
    confirmed: true,
    removalsAcknowledged: record.removalsAcknowledged === true,
  };
}

export function confirmPlanChangeActionLabel(
  classification: PlanChangeClassification | "blocked" | null,
): string {
  if (classification === "upgrade") return "Confirm upgrade";
  if (classification === "downgrade") return "Confirm downgrade";
  return "Confirm plan change";
}

/** Quick UI helper: mismatch between recorded agreement plan and current modern plan. */
export function hasAgreementPlanMismatch(state: {
  commercialAgreementId: string | null;
  planKey: string | null;
  planStatus: string | null;
}): boolean {
  if (!state.commercialAgreementId || !state.planKey) return false;
  if (state.planStatus !== "active" && state.planStatus !== "trial") return false;
  if (!isClientPlanKey(state.planKey) || state.planKey === "custom") return false;
  const mapping = mapAgreementToPlan(state.commercialAgreementId);
  if (!mapping.ok) return false;
  return mapping.proposedPlanKey !== state.planKey;
}
