import type { CollectionConfig } from "payload";
import { isAuthenticated, isPayloadAdminUser } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

/**
 * Phase 6 Batch C0 — Connect security-sensitive audit trail.
 * Append-only. Not the Activity Engine. Not a private message store.
 */
export const ConnectAuditEvents: CollectionConfig = {
  slug: "connect-audit-events",
  labels: {
    singular: "Connect Audit Event",
    plural: "Connect Audit Events",
  },
  defaultSort: "-createdAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "type",
    defaultColumns: ["type", "organization", "actorKind", "summary", "createdAt"],
    group: PAYLOAD_GROUPS.system,
    description:
      "Append-only Connect audit events for organization, membership, enablement, and meter corrections.",
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
      type: "select",
      required: true,
      index: true,
      label: "Type",
      options: [
        { label: "Organization created", value: "organization.created" },
        { label: "Organization activated", value: "organization.activated" },
        { label: "Organization deactivated", value: "organization.deactivated" },
        { label: "Membership created", value: "membership.created" },
        { label: "Membership role changed", value: "membership.role_changed" },
        { label: "Membership disabled", value: "membership.disabled" },
        { label: "Connect enabled", value: "connect.enabled" },
        { label: "Connect disabled", value: "connect.disabled" },
        { label: "Meter adjusted", value: "meter.adjusted" },
      ],
    },
    {
      name: "organization",
      type: "relationship",
      relationTo: "connect-organizations",
      index: true,
      label: "Organization",
      admin: { position: "sidebar" },
    },
    {
      name: "actorKind",
      type: "select",
      required: true,
      defaultValue: "system",
      label: "Actor kind",
      options: [
        { label: "Operator", value: "operator" },
        { label: "System", value: "system" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "actorOperatorUserId",
      type: "number",
      label: "Actor operator user id",
      admin: {
        position: "sidebar",
        description: "Numeric soft reference — survives actor deletion.",
      },
    },
    {
      name: "summary",
      type: "text",
      required: true,
      label: "Summary",
    },
    {
      name: "metadata",
      type: "json",
      label: "Metadata",
      admin: {
        description:
          "Non-sensitive structured metadata only. Never message bodies or secrets.",
      },
    },
  ],
};
