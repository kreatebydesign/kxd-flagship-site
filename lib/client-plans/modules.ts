/**
 * Canonical entitlement module registry.
 * Extends existing CES + reporting keys — does not invent parallel names.
 */

import { ALL_REPORTING_CAPABILITIES } from "@/lib/reporting/domain/capabilities";
import type { EntitlementModuleDefinition, EntitlementModuleKey } from "./types";

const CES_PORTAL_MODULES: EntitlementModuleDefinition[] = [
  {
    key: "website-review",
    label: "Website Review",
    category: "portal",
    aliases: ["visual-review"],
  },
  {
    key: "website-workspace",
    label: "Website Workspace",
    category: "portal",
  },
  {
    key: "executive-performance",
    label: "Executive Performance",
    category: "portal",
  },
  {
    key: "executive-review",
    label: "Executive Review",
    category: "portal",
  },
  {
    key: "inventory",
    label: "Inventory",
    category: "portal",
    aliases: ["public-showroom"],
  },
];

const REPORTING_MODULES: EntitlementModuleDefinition[] =
  ALL_REPORTING_CAPABILITIES.map((key) => ({
    key,
    label: key
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
    category: "reporting" as const,
  }));

/** Operator/future keys — tracked for packaging, not auto-exposed to portal. */
const OPERATIONS_MODULES: EntitlementModuleDefinition[] = [
  {
    key: "client-portal",
    label: "Client Portal",
    category: "operations",
    internalOnly: true,
  },
  {
    key: "executive-workspace",
    label: "Executive Workspace",
    category: "operations",
    internalOnly: true,
  },
  {
    key: "client-provisioning",
    label: "Client Provisioning",
    category: "operations",
    internalOnly: true,
  },
  {
    key: "launch-wizard",
    label: "Launch Wizard",
    category: "operations",
    internalOnly: true,
  },
  {
    key: "communications",
    label: "Communications",
    category: "future",
  },
  {
    key: "calendar",
    label: "Calendar",
    category: "future",
  },
  {
    key: "morning-brief",
    label: "Morning Brief",
    category: "operations",
    internalOnly: true,
  },
  {
    key: "focus-mode",
    label: "Focus Mode",
    category: "operations",
    internalOnly: true,
  },
];

export const ENTITLEMENT_MODULE_REGISTRY: readonly EntitlementModuleDefinition[] = [
  ...CES_PORTAL_MODULES,
  ...REPORTING_MODULES,
  ...OPERATIONS_MODULES,
];

const KEY_SET = new Set(ENTITLEMENT_MODULE_REGISTRY.map((m) => m.key));
const ALIAS_TO_CANONICAL = new Map<string, string>();
for (const def of ENTITLEMENT_MODULE_REGISTRY) {
  for (const alias of def.aliases ?? []) {
    ALIAS_TO_CANONICAL.set(alias, def.key);
  }
}

export function canonicalizeEntitlementModule(
  raw: string,
): EntitlementModuleKey | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (KEY_SET.has(trimmed)) return trimmed;
  return ALIAS_TO_CANONICAL.get(trimmed) ?? null;
}

export function isKnownEntitlementModule(raw: string): boolean {
  return canonicalizeEntitlementModule(raw) != null;
}

export function isInternalOnlyEntitlement(raw: string): boolean {
  const key = canonicalizeEntitlementModule(raw);
  if (!key) return false;
  return Boolean(
    ENTITLEMENT_MODULE_REGISTRY.find((m) => m.key === key)?.internalOnly,
  );
}

/** Portal-visible CES module keys (never includes internal-only). */
export const PORTAL_CES_ENTITLEMENT_KEYS = CES_PORTAL_MODULES.map((m) => m.key);

export function getEntitlementModuleLabel(key: string): string {
  const canonical = canonicalizeEntitlementModule(key) ?? key;
  return (
    ENTITLEMENT_MODULE_REGISTRY.find((m) => m.key === canonical)?.label ??
    canonical
  );
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
