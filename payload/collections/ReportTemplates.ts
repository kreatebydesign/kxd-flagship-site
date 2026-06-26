import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const ReportTemplates: CollectionConfig = {
  slug: "report-templates",
  labels: { singular: "Report Template", plural: "Report Templates" },
  defaultSort: "sortOrder",
  lockDocuments: false,
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "slug", "category", "active", "sortOrder"],
    group: PAYLOAD_GROUPS.kxdOs,
    description: "Reusable executive report layouts for KXD Core and future OS editions.",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: "category",
      type: "select",
      required: true,
      defaultValue: "standard",
      label: "Category",
      options: [
        { label: "Standard Monthly", value: "standard" },
        { label: "Website Care", value: "website-care" },
        { label: "SEO", value: "seo" },
        { label: "Growth", value: "growth" },
        { label: "Campaign", value: "campaign" },
        { label: "Motorsports", value: "motorsports" },
        { label: "Contractor", value: "contractor" },
        { label: "Hospitality", value: "hospitality" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "active",
      type: "checkbox",
      label: "Active",
      defaultValue: true,
      admin: { position: "sidebar" },
    },
    {
      name: "sortOrder",
      type: "number",
      label: "Sort Order",
      defaultValue: 0,
      admin: { position: "sidebar" },
    },
    { name: "title", type: "text", required: true, label: "Title" },
    { name: "slug", type: "text", required: true, unique: true, label: "Slug" },
    {
      name: "description",
      type: "textarea",
      label: "Description",
    },
    {
      name: "sections",
      type: "json",
      label: "Section Layout",
      admin: { description: "Ordered section keys included in this template." },
    },
    {
      name: "edition",
      type: "text",
      label: "OS Edition",
      defaultValue: "kxd-core",
      admin: { description: "kxd-core, contractor-os, motorsports-os, etc." },
    },
  ],
};
