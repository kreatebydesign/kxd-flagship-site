import type { CollectionConfig } from "payload";
import { isAuthenticated, isPayloadAdminUser } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";
import { auditConnectOrganizationChangeHook } from "../hooks/connect-organizations.ts";

/**
 * Phase 6 Batch C0 — Connect organization (tenant) foundation.
 *
 * Distinct from Clients, portal accounts, Connected Workspace, and
 * Client Communications. Owns future Connect data for one organization.
 * Operator-managed only — never publicly discoverable.
 */
export const ConnectOrganizations: CollectionConfig = {
  slug: "connect-organizations",
  labels: {
    singular: "Connect Organization",
    plural: "Connect Organizations",
  },
  defaultSort: "name",
  lockDocuments: false,
  hooks: {
    afterChange: [auditConnectOrganizationChangeHook],
  },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "key", "status", "updatedAt"],
    group: PAYLOAD_GROUPS.system,
    description:
      "KXD Connect organization tenant. Not a Client record. " +
      "Stable key identifies the organization for Connect-owned data. " +
      "Never publicly enumerable.",
  },
  access: {
    // Studio operators only. Portal JWTs and anonymous callers denied.
    read: isAuthenticated,
    create: isPayloadAdminUser,
    update: isPayloadAdminUser,
    delete: isPayloadAdminUser,
  },
  fields: [
    {
      name: "key",
      type: "text",
      required: true,
      unique: true,
      index: true,
      label: "Organization key",
      admin: {
        description:
          "Stable lowercase identifier (e.g. kxd). Prefer this over sequential id for operator references.",
      },
    },
    {
      name: "name",
      type: "text",
      required: true,
      label: "Display name",
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "inactive",
      label: "Status",
      options: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
      admin: {
        position: "sidebar",
        description: "Inactive organizations cannot use Connect even if allowlisted.",
      },
    },
    {
      name: "config",
      type: "json",
      label: "Configuration hooks",
      admin: {
        description:
          "Reserved for future branding/configuration hooks. Not a white-label admin surface in C0.",
      },
    },
    {
      name: "notes",
      type: "textarea",
      label: "Operator notes",
      admin: {
        description: "Internal notes. Never shown to portal users.",
      },
    },
  ],
};
