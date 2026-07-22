/**
 * Phase 35A — Client Plans & Entitlements (Shared Core).
 *
 * Architecture:
 *   Launch package presets (commercial module lists)
 *           ↓
 *   lib/client-plans catalog (+ CES portal extensions)
 *           ↓
 *   clients.planKey / planStatus / addOns / removed
 *           ↓
 *   resolveClientEntitlements()
 *           ↓
 *   CES enabledModules sync (explicit plans) + resolveExperienceProfile gate
 *           ↓
 *   Portal nav + requireCesModule (via filtered profile)
 *
 * Legacy policy: planKey null OR planStatus=legacy → effective = existing CES
 * enabledModules. Existing portals keep access after migration.
 *
 * Precedence: paused → empty; legacy → CES; custom → add-ons − removed;
 * standard → (base ∪ add-ons) − removed. Removed always wins.
 * Internal-only keys never become portal-effective.
 *
 * Not in this phase: Stripe billing, public prices, full rewrite of every
 * admin script that mutates enabledModules directly.
 */

export type {
  ClientPlanKey,
  ClientPlanStatus,
  ClientPlanDefinition,
  ClientPlanAssignment,
  ResolvedClientEntitlements,
  EntitlementModuleKey,
  UpdateClientPlanInput,
} from "./types";

export {
  CLIENT_PLAN_CATALOG,
  getClientPlanDefinition,
  listClientPlans,
  isClientPlanKey,
  baseModulesForPlan,
  getPlanOrder,
  classifyPlanChange,
  type PlanChangeClassification,
} from "./catalog";

export {
  ENTITLEMENT_MODULE_REGISTRY,
  canonicalizeEntitlementModule,
  isKnownEntitlementModule,
  isInternalOnlyEntitlement,
  normalizeModuleList,
  rejectUnknownModules,
  getEntitlementModuleLabel,
  PORTAL_CES_ENTITLEMENT_KEYS,
} from "./modules";

export {
  computeEffectiveModules,
  resolveEntitlementsFromAssignment,
  clientHasModule,
} from "./resolve";

export {
  resolveClientEntitlements,
  clientHasEntitlement,
  requireClientEntitlement,
  ClientEntitlementError,
  assignmentFromClientDoc,
} from "./data";

export {
  updateClientPlanAssignment,
  assignPlanOnClientCreate,
} from "./update";

export {
  derivePlanOverridesFromSelection,
  type DerivedPlanOverrides,
} from "./derive";

export {
  parseRouteClientId,
  rejectBodyClientIdMismatch,
  rejectInvalidOverrideModules,
  shouldSyncCesEnabledModules,
  buildPlanAccessActivityChanges,
  planUpdateErrorMessage,
} from "./validate";
