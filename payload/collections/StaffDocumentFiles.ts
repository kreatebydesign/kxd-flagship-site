import type { CollectionConfig } from "payload";
import {
  staffHrDocumentDenyMutation,
  staffHrDocumentReadAccess,
} from "../access/staff-hr-documents.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const StaffDocumentFiles: CollectionConfig = {
  slug: "staff-document-files",
  labels: { singular: "Staff document file", plural: "Staff document files" },
  defaultSort: "-createdAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "kind", "staffDocument", "staffUser", "createdAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Private staff document PDFs — download via authorized KXD OS API routes only (read-only in Admin).",
  },
  access: {
    read: staffHrDocumentReadAccess,
    create: staffHrDocumentDenyMutation,
    update: staffHrDocumentDenyMutation,
    delete: staffHrDocumentDenyMutation,
  },
  fields: [
    { name: "title", type: "text", required: true },
    {
      name: "kind",
      type: "select",
      required: true,
      options: [
        { label: "Policy PDF", value: "policy-pdf" },
        { label: "Acknowledgment record", value: "acknowledgment-record" },
        { label: "Executed agreement", value: "executed-agreement" },
      ],
    },
    {
      name: "staffDocument",
      type: "relationship",
      relationTo: "staff-documents" as "users",
      required: true,
      index: true,
    },
    {
      name: "staffUser",
      type: "relationship",
      relationTo: "users",
      required: true,
      index: true,
      admin: { position: "sidebar" },
    },
    { name: "contentHash", type: "text", required: true, index: true },
    {
      name: "storageKey",
      type: "text",
      required: true,
      admin: { description: "Never expose as a public URL." },
    },
    {
      name: "storageProvider",
      type: "select",
      defaultValue: "local",
      options: [
        { label: "Local", value: "local" },
        { label: "Vercel Blob", value: "vercel-blob" },
      ],
    },
    { name: "mimeType", type: "text", required: true, defaultValue: "application/pdf" },
    { name: "byteLength", type: "number" },
  ],
};
