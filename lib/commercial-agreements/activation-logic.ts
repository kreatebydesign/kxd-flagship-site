/**
 * Phase 37B — Pure activation mapping, eligibility, fingerprint, and preview builders.
 * Free of server-only so verification scripts can import them.
 */

import { createHash } from "node:crypto";
import {
  assertCommercialBaselineMatches,
  getCommercialAgreement,
  isCommercialAgreementId,
} from "./definitions";
import { getClientPlanDefinition, isClientPlanKey } from "@/lib/client-plans/catalog";
import { getEntitlementModuleLabel } from "@/lib/client-plans/modules";
import { computeEffectiveModules } from "@/lib/client-plans/resolve";
import type { ClientPlanKey, ClientPlanStatus } from "@/lib/client-plans/types";
import type { CommercialAgreementId } from "./types";
import {
  ACTIVATION_EXCLUDED_ACTIONS,
  type ActivationBlockCode,
  type ActivationCapabilityChange,
  type ActivationCommercialSnapshot,
  type ActivationEligibilityStatus,
  type ActivationPlanSnapshot,
  type ActivationPreview,
} from "./activation-types";

/** Standard agreements that map safely to a modern base plan. */
export const ACTIVATABLE_AGREEMENT_IDS: readonly CommercialAgreementId[] = [
  "kxd-partnership",
  "kxd-operating",
  "kxd-executive",
] as const;

export type ActivationClientState = {
  clientId: number;
  clientName: string;
  updatedAt: string | null;
  commercialAgreementId: CommercialAgreementId | null;
  monthlyRetainerAmount: number | null;
  setupFee: number | null;
  monthlyServiceCredits: number | null;
  commercialAddOns: string[];
  planKey: ClientPlanKey | null;
  planStatus: ClientPlanStatus | null;
  addOnModules: string[];
  removedModules: string[];
  /** Current CES / legacy effective modules used for comparison. */
  currentEffectiveModules: string[];
};

export type ActivationMappingResult =
  | {
      ok: true;
      agreementId: CommercialAgreementId;
      agreementName: string;
      proposedPlanKey: ClientPlanKey;
      proposedPlanLabel: string;
    }
  | {
      ok: false;
      code: ActivationBlockCode;
      message: string;
    };

/**
 * Map a recorded commercial agreement to a canonical plan key.
 * custom-legacy is intentionally not auto-mapped for activation.
 */
export function mapAgreementToPlan(
  agreementId: string | null | undefined,
): ActivationMappingResult {
  if (!agreementId) {
    return {
      ok: false,
      code: "no_agreement",
      message: "No recorded agreement available for activation.",
    };
  }
  if (!isCommercialAgreementId(agreementId)) {
    return {
      ok: false,
      code: "unknown_agreement",
      message: "Unknown commercial agreement cannot be activated.",
    };
  }
  if (agreementId === "custom-legacy") {
    return {
      ok: false,
      code: "custom_legacy_manual",
      message:
        "Custom / Legacy agreements require manual review and cannot be activated automatically.",
    };
  }
  if (!ACTIVATABLE_AGREEMENT_IDS.includes(agreementId)) {
    return {
      ok: false,
      code: "unknown_agreement",
      message: "This agreement has no safe canonical plan mapping.",
    };
  }

  const agreement = getCommercialAgreement(agreementId);
  if (!agreement) {
    return {
      ok: false,
      code: "unknown_agreement",
      message: "Unknown commercial agreement cannot be activated.",
    };
  }

  const proposedPlanKey = agreement.entitlementPresetId;
  if (!isClientPlanKey(proposedPlanKey) || proposedPlanKey === "custom") {
    return {
      ok: false,
      code: "custom_legacy_manual",
      message:
        "This agreement does not map to a safe modern plan for automated activation.",
    };
  }

  const plan = getClientPlanDefinition(proposedPlanKey);
  return {
    ok: true,
    agreementId,
    agreementName: agreement.name,
    proposedPlanKey,
    proposedPlanLabel: plan?.label ?? proposedPlanKey,
  };
}

export function validateCommercialForActivation(input: {
  commercialAgreementId: CommercialAgreementId;
  monthlyRetainerAmount: number | null;
  setupFee: number | null;
  monthlyServiceCredits: number | null;
}): { ok: true } | { ok: false; message: string } {
  return assertCommercialBaselineMatches(input.commercialAgreementId, {
    monthlyStarting: input.monthlyRetainerAmount,
    setupFee: input.setupFee,
    monthlyServiceCredits: input.monthlyServiceCredits,
  });
}

