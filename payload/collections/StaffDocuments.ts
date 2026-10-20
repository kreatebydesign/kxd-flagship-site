import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const StaffDocuments: CollectionConfig = {
  slug: "staff-documents",
  labels: { singular: "Staff Document", plural: "Staff Documents" },
  defaultSort: "-createdAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "staffUser", "status", "kind", "createdAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Assigned staff policy acknowledgments. Access via KXD OS staff surfaces only.",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: "staffUser",
      type: "relationship",
      relationTo: "users",
      required: true,
      index: true,
      admin: { position: "sidebar" },
    },
    {
      name: "template",
      type: "relationship",
      relationTo: "staff-document-templates" as "users",
      admin: { position: "sidebar" },
    },
    { name: "templateVersion", type: "number", required: true, defaultValue: 1 },
    { name: "templateContentHash", type: "text", required: true, index: true },
    { name: "title", type: "text", required: true },
    {
      name: "kind",
      type: "select",
      required: true,
      defaultValue: "policy-acknowledgment",
      options: [{ label: "Policy acknowledgment", value: "policy-acknowledgment" }],
      admin: { position: "sidebar" },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "assigned",
      options: [
        { label: "Assigned", value: "assigned" },
        { label: "Acknowledged", value: "acknowledged" },
        { label: "Revoked", value: "revoked" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "legalEntityName",
      type: "text",
      label: "Legal entity",
      required: true,
    },
    {
      name: "bodySnapshot",
      type: "textarea",
      required: true,
      label: "Frozen policy body",
      admin: { description: "Immutable snapshot at assignment time." },
    },
    {
      name: "acknowledgment",
      type: "json",
      label: "Acknowledgment evidence",
      admin: { readOnly: true },
    },
    {
      name: "acknowledgedAt",
      type: "date",
      admin: { date: { pickerAppearance: "dayAndTime" }, position: "sidebar" },
    },
    {
      name: "auditEvents",
      type: "json",
      label: "Audit trail",
      admin: { readOnly: true },
    },
  ],
};
