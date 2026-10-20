import type { CollectionConfig } from "payload";
import { assertImmutableStaffDocumentPatch } from "../../lib/staff-documents/state-machine.ts";
import {
  staffHrDocumentDenyMutation,
  staffHrDocumentReadAccess,
} from "../access/staff-hr-documents.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const StaffDocuments: CollectionConfig = {
  slug: "staff-documents",
  labels: { singular: "Staff Document", plural: "Staff Documents" },
  defaultSort: "-createdAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "staffUser", "status", "kind", "signingMode", "createdAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Assigned staff policies and agreements. Mutations via KXD OS staff surfaces only (read-only in Admin).",
  },
  access: {
    read: staffHrDocumentReadAccess,
    create: staffHrDocumentDenyMutation,
    update: staffHrDocumentDenyMutation,
    delete: staffHrDocumentDenyMutation,
  },
  hooks: {
    beforeChange: [
      ({ data, originalDoc, operation }) => {
        if (operation === "update" && originalDoc) {
          assertImmutableStaffDocumentPatch(
            originalDoc as Record<string, unknown>,
            data as Record<string, unknown>,
          );
        }
      },
    ],
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
      defaultValue: "assigned",
      options: [
        { label: "Assigned", value: "assigned" },
        { label: "Acknowledged", value: "acknowledged" },
        { label: "Awaiting operator signature", value: "awaiting-operator-signature" },
        { label: "Executing (finalizing PDF)", value: "executing" },
        { label: "Executed", value: "executed" },
        { label: "Declined", value: "declined" },
        { label: "Revoked", value: "revoked" },
        { label: "Expired", value: "expired" },
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
      name: "expiresAt",
      type: "date",
      admin: { date: { pickerAppearance: "dayAndTime" }, position: "sidebar" },
    },
    {
      name: "acknowledgment",
      type: "json",
      label: "Acknowledgment evidence",
      admin: { readOnly: true },
    },
    {
      name: "employeeSignature",
      type: "json",
      label: "Employee signature evidence",
      admin: { readOnly: true },
    },
    {
      name: "operatorSignature",
      type: "json",
      label: "Operator signature evidence",
      admin: { readOnly: true },
    },
    {
      name: "acknowledgedAt",
      type: "date",
      admin: { date: { pickerAppearance: "dayAndTime" }, position: "sidebar" },
    },
    {
      name: "executedAt",
      type: "date",
      admin: { date: { pickerAppearance: "dayAndTime" }, position: "sidebar" },
    },
    {
      name: "declinedAt",
      type: "date",
      admin: { date: { pickerAppearance: "dayAndTime" }, position: "sidebar" },
    },
    { name: "declineReason", type: "text", admin: { readOnly: true } },
    {
      name: "auditEvents",
      type: "json",
      label: "Audit trail",
      admin: { readOnly: true },
    },
  ],
};
