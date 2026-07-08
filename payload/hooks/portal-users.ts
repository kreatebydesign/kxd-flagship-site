import type { CollectionBeforeChangeHook, CollectionBeforeValidateHook } from "payload";
import { ValidationError } from "payload";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

/** Ensures portal login email matches payload.login lowercase lookup */
export const normalizePortalUserEmailHook: CollectionBeforeValidateHook = ({ data, operation }) => {
  if (!data || typeof data !== "object") return data;

  const email = (data as AnyDoc).email;
  if (typeof email === "string" && email.trim()) {
    (data as AnyDoc).email = email.trim().toLowerCase();
  }

  return data;
};

/**
 * Portal users must have a password set at creation time.
 * Payload only hashes credentials when `password` is present on create/update —
 * admin-created accounts without a password field leave hash/salt null and login fails.
 */
export const requirePortalUserPasswordOnCreateHook: CollectionBeforeChangeHook = ({
  data,
  operation,
}) => {
  if (operation !== "create" || !data) return data;

  const password = (data as AnyDoc).password;
  if (typeof password === "string" && password.trim().length >= 8) {
    return data;
  }

  throw new ValidationError({
    collection: "portal-users",
    errors: [
      {
        path: "password",
        message:
          "A password (8+ characters) is required when creating a portal user. " +
          "For local dev, use: npm run seed:portal-user",
      },
    ],
  });
};
