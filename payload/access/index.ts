import type { Access, PayloadRequest } from "payload";

/**
 * Payload admin (`users` collection only).
 * Portal users, junior creators, and other auth collections must never pass.
 * Do not accept missing `collection` — forged or legacy tokens without a
 * collection claim are denied.
 */
export function isPayloadAdmin(
  user: PayloadRequest["user"],
): boolean {
  if (!user) return false;
  return user.collection === "users";
}

/**
 * Historical name used across KXD OS collections for REST/LocalAPI access.
 * Intentionally admin-only — a portal-users JWT must never satisfy this.
 * Prefer `isPayloadAdminUser` in new collections.
 */
export const isAuthenticated: Access = ({ req: { user } }) =>
  isPayloadAdmin(user);

export const isPayloadAdminUser: Access = ({ req: { user } }) =>
  isPayloadAdmin(user);

export const isAuthenticatedOrPublished: Access = ({ req: { user } }) => {
  if (isPayloadAdmin(user)) return true;
  return {
    status: {
      equals: "published",
    },
  };
};

export const publicRead: Access = () => true;

export const publicCreate: Access = () => true;

export const denyAll: Access = () => false;
