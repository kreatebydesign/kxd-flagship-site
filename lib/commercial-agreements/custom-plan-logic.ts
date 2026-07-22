/**
 * Phase 37E — Pure custom-plan eligibility, selection, fingerprint, and preview.
 * Free of server-only so verification scripts can import them.
 *
 * Canonical representation (no schema change):
 *   planKey: "custom"
 *   planAddOnModules: selected eligible modules (custom has empty baseline)
 *   planRemovedModules: []
 *   planStatus: "active" on first activation; preserve "trial" on revision
 */

import { createHash } from "node:crypto";
import { isClientPlanKey } from "@/lib/client-plans/catalog";
import {
  canonicalizeEntitlementModule,
  ENTITLEMENT_MODULE_REGISTRY,
  getEntitlementModuleLabel,
  isInternalOnlyEntitlement,
  isKnownEntitlementModule,
  normalizeModuleList,
} from "@/lib/client-plans/modules";
import { computeEffectiveModules } from "@/lib/client-plans/resolve";
import { rejectInvalidOverrideModules } from "@/lib/client-plans/validate";
import type { ClientPlanStatus } from "@/lib/client-plans/types";
import type { ActivationClientState } from "./activation-logic";
import {
  buildCapabilityChanges,
  validateCommercialForActivation,
} from "./activation-logic";
import { getCommercialAgreement, isCommercialAgreementId } from "./definitions";
import {
  CUSTOM_PLAN_ACCESS_NOTE,
  CUSTOM_PLAN_EXCLUDED_ACTIONS,
  CUSTOM_PLAN_MODULE_DATA_NOTE,
  type CustomModuleBucket,
  type CustomPlanBlockCode,
  type CustomPlanEligibilityStatus,
  type CustomPlanPreview,
  type CustomSelectableModule,
} from "./custom-plan-types";

export type CustomPlanClientState = ActivationClientState & {
  rawCesModules: string[];
};

export const CUSTOM_PLAN_AGREEMENT_ID = "custom-legacy" as const;

