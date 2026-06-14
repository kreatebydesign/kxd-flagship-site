import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const CreativeAssets: CollectionConfig = {
  slug: "creative-assets",
  labels: { singular: "Creative Asset", plural: "Creative Assets" },
  defaultSort: "-createdAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "assetTitle",
    defaultColumns: ["assetTitle", "client", "assetType", "status", "deadline"],
    group: PAYLOAD_GROUPS.creativeEngine,
    description: "Reusable creative references, exported files, screenshots, recordings, and visual resources.",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    { name: "assetTitle", type: "text", required: true, label: "Asset Title" },
    { name: "client",     type: "relationship", relationTo: "clients", required: true, label: "Client" },
    { name: "relatedProject",  type: "relationship", relationTo: "client-projects",    label: "Related Project" },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { name: "relatedCampaign", type: "relationship", relationTo: "creative-campaigns" as any, label: "Related Campaign" },
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      name: "brandKit", type: "relationship", relationTo: "brand-kits" as any, label: "Brand Kit",
      admin: { description: "Brand kit this asset was created under." },
    },
    {
      name: "requestType",
      type: "select",
      label: "Request Type",
      defaultValue: "manual",
      options: [
        { label: "Flyer",     value: "flyer" },
        { label: "Video",     value: "video" },
        { label: "Social",    value: "social" },
        { label: "Brand Kit", value: "brand-kit" },
        { label: "Manual",    value: "manual" },
      ],
      admin: { description: "Which creative request type produced or relates to this asset." },
    },
    {
      name: "assetType",
      type: "select",
      label: "Asset Type",
      options: [
        { label: "Logo",             value: "logo" },
        { label: "Photo",            value: "photo" },
        { label: "Screenshot",       value: "screenshot" },
        { label: "Screen Recording", value: "screen-recording" },
        { label: "Video Clip",       value: "video-clip" },
        { label: "Flyer",            value: "flyer" },
        { label: "Social Graphic",   value: "social-graphic" },
        { label: "Brand Guide",      value: "brand-guide" },
        { label: "Copy Doc",         value: "copy-doc" },
        { label: "Canva Link",       value: "canva-link" },
        { label: "Exported File",    value: "exported-file" },
        { label: "Other",            value: "other" },
      ],
    },
    { name: "externalUrl",  type: "text",     label: "External URL" },
    { name: "notes",        type: "textarea", label: "Notes" },
    { name: "usageRights",  type: "text",     label: "Usage Rights" },
    { name: "platform",     type: "text",     label: "Platform / Context" },
    { name: "createdFor",   type: "text",     label: "Created For", admin: { description: "Campaign, project, or initiative this asset was made for." } },
    { name: "deadline",     type: "date",     label: "Deadline", admin: { date: { pickerAppearance: "dayOnly" } } },
    {
      name: "status",
      type: "select",
      defaultValue: "raw",
      options: [
        { label: "Raw",       value: "raw" },
        { label: "In Use",    value: "in-use" },
        { label: "Approved",  value: "approved" },
        { label: "Delivered", value: "delivered" },
        { label: "Archived",  value: "archived" },
      ],
      admin: { position: "sidebar" },
    },
  ],
};
