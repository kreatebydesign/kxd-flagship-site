import type { CollectionConfig } from "payload";
import { isStudioPayloadOperator } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

/**
 * Explicit client scope for restricted staff (e.g. Business Development & Digital).
 * Operators assign; staff never self-grant.
 */
export const StaffClientAssignments: CollectionConfig = {
  slug: "staff-client-assignments",
  labels: {
    singular: "Staff Client Assignment",
    plural: "Staff Client Assignments",
  },
  defaultSort: "-updatedAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "id",
    defaultColumns: ["staffUser", "client", "active", "updatedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Maps internal staff to clients they may access. Required for business_development_specialist.",
  },
  access: {
    read: ({ req: { user } }) => isStudioPayloadOperator(user),
    create: ({ req: { user } }) => isStudioPayloadOperator(user),
    update: ({ req: { user } }) => isStudioPayloadOperator(user),
    delete: ({ req: { user } }) => isStudioPayloadOperator(user),
  },
  fields: [
    {
      name: "staffUser",
      type: "relationship",
      relationTo: "users",
      required: true,
      label: "Staff member",
    },
    {
      name: "client",
      type: "relationship",
      relationTo: "clients",
      required: true,
      label: "Client",
    },
    {
      name: "active",
      type: "checkbox",
      defaultValue: true,
      admin: { position: "sidebar" },
    },
    {
      name: "assignedBy",
      type: "relationship",
      relationTo: "users",
      required: false,
      admin: {
        position: "sidebar",
        description: "Operator who created or last authorized this assignment.",
      },
    },
    {
      name: "notes",
      type: "textarea",
      admin: {
        description: "Internal scope notes — not shown to staff.",
      },
    },
  ],
};
