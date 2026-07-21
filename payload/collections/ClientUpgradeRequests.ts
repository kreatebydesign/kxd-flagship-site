import type { CollectionConfig } from "payload";
import { isPayloadAdminUser } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const ClientUpgradeRequests: CollectionConfig = {
  slug: "client-upgrade-requests",
  labels: {
    singular: "Client Upgrade Request",
    plural: "Client Upgrade Requests",
  },
  defaultSort: "-createdAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "moduleLabel",
    defaultColumns: [
      "moduleLabel",
      "client",
      "status",
      "requesterEmail",
      "createdAt",
    ],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Portal upgrade requests for capabilities not currently entitled. Approval does not grant access — use Plans & Access.",
  },
  // Portal users authenticate as portal-users and must not reach this collection
  // via Payload REST/GraphQL. Portal create/list/cancel uses dedicated routes
  // that call the service with overrideAccess after session ownership checks.
  access: {
    read: isPayloadAdminUser,
    create: isPayloadAdminUser,
    update: isPayloadAdminUser,
    delete: isPayloadAdminUser,
  },
  fields: [
    {
      name: "client",
      type: "relationship",
      relationTo: "clients",
      required: true,
      index: true,
      label: "Client",
    },
    {
      name: "portalUser",
      type: "relationship",
      relationTo: "portal-users",
      label: "Portal User",
      admin: {
        description: "Requesting portal user when available.",
      },
    },
    {
      name: "requesterName",
      type: "text",
      label: "Requester Name",
    },
    {
      name: "requesterEmail",
      type: "email",
      label: "Requester Email",
    },
    {
      name: "moduleKey",
      type: "text",
      required: true,
      index: true,
      label: "Module Key",
      admin: {
        description: "Canonical entitlement module key.",
      },
    },
    {
      name: "moduleLabel",
      type: "text",
      required: true,
      label: "Module Label",
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "submitted",
      index: true,
      options: [
        { label: "Submitted", value: "submitted" },
        { label: "Reviewing", value: "reviewing" },
        { label: "Approved", value: "approved" },
        { label: "Declined", value: "declined" },
        { label: "Canceled", value: "canceled" },
      ],
      admin: {
        description:
          "Approved means the business decision is accepted — it does not enable the module. Grant access in Plans & Access.",
      },
    },
    {
      name: "clientMessage",
      type: "textarea",
      label: "Client Message",
    },
    {
      name: "operatorNote",
      type: "textarea",
      label: "Operator Note (Internal)",
      admin: {
        description: "Internal only. Never shown in the client portal.",
      },
    },
    {
      name: "sourceSurface",
      type: "text",
      label: "Source Surface",
      admin: {
        description: "Portal surface that originated the request.",
      },
    },
    {
      name: "entitlementSnapshot",
      type: "json",
      label: "Entitlement Snapshot",
      admin: {
        description:
          "Plan/access context at request time for operator diagnostics.",
      },
    },
    {
      name: "reviewedAt",
      type: "date",
      label: "Reviewed At",
      admin: {
        date: { pickerAppearance: "dayAndTime" },
      },
    },
    {
      name: "reviewedBy",
      type: "text",
      label: "Reviewed By",
    },
  ],
};
