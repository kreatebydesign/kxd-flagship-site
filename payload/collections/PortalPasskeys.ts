import type { CollectionConfig } from "payload";
import { isAuthenticated, isPayloadAdminUser } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

/**
 * Phase 4 Batch I — WebAuthn credentials for portal users.
 * Public keys only — never biometric templates.
 */
export const PortalPasskeys: CollectionConfig = {
  slug: "portal-passkeys",
  labels: { singular: "Portal Passkey", plural: "Portal Passkeys" },
  defaultSort: "-createdAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "label",
    defaultColumns: ["label", "portalUser", "deviceType", "lastUsedAt", "createdAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "WebAuthn credentials. Device biometrics (Face ID / Touch ID / Windows Hello) " +
      "stay on the device — KXD stores only credential public keys.",
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
      index: true,
      admin: { position: "sidebar" },
    },
    {
      name: "credentialId",
      type: "text",
      required: true,
      unique: true,
      index: true,
      label: "Credential ID",
    },
    {
      name: "publicKey",
      type: "textarea",
      required: true,
      label: "Public key (base64url)",
      access: {
        read: ({ req: { user } }) => Boolean(user && user.collection === "users"),
      },
    },
    {
      name: "counter",
      type: "number",
      required: true,
      defaultValue: 0,
    },
    {
      name: "transports",
      type: "json",
      label: "Transports",
    },
    {
      name: "deviceType",
      type: "text",
      label: "Device type",
    },
    {
      name: "backedUp",
      type: "checkbox",
      defaultValue: false,
      label: "Backed up",
    },
    {
      name: "label",
      type: "text",
      label: "Label",
    },
    {
      name: "lastUsedAt",
      type: "date",
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
  ],
};
