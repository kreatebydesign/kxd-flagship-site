import type { Access, PayloadRequest } from "payload";

export const isAuthenticated: Access = ({ req: { user } }) => Boolean(user);

/** Payload admin (`users` collection). Legacy sessions may omit `collection`. */
export function isPayloadAdmin(
  user: PayloadRequest["user"],
): boolean {
  if (!user) return false;
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
