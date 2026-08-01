import type { CollectionConfig } from "payload";
import { isAuthenticated, isPayloadAdminUser } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

/**
 * Phase 4 Batch I — per-portal-user MFA settings (1:1).
 * TOTP secrets encrypted at rest (PORTAL_MFA_ENCRYPTION_KEY).
 */
export const PortalMfaSettings: CollectionConfig = {
  slug: "portal-mfa-settings",
  labels: { singular: "Portal MFA Setting", plural: "Portal MFA Settings" },
  defaultSort: "-updatedAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "id",
    defaultColumns: ["portalUser", "totpEnabled", "preferredMethod", "enrolledAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description: "TOTP MFA settings. Secrets are AES-GCM encrypted. Never shown in portal REST.",
  },
  access: {
    read: isAuthenticated,
    create: isPayloadAdminUser,
    update: isPayloadAdminUser,
    delete: isPayloadAdminUser,
  },
  fields: [
    {
      name: "portalUser",
      type: "relationship",
      relationTo: "portal-users",
      required: true,
      unique: true,
      index: true,
      admin: { position: "sidebar" },
    },
    {
      name: "totpSecretEncrypted",
      type: "text",
      label: "Encrypted TOTP secret",
      access: {
        read: ({ req: { user } }) => Boolean(user && user.collection === "users"),
        update: ({ req: { user } }) => Boolean(user && user.collection === "users"),
      },
      admin: {
        description: "AES-256-GCM ciphertext. Requires PORTAL_MFA_ENCRYPTION_KEY.",
      },
    },
    {
      name: "totpEnabled",
      type: "checkbox",
      defaultValue: false,
      label: "TOTP enabled",
      admin: { position: "sidebar" },
    },
    {
      name: "enrolledAt",
      type: "date",
      admin: { date: { pickerAppearance: "dayAndTime" }, position: "sidebar" },
    },
    {
      name: "preferredMethod",
      type: "select",
      defaultValue: "password",
      options: [
        { label: "Password", value: "password" },
        { label: "Passkey", value: "passkey" },
      ],
      admin: { position: "sidebar" },
    },
  ],
};
