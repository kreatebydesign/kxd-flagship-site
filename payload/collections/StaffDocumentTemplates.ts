import type { CollectionConfig } from "payload";
import {
  staffHrDocumentDenyMutation,
  staffHrDocumentReadAccess,
} from "../access/staff-hr-documents.ts";
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
    defaultColumns: ["title", "kind", "signingMode", "status", "version", "updatedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "HR/staff templates — KXD OS operator workspace (read-only in Admin; mutations via KXD OS).",
  },
  access: {
    read: staffHrDocumentReadAccess,
    create: staffHrDocumentDenyMutation,
    update: staffHrDocumentDenyMutation,
    delete: staffHrDocumentDenyMutation,
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
      options: [
        { label: "Policy acknowledgment", value: "policy-acknowledgment" },
        { label: "Staff policy", value: "staff-policy" },
        { label: "Employment agreement", value: "employment-agreement" },
        { label: "Confidentiality / NDA", value: "confidentiality-nda" },
        { label: "IP assignment", value: "ip-assignment" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "signingMode",
      type: "select",
      required: true,
      defaultValue: "acknowledgment",
      options: [
        { label: "Acknowledgment", value: "acknowledgment" },
        { label: "Dual signature", value: "dual-signature" },
      ],
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
    {
      name: "isSample",
      type: "checkbox",
      label: "QA sample (non-assignable in production)",
      defaultValue: false,
      admin: { position: "sidebar" },
    },
    {
      name: "familyKey",
      type: "text",
      label: "Template family key",
      index: true,
      admin: { readOnly: true, position: "sidebar" },
    },
    {
      name: "createdBy",
      type: "text",
      label: "Created by",
      admin: { readOnly: true, position: "sidebar" },
    },
    {
      name: "legalReviewSubmittedAt",
      type: "date",
      admin: { date: { pickerAppearance: "dayAndTime" }, position: "sidebar" },
    },
    {
      name: "legalReviewSubmittedBy",
      type: "text",
      admin: { position: "sidebar" },
    },
    {
      name: "supersedesTemplate",
      type: "relationship",
      relationTo: "staff-document-templates",
      admin: { position: "sidebar" },
    },
  ],
};
