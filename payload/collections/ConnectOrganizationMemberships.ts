import type { CollectionConfig } from "payload";
import { isAuthenticated, isPayloadAdminUser } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";
import {
  auditConnectMembershipChangeHook,
  rejectInvalidConnectMembershipHook,
} from "../hooks/connect-organization-memberships.ts";

/**
 * Phase 6 Batch C0 — Connect organization membership foundation.
 *
 * Associates an authenticated identity with a Connect organization.
 * Portal client membership alone never implies Connect membership.
 * Unique per (organization, subject) — no duplicate active rows.
 */
export const ConnectOrganizationMemberships: CollectionConfig = {
  slug: "connect-organization-memberships",
  labels: {
    singular: "Connect Organization Membership",
    plural: "Connect Organization Memberships",
  },
  defaultSort: "-updatedAt",
  lockDocuments: false,
  hooks: {
    beforeChange: [rejectInvalidConnectMembershipHook],
    afterChange: [auditConnectMembershipChangeHook],
  },
  admin: {
    useAsTitle: "id",
    defaultColumns: [
      "organization",
      "subjectKind",
      "role",
      "status",
      "updatedAt",
    ],
    group: PAYLOAD_GROUPS.system,
    description:
      "Links a staff or portal identity to a Connect organization. " +
      "C0 dogfood uses staff identities only. " +
      "Does not grant portal Client access and is not created from Client records.",
  },
  access: {
    read: isAuthenticated,
    create: isPayloadAdminUser,
    update: isPayloadAdminUser,
    delete: isPayloadAdminUser,
  },
  fields: [
    {
      name: "organization",
      type: "relationship",
      relationTo: "connect-organizations",
      required: true,
      index: true,
      label: "Organization",
      admin: { position: "sidebar" },
    },
    {
      name: "subjectKind",
      type: "select",
      required: true,
      label: "Subject kind",
      options: [
        { label: "Staff user", value: "staff-user" },
        { label: "Portal user", value: "portal-user" },
      ],
      admin: {
        position: "sidebar",
        description: "C0 enablement paths use staff-user only.",
      },
    },
    {
      name: "staffUser",
      type: "relationship",
      relationTo: "users",
      index: true,
      label: "Staff user",
      admin: {
        condition: (_, siblingData) => siblingData?.subjectKind === "staff-user",
        description: "Required when subject kind is staff-user.",
      },
    },
    {
      name: "portalUser",
      type: "relationship",
      relationTo: "portal-users",
      index: true,
      label: "Portal user",
      admin: {
        condition: (_, siblingData) => siblingData?.subjectKind === "portal-user",
        description:
          "Schema support for future external participants. Not used for C0 dogfood enablement.",
      },
    },
    {
      name: "role",
      type: "select",
      required: true,
      defaultValue: "organization-member",
      label: "Role",
      options: [
        { label: "Platform operator", value: "platform-operator" },
        { label: "Organization admin", value: "organization-admin" },
        { label: "Organization member", value: "organization-member" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "active",
      label: "Status",
      options: [
        { label: "Active", value: "active" },
        { label: "Disabled", value: "disabled" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "notes",
      type: "textarea",
      label: "Operator notes",
    },
  ],
};
