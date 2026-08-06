import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

/**
 * Private commercial agreement artifact registry.
 * Files via local (dev) or Vercel Blob (production) adapters.
 * Downloads only via authorized API routes — never raw storage URLs.
 */
export const CommercialDocuments: CollectionConfig = {
  slug: "commercial-documents",
  labels: { singular: "Commercial document", plural: "Commercial documents" },
  defaultSort: "-generatedAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "kind", "contract", "client", "generatedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Executed proposal/contract PDFs and certificates. Private storage — never public/media.",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    { name: "title", type: "text", required: true },
    {
      name: "kind",
      type: "select",
      required: true,
      options: [
        { label: "Accepted Proposal", value: "accepted-proposal" },
        { label: "Direct Agreement (sent)", value: "direct-agreement" },
        { label: "Executed Contract", value: "executed-contract" },
        { label: "Execution Certificate", value: "certificate" },
        { label: "Billing Terms Summary", value: "billing-summary" },
        { label: "Package Manifest", value: "package-manifest" },
        { label: "Invoice (future PDF)", value: "invoice" },
        { label: "Receipt (future PDF)", value: "receipt" },
        { label: "Authorization Evidence", value: "authorization-evidence" },
      ],
    },
    { name: "proposal", type: "relationship", relationTo: "proposals" },
    {
      name: "contract",
      type: "relationship",
      relationTo: "contracts",
      required: true,
    },
    {
      name: "client",
      type: "relationship",
      relationTo: "clients",
      admin: {
        description:
          "Required on all new Direct Agreement filing paths. Legacy rows may be empty.",
      },
    },
    { name: "version", type: "number", required: true, defaultValue: 1 },
    { name: "contentHash", type: "text", required: true, index: true },
    {
      name: "storageKey",
      type: "text",
      required: true,
      admin: {
        description: "Storage key — never expose as a public URL.",
      },
    },
    {
      name: "storageProvider",
      type: "select",
      defaultValue: "local",
      options: [
        { label: "Local", value: "local" },
        { label: "Vercel Blob", value: "vercel-blob" },
      ],
      admin: {
        description: "local for development; vercel-blob for production writes.",
      },
    },
    { name: "mimeType", type: "text", required: true, defaultValue: "application/pdf" },
    { name: "byteLength", type: "number" },
    { name: "sourceSnapshotRef", type: "text" },
    {
      name: "lineageParent",
      type: "relationship",
      relationTo: "commercial-documents",
    },
    {
      name: "executionStatus",
      type: "select",
      defaultValue: "draft",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Accepted", value: "accepted" },
        { label: "Executed", value: "executed" },
        { label: "Superseded", value: "superseded" },
        { label: "Voided", value: "voided" },
      ],
    },
    {
      name: "generatedAt",
      type: "date",
      required: true,
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
    {
      name: "sentAt",
      type: "date",
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
    {
      name: "acceptedAt",
      type: "date",
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
    { name: "partyNames", type: "json" },
  ],
};