function toBuckets(keys: readonly string[]): CustomModuleBucket[] {
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
 * Modules an operator may deliberately select for commercial client access.
 * Known, not internal-only, present in the entitlement registry.
 */
export function listCommercialSelectableModules(): CustomSelectableModule[] {
  return ENTITLEMENT_MODULE_REGISTRY.filter(
    (def) => !def.internalOnly && isKnownEntitlementModule(def.key),
  )
    .map((def) => ({
      key: def.key,
      label: def.label,
      category: def.category,
      description:
        def.category === "future"
          ? "Access entitlement only. Operational systems for this module are not configured by plan assignment."
          : def.category === "reporting"
            ? "Access entitlement only. Provider connections and reporting configuration are not changed by plan assignment."
            : "Client-facing module entitlement.",
      currentlyIncluded: false,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function isCommerciallySelectableModule(raw: string): boolean {
  const key = canonicalizeEntitlementModule(raw);
  if (!key) return false;
  if (isInternalOnlyEntitlement(key)) return false;
  const invalid = rejectInvalidOverrideModules([key]);
  if (invalid.unknown.length || invalid.internalOnly.length) return false;
  return ENTITLEMENT_MODULE_REGISTRY.some(
    (def) => def.key === key && !def.internalOnly,
  );
}

/**
 * Normalize operator-requested module keys: canonicalize, dedupe, sort.
 * Returns rejected keys separately — never invents identifiers.
 */
export function normalizeRequestedModules(raw: readonly string[]): {
  selected: string[];
  rejected: Array<{ key: string; reason: string }>;
} {
  const rejected: Array<{ key: string; reason: string }> = [];
  const selected: string[] = [];
  const seen = new Set<string>();

  for (const entry of raw) {
    const trimmed = String(entry ?? "").trim();
    if (!trimmed) continue;
    const canonical = canonicalizeEntitlementModule(trimmed);
    if (!canonical) {
      rejected.push({
        key: trimmed,
        reason: "Unknown module is not in the entitlement catalog.",
      });
      continue;
    }
    if (isInternalOnlyEntitlement(canonical)) {
      rejected.push({
        key: canonical,
        reason: "Internal-only modules are not commercially selectable.",
      });
      continue;
    }
    if (!isCommerciallySelectableModule(canonical)) {
      rejected.push({
        key: canonical,
        reason: "Module is not eligible for commercial client access.",
      });
      continue;
    }
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    selected.push(canonical);
  }

  return { selected: uniqueSorted(selected), rejected };
}

export type CustomModuleDiff = {
  currentEffective: string[];
  proposedEffective: string[];
  added: string[];
  removed: string[];
  unchanged: string[];
  unsupportedRaw: string[];
  proposedAddOns: string[];
  proposedRemoved: string[];
};

/**
 * For planKey "custom", effective access equals selected add-ons (empty baseline).
 */
export function calculateCustomModuleDiff(
  currentEffectiveModules: readonly string[],
  requestedModules: readonly string[],
  rawCesModules: readonly string[] = [],
): CustomModuleDiff {
  const currentEffective = uniqueSorted(
    normalizeModuleList(currentEffectiveModules).filter(
      (m) => !isInternalOnlyEntitlement(m),
    ),
  );
  const { selected } = normalizeRequestedModules(requestedModules);
  const proposedEffective = [...selected];
  const proposedSet = new Set(proposedEffective);
  const currentSet = new Set(currentEffective);

  const added = proposedEffective.filter((m) => !currentSet.has(m));
  const removed = currentEffective.filter((m) => !proposedSet.has(m));
  const unchanged = currentEffective.filter((m) => proposedSet.has(m));

  const unsupportedRaw = uniqueSorted(
    rawCesModules
      .map((raw) => String(raw).trim())
      .filter(Boolean)
      .filter((raw) => !canonicalizeEntitlementModule(raw)),
  );

  return {
    currentEffective,
    proposedEffective,
    added,
    removed,
    unchanged,
    unsupportedRaw,
    proposedAddOns: proposedEffective,
    proposedRemoved: [],
  };
}

export type CustomPlanEligibilityDecision = {
  eligibility: CustomPlanEligibilityStatus;
  canApply: boolean;
  alreadyAligned: boolean;
  hasRemovals: boolean;
  operation: "activate" | "revise" | null;
  blockers: Array<{ code: CustomPlanBlockCode; message: string }>;
  warnings: string[];
  proposedPlanKey: "custom" | null;
  proposedPlanStatus: ClientPlanStatus | null;
  agreementId: import("./types").CommercialAgreementId | null;
  agreementName: string | null;
};

export function evaluateCustomPlanEligibility(
  state: CustomPlanClientState,
  requestedModules: readonly string[],
): CustomPlanEligibilityDecision {
  const blockers: Array<{ code: CustomPlanBlockCode; message: string }> = [];
  const warnings: string[] = [];

  if (!state.commercialAgreementId) {
    return {
      eligibility: "blocked",
      canApply: false,
      alreadyAligned: false,
      hasRemovals: false,
      operation: null,
      blockers: [
        {
          code: "no_agreement",
          message:
            "No recorded agreement. Record a Custom / Legacy agreement before building a custom plan.",
        },
      ],
      warnings,
      proposedPlanKey: null,
      proposedPlanStatus: null,
      agreementId: null,
      agreementName: null,
    };
  }

  if (!isCommercialAgreementId(state.commercialAgreementId)) {
    return {
      eligibility: "blocked",
      canApply: false,
      alreadyAligned: false,
      hasRemovals: false,
      operation: null,
      blockers: [
        {
          code: "unknown_agreement",
          message: "Unknown commercial agreement cannot enter custom plan setup.",
        },
      ],
      warnings,
      proposedPlanKey: null,
      proposedPlanStatus: null,
      agreementId: null,
      agreementName: null,
    };
  }

  if (state.commercialAgreementId !== CUSTOM_PLAN_AGREEMENT_ID) {
    return {
      eligibility: "use_standard_flow",
      canApply: false,
      alreadyAligned: false,
      hasRemovals: false,
      operation: null,
      blockers: [
        {
          code: "standard_agreement",
          message:
            "Standard agreements use activation, plan change, or legacy conversion — not custom plan construction.",
        },
      ],
      warnings,
      proposedPlanKey: null,
      proposedPlanStatus: null,
      agreementId: state.commercialAgreementId,
      agreementName:
        getCommercialAgreement(state.commercialAgreementId)?.name ?? null,
    };
  }

  const agreement = getCommercialAgreement(CUSTOM_PLAN_AGREEMENT_ID);
  const agreementName = agreement?.name ?? "Custom / Legacy Agreement";

  const commercialCheck = validateCommercialForActivation({
    commercialAgreementId: CUSTOM_PLAN_AGREEMENT_ID,
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
        "Paused clients cannot receive custom plan changes through this flow. Resume or adjust the plan separately.",
    });
  }

  // Inconsistent: modern plan key with legacy status
  if (state.planKey != null && state.planStatus === "legacy") {
    blockers.push({
      code: "inconsistent_state",
      message:
        "Client plan state is inconsistent (plan key present with legacy status). Resolve manually before custom plan setup.",
    });
  }

  // Inconsistent: non-null unknown plan key string shouldn't happen via assignmentFromClientDoc
  if (
    state.planKey != null &&
    typeof state.planKey === "string" &&
    !isClientPlanKey(state.planKey)
  ) {
    blockers.push({
      code: "inconsistent_state",
      message: "Client has an unrecognized plan key. Resolve manually.",
    });
  }

  const { selected, rejected } = normalizeRequestedModules(requestedModules);
  if (rejected.length) {
    blockers.push({
      code: "invalid_selection",
      message: `Invalid module selection: ${rejected
        .map((r) => `${r.key} (${r.reason})`)
        .join("; ")}`,
    });
  }

  const diff = calculateCustomModuleDiff(
    state.currentEffectiveModules,
    selected,
    state.rawCesModules,
  );

  if (diff.unsupportedRaw.length) {
    blockers.push({
      code: "unsupported_modules",
      message:
        "Current CES includes unrecognized module keys. Resolve manually before custom plan construction — unrecognized access will not be silently removed.",
    });
  }

  const isLegacy =
    state.planKey == null &&
    (state.planStatus === "legacy" || state.planStatus == null);
  const isCustomModern =
    state.planKey === "custom" &&
    (state.planStatus === "active" || state.planStatus === "trial");
  const isStandardModern =
    state.planKey != null &&
    state.planKey !== "custom" &&
    isClientPlanKey(state.planKey) &&
    (state.planStatus === "active" || state.planStatus === "trial");

  let operation: "activate" | "revise" | null = null;
  if (isLegacy || (state.planKey == null && state.planStatus !== "paused")) {
    operation = "activate";
  } else if (isCustomModern) {
    operation = "revise";
  } else if (isStandardModern) {
    // Explicit custom workflow with custom-legacy agreement makes this unambiguous
    operation = "revise";
    warnings.push(
      "Client currently has a standard modern plan. Confirming will replace it with a custom assignment using the selected modules only.",
    );
  } else if (!blockers.some((b) => b.code === "paused_blocked")) {
    blockers.push({
      code: "inconsistent_state",
      message: "Client plan state is not eligible for custom plan construction.",
    });
  }

  // First activation with no modules selected
  if (
    operation === "activate" &&
    selected.length === 0 &&
    !rejected.length
  ) {
    blockers.push({
      code: "empty_selection",
      message: "Select at least one eligible module for custom plan activation.",
    });
  }

  // Existing overrides on a standard plan about to become custom are replaced —
  // warn when non-empty removals/add-ons exist on standard plan (they'll be rebuilt)
  if (
    isStandardModern &&
    (state.addOnModules.length > 0 || state.removedModules.length > 0)
  ) {
    warnings.push(
      "Existing plan add-ons and removals will be replaced by the custom module selection.",
    );
  }

  if (diff.proposedEffective.some((m) => {
    const def = ENTITLEMENT_MODULE_REGISTRY.find((row) => row.key === m);
    return def?.category === "future" || def?.category === "reporting";
  })) {
    warnings.push(
      "Some selected modules grant access only. Providers, infrastructure, and operational configuration are not set by this change.",
    );
  }

  const proposedPlanStatus: ClientPlanStatus =
    isCustomModern && state.planStatus === "trial" ? "trial" : "active";

  // Already aligned: same custom plan + same effective set
  const aligned =
    isCustomModern &&
    uniqueSorted(state.addOnModules).join(",") ===
      uniqueSorted(diff.proposedAddOns).join(",") &&
    uniqueSorted(state.removedModules).length === 0 &&
    uniqueSorted(diff.currentEffective).join(",") ===
      uniqueSorted(diff.proposedEffective).join(",") &&
    rejected.length === 0 &&
    diff.unsupportedRaw.length === 0;

  if (aligned && blockers.length === 0) {
    return {
      eligibility: "aligned",
      canApply: false,
      alreadyAligned: true,
      hasRemovals: false,
      operation: "revise",
      blockers: [],
      warnings: [
        "Proposed custom access already matches the current assignment. No changes are needed.",
      ],
      proposedPlanKey: "custom",
      proposedPlanStatus: state.planStatus,
      agreementId: CUSTOM_PLAN_AGREEMENT_ID,
      agreementName,
    };
  }

  if (blockers.length) {
    return {
      eligibility:
        blockers.some((b) => b.code === "standard_agreement")
          ? "use_standard_flow"
          : "blocked",
      canApply: false,
      alreadyAligned: false,
      hasRemovals: diff.removed.length > 0,
      operation,
      blockers,
      warnings,
      proposedPlanKey: "custom",
      proposedPlanStatus,
      agreementId: CUSTOM_PLAN_AGREEMENT_ID,
      agreementName,
    };
  }

  return {
    eligibility: "eligible",
    canApply: true,
    alreadyAligned: false,
    hasRemovals: diff.removed.length > 0,
    operation,
    blockers: [],
    warnings,
    proposedPlanKey: "custom",
    proposedPlanStatus,
    agreementId: CUSTOM_PLAN_AGREEMENT_ID,
    agreementName,
  };
}

export function buildCustomPlanFingerprint(input: {
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
  selectableCatalogKeys: readonly string[];
  proposedModules: readonly string[];
  proposedAddOns: readonly string[];
  proposedRemoved: readonly string[];
  proposedEffective: readonly string[];
  added: readonly string[];
  removed: readonly string[];
  unchanged: readonly string[];
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
    selectableCatalogKeys: [...input.selectableCatalogKeys].sort(),
    proposedModules: [...input.proposedModules].sort(),
    proposedAddOns: [...input.proposedAddOns].sort(),
    proposedRemoved: [...input.proposedRemoved].sort(),
    proposedEffective: [...input.proposedEffective].sort(),
    added: [...input.added].sort(),
    removed: [...input.removed].sort(),
    unchanged: [...input.unchanged].sort(),
    representation: "custom+addOns",
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 40);
}

export function buildCustomPlanPreview(
  state: CustomPlanClientState,
  requestedModules: readonly string[] | null | undefined,
  generatedAt = new Date().toISOString(),
): CustomPlanPreview {
  const defaultSelection =
    requestedModules == null
      ? uniqueSorted(
          normalizeModuleList(state.currentEffectiveModules).filter(
            (m) => isCommerciallySelectableModule(m),
          ),
        )
      : [...requestedModules];

  const { selected } = normalizeRequestedModules(defaultSelection);
  // Re-evaluate against the raw request so unknown/internal keys become blockers
  // rather than being silently dropped.
  const decision = evaluateCustomPlanEligibility(state, defaultSelection);
  const diff = calculateCustomModuleDiff(
    state.currentEffectiveModules,
    selected,
    state.rawCesModules,
  );

  const selectableCatalog = listCommercialSelectableModules().map((row) => ({
    ...row,
    currentlyIncluded: diff.currentEffective.includes(row.key),
  }));

  const proposedEffective =
    decision.proposedPlanKey === "custom"
      ? computeEffectiveModules({
          planKey: "custom",
          planStatus: decision.proposedPlanStatus ?? "active",
          addOnModules: diff.proposedAddOns,
          removedModules: [],
          legacyEnabledModules: [],
        }).effectiveModules
      : [];

  // Authority: proposed effective must match selected eligible set
  const capabilityChanges = buildCapabilityChanges(
    diff.currentEffective,
    proposedEffective,
  );

  const previewFingerprint = buildCustomPlanFingerprint({
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
    currentEffectiveModules: diff.currentEffective,
    selectableCatalogKeys: selectableCatalog.map((row) => row.key),
    proposedModules: selected,
    proposedAddOns: diff.proposedAddOns,
    proposedRemoved: diff.proposedRemoved,
    proposedEffective,
    added: diff.added,
    removed: diff.removed,
    unchanged: diff.unchanged,
  });

  return {
    clientId: state.clientId,
    clientName: state.clientName,
    eligibility: decision.eligibility,
    canApply: decision.canApply,
    alreadyAligned: decision.alreadyAligned,
    hasRemovals: decision.hasRemovals,
    operation: decision.operation,
    blockers: decision.blockers,
    warnings: decision.warnings,
    agreementId: decision.agreementId,
    agreementName: decision.agreementName,
    currentPlanKey: state.planKey,
    currentPlanStatus: state.planStatus,
    proposedPlanKey: decision.proposedPlanKey,
    proposedPlanStatus: decision.proposedPlanStatus,
    commercial: {
      commercialAgreementId: decision.agreementId,
      agreementName: decision.agreementName,
      monthlyRetainerAmount: state.monthlyRetainerAmount,
      setupFee: state.setupFee,
      monthlyServiceCredits: state.monthlyServiceCredits,
      commercialAddOns: [...state.commercialAddOns],
    },
    selectableModules: selectableCatalog,
    currentEffectiveModules: toBuckets(diff.currentEffective),
    proposedEffectiveModules: toBuckets(proposedEffective),
    addedModules: toBuckets(diff.added),
    removedModules: toBuckets(diff.removed),
    unchangedModules: toBuckets(diff.unchanged),
    unsupportedCurrentModules: toBuckets(diff.unsupportedRaw),
    proposedAddOnModules: [...diff.proposedAddOns],
    proposedRemovedModules: [],
    capabilityChanges,
    unchangedSystems: [...CUSTOM_PLAN_EXCLUDED_ACTIONS],
    moduleDataNote: CUSTOM_PLAN_MODULE_DATA_NOTE,
    accessNote: CUSTOM_PLAN_ACCESS_NOTE,
    previewFingerprint,
    generatedAt,
  };
}

/**
 * Browser may submit only requested module keys + acknowledgments + fingerprint.
 */
export function parseCustomPlanRequestBody(
  body: unknown,
):
  | {
      ok: true;
      previewFingerprint: string;
      confirmed: boolean;
      removalsAcknowledged: boolean;
      requestedModules: string[];
    }
  | { ok: false; code: CustomPlanBlockCode; message: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      code: "unapproved_fields",
      message: "Invalid custom-plan request.",
    };
  }

  const record = body as Record<string, unknown>;
  const unapproved = [
    "planKey",
    "planStatus",
    "addOnModules",
    "removedModules",
    "planAddOnModules",
    "planRemovedModules",
    "enabledModules",
    "effectiveModules",
    "entitlements",
    "modules",
    "monthlyRetainerAmount",
    "setupFee",
    "commercialAgreementId",
    "proposedPlanKey",
    "addedModules",
    "removedModulesList",
    "removalCount",
    "price",
    "status",
  ].filter((key) => key in record);

  if (unapproved.length) {
    return {
      ok: false,
      code: "unapproved_fields",
      message:
        "Custom-plan request must not supply plan, entitlement, or commercial provisioning fields.",
    };
  }

  const fingerprint = record.previewFingerprint;
  if (typeof fingerprint !== "string" || !fingerprint.trim()) {
    return {
      ok: false,
      code: "stale_preview",
      message: "A fresh custom-plan preview is required.",
    };
  }

  if (record.confirmed !== true) {
    return {
      ok: false,
      code: "confirmation_required",
      message: "Explicit confirmation is required before applying a custom plan.",
    };
  }

  if (!Array.isArray(record.requestedModules)) {
    return {
      ok: false,
      code: "invalid_selection",
      message: "requestedModules must be an array of canonical module keys.",
    };
  }

  const requestedModules = record.requestedModules.filter(
    (v): v is string => typeof v === "string",
  );
  if (requestedModules.length !== record.requestedModules.length) {
    return {
      ok: false,
      code: "invalid_selection",
      message: "requestedModules must contain only strings.",
    };
  }

  return {
    ok: true,
    previewFingerprint: fingerprint.trim(),
    confirmed: true,
    removalsAcknowledged: record.removalsAcknowledged === true,
    requestedModules,
  };
}

export function parseCustomPlanPreviewBody(
  body: unknown,
):
  | { ok: true; requestedModules: string[] | null }
  | { ok: false; code: CustomPlanBlockCode; message: string } {
  if (body == null || body === "") {
    return { ok: true, requestedModules: null };
  }
  if (typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      code: "unapproved_fields",
      message: "Invalid custom-plan preview request.",
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
    "commercialAgreementId",
    "proposedPlanKey",
    "price",
  ].filter((key) => key in record);
  if (unapproved.length) {
    return {
      ok: false,
      code: "unapproved_fields",
      message:
        "Custom-plan preview must not supply plan or commercial provisioning fields.",
    };
  }
  if (!("requestedModules" in record) || record.requestedModules == null) {
    return { ok: true, requestedModules: null };
  }
  if (!Array.isArray(record.requestedModules)) {
    return {
      ok: false,
      code: "invalid_selection",
      message: "requestedModules must be an array of canonical module keys.",
    };
  }
  const requestedModules = record.requestedModules.filter(
    (v): v is string => typeof v === "string",
  );
  if (requestedModules.length !== record.requestedModules.length) {
    return {
      ok: false,
      code: "invalid_selection",
      message: "requestedModules must contain only strings.",
    };
  }
  return { ok: true, requestedModules };
}

/** UI helper: recorded custom-legacy agreement may open custom plan builder. */
export function isCustomPlanCandidate(state: {
  commercialAgreementId: string | null;
  planStatus: string | null;
}): boolean {
  if (state.commercialAgreementId !== CUSTOM_PLAN_AGREEMENT_ID) return false;
  if (state.planStatus === "paused") return false;
  return true;
}

export function customPlanEligibilityLabel(
  eligibility: CustomPlanEligibilityStatus,
): string {
  if (eligibility === "eligible") return "Custom plan setup available";
  if (eligibility === "aligned") return "Custom access already aligned";
  if (eligibility === "use_standard_flow") return "Use standard plan workflow";
  return "Custom plan blocked";
}

export function confirmCustomPlanActionLabel(
  operation: "activate" | "revise" | null,
): string {
  if (operation === "revise") return "Confirm custom plan";
  return "Confirm custom plan";
}
