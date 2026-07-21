/**
 * Entitlement resolution — pure compute from assignment + optional legacy CES modules.
 *
 * Precedence:
 * 1. paused → empty effective set
 * 2. legacy / unassigned → legacy CES enabledModules (backward compatible)
 * 3. custom plan → add-ons only (no universal base)
 * 4. standard plan → (plan base ∪ add-ons) − removed
 *
 * A removed module never remains enabled because it also appears in plan or add-ons.
 */

import { baseModulesForPlan } from "./catalog";
import {
  canonicalizeEntitlementModule,
  isInternalOnlyEntitlement,
  normalizeModuleList,
} from "./modules";
import type {
  ClientPlanAssignment,
  ClientPlanKey,
  ClientPlanStatus,
  EntitlementModuleKey,
  ModuleSourceEntry,
  ResolvedClientEntitlements,
} from "./types";

export type ResolveEntitlementsInput = {
  clientId: number;
  assignment: ClientPlanAssignment;
  /** Existing experience-profile.enabledModules for legacy fallback / diagnostics. */
  legacyEnabledModules?: readonly string[] | null;
};

function uniqueSorted(values: readonly string[]): EntitlementModuleKey[] {
  return [...new Set(normalizeModuleList(values))].sort();
}

export function computeEffectiveModules(input: {
  planKey: ClientPlanKey | null;
  planStatus: ClientPlanStatus;
  addOnModules: readonly string[];
  removedModules: readonly string[];
  legacyEnabledModules?: readonly string[] | null;
}): {
  effectiveModules: EntitlementModuleKey[];
  baseModules: EntitlementModuleKey[];
  addOnModules: EntitlementModuleKey[];
  removedModules: EntitlementModuleKey[];
  legacyModules: EntitlementModuleKey[];
  isLegacy: boolean;
  isPaused: boolean;
  moduleSources: ModuleSourceEntry[];
} {
  const addOns = uniqueSorted(input.addOnModules);
  const removed = uniqueSorted(input.removedModules);
  const legacyModules = uniqueSorted(input.legacyEnabledModules ?? []);
  const removedSet = new Set(removed);

  const isPaused = input.planStatus === "paused";

  /**
   * Legacy policy: clients with no assigned plan key, or planStatus=legacy,
   * keep current CES enabledModules so portals do not lose access after migration.
   */
  const treatAsLegacy =
    !isPaused && (input.planKey == null || input.planStatus === "legacy");

  if (isPaused) {
    return {
      effectiveModules: [],
      baseModules: [],
      addOnModules: addOns,
      removedModules: removed,
      legacyModules,
      isLegacy: false,
      isPaused: true,
      moduleSources: [],
    };
  }

  if (treatAsLegacy) {
    const effective = legacyModules.filter((m) => !isInternalOnlyEntitlement(m));
    return {
      effectiveModules: effective,
      baseModules: [],
      addOnModules: addOns,
      removedModules: removed,
      legacyModules,
      isLegacy: true,
      isPaused: false,
      moduleSources: effective.map((module) => ({
        module,
        sources: ["legacy-ces" as const],
      })),
    };
  }

  const planKey = input.planKey!;
  const baseModules =
    planKey === "custom" ? [] : baseModulesForPlan(planKey);

  const combined = uniqueSorted([...baseModules, ...addOns]).filter(
    (m) => !removedSet.has(m),
  );

  const effectiveModules = combined.filter((m) => !isInternalOnlyEntitlement(m));

  const moduleSources: ModuleSourceEntry[] = effectiveModules.map((module) => {
    const sources: ModuleSourceEntry["sources"] = [];
    if (baseModules.includes(module)) sources.push("plan");
    if (addOns.includes(module)) sources.push("add-on");
    if (planKey === "custom" && sources.length === 0) {
      sources.push("custom-empty");
    }
    return { module, sources };
  });

  return {
    effectiveModules,
    baseModules,
    addOnModules: addOns,
    removedModules: removed,
    legacyModules,
    isLegacy: false,
    isPaused: false,
    moduleSources,
  };
}

export function resolveEntitlementsFromAssignment(
  input: ResolveEntitlementsInput,
): ResolvedClientEntitlements {
  const computed = computeEffectiveModules({
    planKey: input.assignment.planKey,
    planStatus: input.assignment.planStatus,
    addOnModules: input.assignment.addOnModules,
    removedModules: input.assignment.removedModules,
    legacyEnabledModules: input.legacyEnabledModules,
  });

  return {
    clientId: input.clientId,
    planKey: input.assignment.planKey,
    planStatus: input.assignment.planStatus,
    planEffectiveAt: input.assignment.planEffectiveAt,
    planNote: input.assignment.planNote,
    ...computed,
    resolvedAt: new Date().toISOString(),
  };
}

export function clientHasModule(
  entitlements: ResolvedClientEntitlements,
  moduleKey: string,
): boolean {
  const key = canonicalizeEntitlementModule(moduleKey);
  if (!key) return false;
  if (isInternalOnlyEntitlement(key)) return false;
  return entitlements.effectiveModules.includes(key);
}
