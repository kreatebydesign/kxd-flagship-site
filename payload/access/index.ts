import type { Access, PayloadRequest } from "payload";

/**
 * Payload admin (`users` collection only).
 * Portal users, junior creators, and other auth collections must never pass.
 * Do not accept missing `collection` — forged or legacy tokens without a
 * collection claim are denied.
 *
 * Note: this only asserts collection identity. Restricted staff still match.
 * Use `isStudioPayloadOperator` for collection/global data-plane access.
 */
export function isPayloadAdmin(
  user: PayloadRequest["user"],
): boolean {
  if (!user) return false;
  return user.collection === "users";
}

/**
 * Restricted staff roles that must never enter Payload collection/global
 * administration or REST/Local API (except via server services with
 * `overrideAccess: true`).
 */
const RESTRICTED_STAFF_ROLES = new Set([
  "operations_coordinator",
  "executive_operations_coordinator",
  "operations_manager",
]);

/**
 * Pure Payload-user check — mirrors lib/staff `isRestrictedStaff` without
 * importing server-only modules (safe in collection access + verify scripts).
 * Admin Payload role always retains studio operator access.
 */
export function isRestrictedStaffPayloadUser(
  user: PayloadRequest["user"],
): boolean {
  if (!isPayloadAdmin(user)) return false;
  const role = Reflect.get(user as object, "role");
  if (role === "admin") return false;
  const staffRole = Reflect.get(user as object, "staffRole");
  return typeof staffRole === "string" && RESTRICTED_STAFF_ROLES.has(staffRole);
}

/**
 * Studio operators who may use Payload Admin collection/global data APIs.
 * Portal JWTs and restricted staff are denied.
 */
export function isStudioPayloadOperator(
  user: PayloadRequest["user"],
): boolean {
  return isPayloadAdmin(user) && !isRestrictedStaffPayloadUser(user);
}

/**
 * Panel entry for the auth `users` collection `access.admin` check.
 *
 * Restricted staff MUST pass this so login can complete and our server
 * redirect can send them to Staff Home/Welcome. Denying here strands them
 * on Payload's "You do not have access to this page" after a valid login.
 *
 * Collection/global REST and LocalAPI data remain deny-by-default via
 * `isStudioPayloadOperator` / `isAuthenticated`.
 */
export function canEnterPayloadAdminPanel(
  user: PayloadRequest["user"],
): boolean {
  return isPayloadAdmin(user);
}

/**
 * Historical name used across KXD OS collections for REST/LocalAPI access.
 * Studio operators only — portal JWTs and restricted staff must never pass.
 * Prefer `isPayloadAdminUser` / `isStudioPayloadOperator` in new collections.
 */
export const isAuthenticated: Access = ({ req: { user } }) =>
  isStudioPayloadOperator(user);

export const isPayloadAdminUser: Access = ({ req: { user } }) =>
  isStudioPayloadOperator(user);

export const isAuthenticatedOrPublished: Access = ({ req: { user } }) => {
  if (isStudioPayloadOperator(user)) return true;
  return {
    status: {
      equals: "published",
    },
  };
};

export const publicRead: Access = () => true;

export const publicCreate: Access = () => true;

export const denyAll: Access = () => false;
