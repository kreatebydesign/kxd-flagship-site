import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const BrandKitAssets: CollectionConfig = {
  slug: "brand-kit-assets",
  labels: { singular: "Brand Kit Asset", plural: "Brand Kit Assets" },
  defaultSort: "-createdAt",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "brandKit", "client", "assetType", "status"],
    group: PAYLOAD_GROUPS.creativeEngine,
    description: "Files and references for brand kit deliverables. Links to external URLs, Canva boards, and export destinations.",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    { name: "title",    type: "text", required: true, label: "Asset Title" },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { name: "brandKit", type: "relationship", relationTo: "brand-kits" as any, required: true, label: "Brand Kit" },
    { name: "client",   type: "relationship", relationTo: "clients",    label: "Client" },
    {
      name: "assetType",
      type: "select",
      label: "Asset Type",
      options: [
        { label: "Logo",              value: "logo" },
        { label: "Color Palette",     value: "color-palette" },
        { label: "Typography",        value: "typography" },
        { label: "Moodboard",         value: "moodboard" },
        { label: "Social Template",   value: "social-template" },
        { label: "Website Section",   value: "website-section" },
        { label: "Document",          value: "document" },
        { label: "Canva Link",        value: "canva-link" },
        { label: "Other",             value: "other" },
      ],
    },
    { name: "externalUrl", type: "text",     label: "External URL", admin: { description: "Canva link, Google Drive, Figma, or other external asset URL." } },
    { name: "notes",       type: "textarea", label: "Notes" },
    {
      name: "status",
      type: "select",
      defaultValue: "draft",
      options: [
        { label: "Draft",     value: "draft" },
        { label: "Approved",  value: "approved" },
        { label: "Delivered", value: "delivered" },
        { label: "Archived",  value: "archived" },
      ],
      admin: { position: "sidebar" },
    },
  ],
};
