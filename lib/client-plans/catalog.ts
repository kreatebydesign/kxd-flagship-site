/**
 * Canonical plan catalog — wraps Launch Wizard package presets (single commercial source)
 * and adds CES portal extensions that Launch listed only as optional/adjacent.
 */

import {
  getLaunchPackagePreset,
  listLaunchPackagePresets,
} from "@/lib/client-launch-wizard/packages/presets";
import { normalizeModuleList } from "./modules";
import type { ClientPlanDefinition, ClientPlanKey, EntitlementModuleKey } from "./types";

/**
 * CES portal modules not always present on Launch includedModules,
 * but expected for Growth+ commercial packaging.
 */
const PLAN_PORTAL_EXTENSIONS: Record<ClientPlanKey, EntitlementModuleKey[]> = {
  starter: [],
  growth: ["website-workspace"],
  premium: ["website-workspace", "inventory", "executive-review"],
  enterprise: ["website-workspace", "inventory", "executive-review"],
  custom: [],
};

const PLAN_ORDER: Record<ClientPlanKey, number> = {
  starter: 10,
  growth: 20,
  premium: 30,
  enterprise: 40,
  custom: 90,
};

/** Canonical tier rank for upgrade/downgrade classification. */
export function getPlanOrder(planKey: ClientPlanKey): number {
  return PLAN_ORDER[planKey];
}

export type PlanChangeClassification =
  | "upgrade"
  | "downgrade"
  | "lateral"
  | "aligned";

/**
 * Classify a plan move using catalog order only — not display names.
 * Same key → aligned; higher order → upgrade; lower → downgrade; equal order → lateral.
 */
export function classifyPlanChange(
  fromKey: ClientPlanKey,
  toKey: ClientPlanKey,
): PlanChangeClassification {
  if (fromKey === toKey) return "aligned";
  const fromOrder = getPlanOrder(fromKey);
  const toOrder = getPlanOrder(toKey);
  if (toOrder > fromOrder) return "upgrade";
  if (toOrder < fromOrder) return "downgrade";
  return "lateral";
}

function buildPlanDefinition(key: ClientPlanKey): ClientPlanDefinition {
  const preset = getLaunchPackagePreset(key);
  const included = normalizeModuleList([
    ...(preset?.includedModules ?? []),
    ...PLAN_PORTAL_EXTENSIONS[key],
  ]);
  const optional = normalizeModuleList(preset?.optionalModules ?? []);

  return {
    key,
    label: preset?.catalogLabel ?? key,
    description: preset?.description ?? "",
    order: PLAN_ORDER[key],
    includedModules: included,
    optionalModules: optional.filter((id) => !included.includes(id)),
  };
}

export const CLIENT_PLAN_CATALOG: readonly ClientPlanDefinition[] = (
  listLaunchPackagePresets().map((preset) =>
    buildPlanDefinition(preset.id as ClientPlanKey),
  )
).sort((a, b) => a.order - b.order);

export function getClientPlanDefinition(
  key: string | null | undefined,
): ClientPlanDefinition | null {
  if (!key) return null;
  return CLIENT_PLAN_CATALOG.find((plan) => plan.key === key) ?? null;
}

export function listClientPlans(): readonly ClientPlanDefinition[] {
  return CLIENT_PLAN_CATALOG;
}

export function isClientPlanKey(value: string): value is ClientPlanKey {
  return CLIENT_PLAN_CATALOG.some((plan) => plan.key === value);
}

export function baseModulesForPlan(
  planKey: ClientPlanKey | null,
): EntitlementModuleKey[] {
  if (!planKey) return [];
  if (planKey === "custom") return [];
  return [...(getClientPlanDefinition(planKey)?.includedModules ?? [])];
}
