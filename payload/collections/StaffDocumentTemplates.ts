import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const StaffDocumentTemplates: CollectionConfig = {
  slug: "staff-document-templates",
  labels: {
    singular: "Staff Document Template",
    plural: "Staff Document Templates",
  },
  defaultSort: "-updatedAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "kind", "status", "version", "updatedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "HR/staff policy templates — Release A: policy-acknowledgment only. KXD OS operator workspace.",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "slug", type: "text", index: true },
    { name: "version", type: "number", required: true, defaultValue: 1 },
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
      defaultValue: "draft",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Legal review", value: "legal-review" },
        { label: "Approved for use", value: "approved-for-use" },
        { label: "Retired", value: "retired" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "legalEntityName",
      type: "text",
      label: "Legal entity name",
      defaultValue: "Kreate by Design LLC",
      admin: {
        description: "Confirm exact registered legal name before production use.",
      },
    },
    { name: "body", type: "textarea", required: true, label: "Policy body" },
    {
      name: "contentHash",
      type: "text",
      label: "Content hash",
      admin: { readOnly: true },
    },
    {
      name: "approvedAt",
      type: "date",
      admin: { date: { pickerAppearance: "dayAndTime" }, position: "sidebar" },
    },
    { name: "approvedBy", type: "text", admin: { position: "sidebar" } },
  ],
};
