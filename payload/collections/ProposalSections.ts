import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const ProposalSections: CollectionConfig = {
  slug: "proposal-sections",
  labels: { singular: "Proposal Section", plural: "Proposal Sections" },
  defaultSort: "sortOrder",
  lockDocuments: false,
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "category", "defaultPrice", "isRecurring", "active", "sortOrder"],
    group: PAYLOAD_GROUPS.kxdOs,
    description: "Reusable proposal blocks — templates for the proposal builder.",
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
      label: "Category",
      defaultValue: "general",
      options: [
        { label: "About KXD", value: "about-kxd" },
        { label: "Discovery", value: "discovery" },
        { label: "Branding", value: "branding" },
        { label: "Website", value: "website" },
        { label: "SEO", value: "seo" },
        { label: "Monthly Care", value: "monthly-care" },
        { label: "CRM", value: "crm" },
        { label: "Automation", value: "automation" },
        { label: "Marketing", value: "marketing" },
        { label: "General", value: "general" },
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
      name: "isRecurring",
      type: "checkbox",
      label: "Recurring Pricing",
      defaultValue: false,
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
    { name: "slug", type: "text", label: "Slug" },
    { name: "content", type: "textarea", required: true, label: "Content" },
    { name: "defaultPrice", type: "number", label: "Default Price ($)" },
    {
      name: "summary",
      type: "textarea",
      label: "Summary",
      admin: { description: "Short description for builder picker." },
    },
  ],
};
