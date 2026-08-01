import type { CollectionConfig } from "payload";
import { isAuthenticated, isPayloadAdminUser } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

/**
 * Phase 4 Batch I — append-only security audit trail (no secrets).
 */
export const PortalSecurityEvents: CollectionConfig = {
  slug: "portal-security-events",
  labels: { singular: "Portal Security Event", plural: "Portal Security Events" },
  defaultSort: "-createdAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "summary",
    defaultColumns: ["type", "actorKind", "summary", "createdAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description: "Operator-only security audit events. Never store tokens, secrets, or codes.",
  },
  access: {
    read: isAuthenticated,
    create: isPayloadAdminUser,
    update: () => false,
    delete: isPayloadAdminUser,
  },
  fields: [
    {
      name: "type",
      type: "text",
      required: true,
      index: true,
    },
    {
      name: "actorKind",
      type: "select",
      required: true,
      defaultValue: "system",
      options: [
        { label: "Portal user", value: "portal-user" },
        { label: "Operator", value: "operator" },
        { label: "System", value: "system" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "actorPortalUserId",
      type: "number",
      label: "Actor portal user ID",
    },
    {
      name: "actorOperatorUserId",
      type: "number",
      label: "Actor operator user ID",
    },
    {
      name: "summary",
      type: "text",
      required: true,
    },
    {
      name: "metadata",
      type: "json",
      label: "Metadata (no secrets)",
    },
  ],
};