export type EligibilityDecision = {
  eligibility: ActivationEligibilityStatus;
  canActivate: boolean;
  alreadyActive: boolean;
  blockers: Array<{ code: ActivationBlockCode; message: string }>;
  warnings: string[];
  proposedPlanKey: ClientPlanKey | null;
  proposedPlanLabel: string | null;
  agreementId: CommercialAgreementId | null;
  agreementName: string | null;
};

/**
 * Decide whether first-time activation is allowed.
 *
 * Eligible: recorded standard agreement + no modern plan assigned (planKey null).
 * Already active: identical plan already active/trial.
 * Blocked: missing agreement, custom-legacy, plan change, paused, invalid commercials,
 *          or inconsistent legacy+planKey state.
 */
export function evaluateActivationEligibility(
  state: ActivationClientState,
): EligibilityDecision {
  const blockers: Array<{ code: ActivationBlockCode; message: string }> = [];
  const warnings: string[] = [];

  const mapping = mapAgreementToPlan(state.commercialAgreementId);
  if (!mapping.ok) {
    return {
      eligibility: "blocked",
      canActivate: false,
      alreadyActive: false,
      blockers: [{ code: mapping.code, message: mapping.message }],
      warnings,
      proposedPlanKey: null,
      proposedPlanLabel: null,
      agreementId: isCommercialAgreementId(state.commercialAgreementId)
        ? state.commercialAgreementId
        : null,
      agreementName: getCommercialAgreement(state.commercialAgreementId)?.name ?? null,
    };
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

  if (state.planStatus === "paused") {
    blockers.push({
      code: "paused_blocked",
      message:
        "Paused clients cannot be activated through this flow. Resume or adjust the plan separately.",
    });
  }

  // Inconsistent: modern plan key with legacy status
  if (state.planKey != null && state.planStatus === "legacy") {
    blockers.push({
      code: "inconsistent_state",
      message:
        "Client plan state is inconsistent (plan key present with legacy status). Resolve manually before activation.",
    });
  }

  const currentKey = state.planKey;
  const proposedKey = mapping.proposedPlanKey;

  // Already on the identical modern plan
  if (
    currentKey === proposedKey &&
    (state.planStatus === "active" || state.planStatus === "trial")
  ) {
    return {
      eligibility: "already_active",
      canActivate: false,
      alreadyActive: true,
      blockers: [],
      warnings: ["This client is already active on the plan for this agreement."],
      proposedPlanKey: proposedKey,
      proposedPlanLabel: mapping.proposedPlanLabel,
      agreementId: mapping.agreementId,
      agreementName: mapping.agreementName,
    };
  }

  // Different modern plan already assigned — Phase 37B does not change plans
  if (currentKey != null && currentKey !== proposedKey) {
    blockers.push({
      code: "plan_change_blocked",
      message: `Client already has plan “${currentKey}”. Plan changes are not available in this activation flow.`,
    });
  }

  // Same plan key but not active/trial (e.g. unexpected status)
  if (
    currentKey === proposedKey &&
    state.planStatus !== "active" &&
    state.planStatus !== "trial" &&
    state.planStatus !== "paused"
  ) {
    blockers.push({
      code: "inconsistent_state",
      message:
        "Client already references this plan but is not in an activatable status.",
    });
  }

  // First-time path requires no modern plan key
  if (currentKey == null && state.planStatus === "legacy") {
    // Expected unprovisioned state — eligible if no other blockers
    if (state.currentEffectiveModules.length > 0) {
      warnings.push(
        "Current access comes from legacy portal modules. Activation will replace that access with the plan baseline.",
      );
    }
  }

  if (blockers.length) {
    return {
      eligibility: "blocked",
      canActivate: false,
      alreadyActive: false,
      blockers,
      warnings,
      proposedPlanKey: proposedKey,
      proposedPlanLabel: mapping.proposedPlanLabel,
      agreementId: mapping.agreementId,
      agreementName: mapping.agreementName,
    };
  }

  if (currentKey == null) {
    return {
      eligibility: "eligible",
      canActivate: true,
      alreadyActive: false,
      blockers: [],
      warnings,
      proposedPlanKey: proposedKey,
      proposedPlanLabel: mapping.proposedPlanLabel,
      agreementId: mapping.agreementId,
      agreementName: mapping.agreementName,
    };
  }

  // Fallback — should not reach for well-formed states
  blockers.push({
    code: "inconsistent_state",
    message: "Client plan state cannot be activated safely.",
  });
  return {
    eligibility: "blocked",
    canActivate: false,
    alreadyActive: false,
    blockers,
    warnings,
    proposedPlanKey: proposedKey,
    proposedPlanLabel: mapping.proposedPlanLabel,
    agreementId: mapping.agreementId,
    agreementName: mapping.agreementName,
  };
}

export function buildCapabilityChanges(
  currentModules: readonly string[],
  proposedModules: readonly string[],
): ActivationCapabilityChange[] {
  const current = new Set(currentModules);
  const proposed = new Set(proposedModules);
  const keys = [...new Set([...currentModules, ...proposedModules])].sort();
  return keys.map((key) => {
    const inCurrent = current.has(key);
    const inProposed = proposed.has(key);
    let kind: ActivationCapabilityChange["kind"] = "unchanged";
    if (inProposed && !inCurrent) kind = "added";
    else if (inCurrent && !inProposed) kind = "removed";
    return {
      key,
      label: getEntitlementModuleLabel(key),
      kind,
    };
  });
}

export function buildActivationFingerprint(input: {
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
  proposedEffectiveModules: readonly string[];
}): string {
  const payload = JSON.stringify({
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
    proposedEffectiveModules: [...input.proposedEffectiveModules].sort(),
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 40);
}

export function buildActivationPreview(
  state: ActivationClientState,
  generatedAt = new Date().toISOString(),
): ActivationPreview {
  const decision = evaluateActivationEligibility(state);

  const proposedPlanKey = decision.proposedPlanKey;
  const proposedPlanStatus: ClientPlanStatus | null = proposedPlanKey
    ? "active"
    : null;

  const proposedComputed = proposedPlanKey
    ? computeEffectiveModules({
        planKey: proposedPlanKey,
        planStatus: "active",
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

  const commercial: ActivationCommercialSnapshot = {
    commercialAgreementId: decision.agreementId,
    agreementName: decision.agreementName,
    monthlyRetainerAmount: state.monthlyRetainerAmount,
    setupFee: state.setupFee,
    monthlyServiceCredits: state.monthlyServiceCredits,
    commercialAddOns: [...state.commercialAddOns],
  };

  const current: ActivationPlanSnapshot = {
    planKey: state.planKey,
    planStatus: state.planStatus,
    addOnModules: [...state.addOnModules],
    removedModules: [...state.removedModules],
    effectiveModules: [...state.currentEffectiveModules],
  };

  const proposed: ActivationPlanSnapshot = {
    planKey: proposedPlanKey,
    planStatus: proposedPlanStatus,
    addOnModules: [],
    removedModules: [],
    effectiveModules: [...proposedEffective],
  };

  const previewFingerprint = buildActivationFingerprint({
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
    proposedEffectiveModules: proposedEffective,
  });

  return {
    clientId: state.clientId,
    clientName: state.clientName,
    eligibility: decision.eligibility,
    canActivate: decision.canActivate,
    alreadyActive: decision.alreadyActive,
    blockers: decision.blockers,
    warnings: decision.warnings,
    agreementId: decision.agreementId,
    agreementName: decision.agreementName,
    proposedPlanKey,
    proposedPlanLabel: decision.proposedPlanLabel,
    proposedPlanStatus,
    commercial,
    current,
    proposed,
    capabilityChanges,
    unchangedSystems: [...ACTIVATION_EXCLUDED_ACTIONS],
    previewFingerprint,
    generatedAt,
  };
}

/**
 * Reject browser-supplied provisioning fields. Only fingerprint + confirmation
 * are accepted from the client; plan/module data is always server-derived.
 */
export function parseActivationRequestBody(
  body: unknown,
):
  | {
      ok: true;
      previewFingerprint: string;
      confirmed: boolean;
    }
  | { ok: false; code: ActivationBlockCode; message: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      code: "unapproved_fields",
      message: "Invalid activation request.",
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
  ].filter((key) => key in record);

  if (unapproved.length) {
    return {
      ok: false,
      code: "unapproved_fields",
      message:
        "Activation request must not supply plan, entitlement, or commercial provisioning fields.",
    };
  }

  const fingerprint = record.previewFingerprint;
  if (typeof fingerprint !== "string" || !fingerprint.trim()) {
    return {
      ok: false,
      code: "stale_preview",
      message: "A fresh activation preview is required.",
    };
  }

  if (record.confirmed !== true) {
    return {
      ok: false,
      code: "confirmation_required",
      message: "Explicit confirmation is required before activation.",
    };
  }

  return {
    ok: true,
    previewFingerprint: fingerprint.trim(),
    confirmed: true,
  };
}

export function activationEligibilityLabel(
  status: ActivationEligibilityStatus,
): string {
  if (status === "eligible") return "Ready to activate";
  if (status === "already_active") return "Already active";
  return "Activation blocked";
}
