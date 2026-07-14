import type { Access, PayloadRequest } from "payload";

export const isAuthenticated: Access = ({ req: { user } }) => Boolean(user);

/**
 * Payload admin (`users` collection only).
 * Portal users and other auth collections must never pass this check.
 * Legacy admin JWTs may omit `collection` — still accepted when no collection is tagged.
 */
export function isPayloadAdmin(
  user: PayloadRequest["user"],
): boolean {
  if (!user) return false;
  if (user.collection === "portal-users") return false;
  return user.collection === "users" || user.collection === undefined;
}

export const isPayloadAdminUser: Access = ({ req: { user } }) => isPayloadAdmin(user);

export const isAuthenticatedOrPublished: Access = ({ req: { user } }) => {
  if (user) return true;
  return {
    status: {
      equals: "published",
    },
  };
};

export const publicRead: Access = () => true;

export const publicCreate: Access = () => true;

export const denyAll: Access = () => false;
