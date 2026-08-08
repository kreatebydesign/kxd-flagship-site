/**
 * Canonical entitlement module registry.
 * Derived from lib/ces/modules/canonical — does not invent parallel names.
 */

import {
  CANONICAL_CAPABILITY_REGISTRY,
  CES_EXPERIENCE_MODULE_IDS,
  canonicalizeCapabilityKey,
  getCanonicalCapability,
  getCanonicalCapabilityLabel,
  isInternalOnlyCapability,
  isKnownCanonicalCapability,
} from "@/lib/ces/modules/canonical";
import type { EntitlementModuleDefinition, EntitlementModuleKey } from "./types";

function toEntitlementCategory(
  kind: (typeof CANONICAL_CAPABILITY_REGISTRY)[number]["kind"],
): EntitlementModuleDefinition["category"] {
  if (kind === "portal") return "portal";
  if (kind === "reporting") return "reporting";
  if (kind === "future") return "future";
  return "operations";
}

export const ENTITLEMENT_MODULE_REGISTRY: readonly EntitlementModuleDefinition[] =
  CANONICAL_CAPABILITY_REGISTRY.map((def) => ({
    key: def.key,
    label: def.label,
    category: toEntitlementCategory(def.kind),
    internalOnly: def.internalOnly || undefined,
    aliases: def.aliases ? [...def.aliases] : undefined,
  }));

export function canonicalizeEntitlementModule(
  raw: string,
): EntitlementModuleKey | null {
  return canonicalizeCapabilityKey(raw);
}

export function isKnownEntitlementModule(raw: string): boolean {
  return isKnownCanonicalCapability(raw);
}

export function isInternalOnlyEntitlement(raw: string): boolean {
  return isInternalOnlyCapability(raw);
}

/** Portal-visible CES experience module keys (never includes internal-only). */
export const PORTAL_CES_ENTITLEMENT_KEYS: readonly EntitlementModuleKey[] = [
  ...CES_EXPERIENCE_MODULE_IDS,
];

export function getEntitlementModuleLabel(key: string): string {
  return getCanonicalCapabilityLabel(key);
}

export function normalizeModuleList(
  values: readonly string[] | null | undefined,
): EntitlementModuleKey[] {
  if (!values) return [];
  const out: EntitlementModuleKey[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const key = canonicalizeEntitlementModule(String(raw));
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

export function rejectUnknownModules(values: readonly string[]): string[] {
  return values.filter((v) => !isKnownEntitlementModule(String(v)));
}

export function getEntitlementDefinition(
  raw: string,
): EntitlementModuleDefinition | undefined {
  const key = canonicalizeEntitlementModule(raw);
  if (!key) return undefined;
  const canonical = getCanonicalCapability(key);
  if (!canonical) return undefined;
  return {
    key: canonical.key,
    label: canonical.label,
    category: toEntitlementCategory(canonical.kind),
    internalOnly: canonical.internalOnly || undefined,
    aliases: canonical.aliases ? [...canonical.aliases] : undefined,
  };
}
