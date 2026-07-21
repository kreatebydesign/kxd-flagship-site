/**
 * Derive add-on / removed overrides from a selected module set vs plan base.
 * Used by Launch Wizard and Client Provisioning so they do not duplicate catalog logic.
 */

import { baseModulesForPlan, isClientPlanKey } from "./catalog";
import { normalizeModuleList } from "./modules";
import type { ClientPlanKey, EntitlementModuleKey } from "./types";

export type DerivedPlanOverrides = {
  planKey: ClientPlanKey;
  addOnModules: EntitlementModuleKey[];
  removedModules: EntitlementModuleKey[];
};

/**
 * Compare selected entitlement IDs to the plan base:
 * - add-ons = selected − base
 * - removed = base − selected (standard plans only; custom has empty base)
 */
export function derivePlanOverridesFromSelection(
  packageId: string,
  selectedModules: readonly string[],
): DerivedPlanOverrides | null {
  if (!isClientPlanKey(packageId)) return null;

  const selected = normalizeModuleList(selectedModules);
  const base = baseModulesForPlan(packageId);
  const baseSet = new Set(base);
  const selectedSet = new Set(selected);

  const addOnModules = selected.filter((key) => !baseSet.has(key));
  const removedModules =
    packageId === "custom"
      ? []
      : base.filter((key) => !selectedSet.has(key));

  return {
    planKey: packageId,
    addOnModules,
    removedModules,
  };
}
