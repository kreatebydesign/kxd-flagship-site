/**
 * Phase 35A — Client Plans & Entitlements (Shared Core).
 *
 * Authorization and packaging foundation — not cosmetic flags.
 * Launch Wizard package presets remain the commercial module source;
 * this catalog is the durable plan layer operators and portals resolve against.
 */

export type ClientPlanKey =
  | "starter"
  | "growth"
  | "premium"
  | "enterprise"
  | "custom";

export type ClientPlanStatus = "active" | "trial" | "paused" | "legacy";

/**
 * Canonical entitlement module keys.
 * CES portal modules + reporting capabilities share one namespace
 * (same convention as client-experience-profiles.enabledModules).
 */
export type EntitlementModuleKey = string;

export type EntitlementModuleDefinition = {
  key: EntitlementModuleKey;
  label: string;
  /** portal | reporting | operations | future */
  category: "portal" | "reporting" | "operations" | "future";
  /** When true, never surface in client portal even if entitled. */
  internalOnly?: boolean;
  /** Maps alias keys to the persisted entitlement id. */
  aliases?: EntitlementModuleKey[];
};

export type ClientPlanDefinition = {
  key: ClientPlanKey;
  label: string;
  description: string;
  order: number;
  /** Modules included by the plan (empty for custom). */
  includedModules: EntitlementModuleKey[];
  /** Modules commonly offered as add-ons for this plan. */
  optionalModules: EntitlementModuleKey[];
};

export type ClientPlanAssignment = {
  planKey: ClientPlanKey | null;
  planStatus: ClientPlanStatus;
  planEffectiveAt: string | null;
  planNote: string | null;
  addOnModules: EntitlementModuleKey[];
  removedModules: EntitlementModuleKey[];
};

export type EntitlementSource =
  | "plan"
  | "add-on"
  | "removed"
  | "legacy-ces"
  | "paused"
  | "custom-empty";

export type ModuleSourceEntry = {
  module: EntitlementModuleKey;
  sources: EntitlementSource[];
};

export type ResolvedClientEntitlements = {
  clientId: number;
  planKey: ClientPlanKey | null;
  planStatus: ClientPlanStatus;
  planEffectiveAt: string | null;
  planNote: string | null;
  isLegacy: boolean;
  isPaused: boolean;
  baseModules: EntitlementModuleKey[];
  addOnModules: EntitlementModuleKey[];
  removedModules: EntitlementModuleKey[];
  /** Final authorized set after precedence. */
  effectiveModules: EntitlementModuleKey[];
  /** Modules present in legacy CES profile but not in effective (diagnostics). */
  legacyModules: EntitlementModuleKey[];
  moduleSources: ModuleSourceEntry[];
  resolvedAt: string;
};

export type UpdateClientPlanInput = {
  planKey: ClientPlanKey | null;
  planStatus: ClientPlanStatus;
  planEffectiveAt?: string | null;
  planNote?: string | null;
  addOnModules?: EntitlementModuleKey[];
  removedModules?: EntitlementModuleKey[];
};
