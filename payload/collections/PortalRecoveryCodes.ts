import type { CollectionConfig } from "payload";
import { isAuthenticated, isPayloadAdminUser } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

/**
 * Phase 4 Batch I — hashed one-time recovery codes.
 */
export const PortalRecoveryCodes: CollectionConfig = {
  slug: "portal-recovery-codes",
  labels: { singular: "Portal Recovery Code", plural: "Portal Recovery Codes" },
  defaultSort: "-createdAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "batchId",
    defaultColumns: ["portalUser", "batchId", "usedAt", "createdAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description: "Hashed recovery codes only. Plaintext shown once at generation.",
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
      name: "codeHash",
      type: "text",
      required: true,
      label: "Code hash",
      access: {
        read: ({ req: { user } }) => Boolean(user && user.collection === "users"),
      },
    },
    {
      name: "usedAt",
      type: "date",
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
    {
      name: "batchId",
      type: "text",
      required: true,
      index: true,
    },
  ],
};
