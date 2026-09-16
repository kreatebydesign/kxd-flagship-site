/**
 * @deprecated Mission 01 — NOT the canonical client launch path.
 * Use Client Launch Wizard (`lib/client-launch-wizard` /
 * `/admin/operations/client-launch`). This engine creates portal users with
 * temporary passwords and skips canonical memberships/invitations.
 * Quarantined: keep for historical reference; do not extend.
 */
export type {
  ProvisioningPayload,
  ProvisioningOutcome,
  ProvisioningResult,
  ProvisioningFailure,
  ProvisioningPackageId,
  ProvisioningStepId,
  ProvisionLogEntry,
} from "./types";

/** @deprecated Prefer Launch Wizard. */
export { PROVISIONING_STEPS, PROVISIONING_ESTIMATE_TOTAL_SECONDS } from "./constants";
/** @deprecated Prefer Launch Wizard. */
export { emptyProvisioningPayload } from "./empty";
/** @deprecated Prefer Launch Wizard. */
export { validateProvisioningPayload } from "./validate";
/** @deprecated Prefer Launch Wizard. */
export {
  PROVISIONING_MODULE_CATALOG,
  groupProvisioningModules,
} from "./modules/catalog";
/** @deprecated Prefer Launch Wizard. */
export {
  listProvisioningPackages,
  resolveModulesForPackage,
  resolvePersistableEntitlements,
} from "./packages/resolve";

export const CLIENT_PROVISIONING_ENGINE_QUARANTINED = true as const;
export const CLIENT_PROVISIONING_CANONICAL_PATH =
  "/admin/operations/client-launch" as const;
