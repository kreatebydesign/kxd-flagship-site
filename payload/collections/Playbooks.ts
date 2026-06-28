import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

const APPLIES_TO = [
  { label: "Agency", value: "agency" },
  { label: "Client", value: "client" },
  { label: "Project", value: "project" },
  { label: "Website", value: "website" },
  { label: "Campaign", value: "campaign" },
  { label: "Motorsports", value: "motorsports" },
  { label: "Contractor", value: "contractor" },
  { label: "Hospitality", value: "hospitality" },
  { label: "Professional Services", value: "professional-services" },
  { label: "Future Editions", value: "future-editions" },
] as const;

const CATEGORIES = [
  { label: "Launch", value: "launch" },
  { label: "Onboarding", value: "onboarding" },
  { label: "SEO", value: "seo" },
  { label: "Reporting", value: "reporting" },
  { label: "Sales", value: "sales" },
  { label: "Audit", value: "audit" },
  { label: "Strategy", value: "strategy" },
  { label: "Vertical", value: "vertical" },
  { label: "Operations", value: "operations" },
] as const;

export const Playbooks: CollectionConfig = {
  slug: "playbooks",
  labels: { singular: "Playbook", plural: "Playbooks" },
  defaultSort: "name",
  lockDocuments: false,
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "category", "active", "version", "estimatedDuration", "updatedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description: "KXD operational playbooks and SOP templates — OS: /admin/operations/playbooks",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
      label: "Name",
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      index: true,
      label: "Slug",
      admin: { position: "sidebar" },
    },
    {
      name: "category",
      type: "select",
      required: true,
      label: "Category",
      options: [...CATEGORIES],
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
      name: "version",
      type: "text",
      label: "Version",
      defaultValue: "1.0",
      admin: { position: "sidebar" },
    },
    {
      name: "icon",
      type: "text",
      label: "Icon",
      admin: { position: "sidebar", description: "Short glyph label (e.g. WL)" },
    },
    {
      name: "color",
      type: "text",
      label: "Color",
      admin: { position: "sidebar", description: "Token or hex accent" },
    },
    {
      name: "estimatedDuration",
      type: "text",
      label: "Estimated Duration",
      admin: { position: "sidebar" },
    },
    {
      type: "tabs",
      tabs: [
        {
          label: "Playbook",
          fields: [
            { name: "description", type: "textarea", label: "Description" },
            {
              name: "tags",
              type: "array",
              label: "Tags",
              fields: [{ name: "tag", type: "text", required: true }],
            },
            {
              name: "appliesTo",
              type: "select",
              label: "Applies To",
              hasMany: true,
              options: [...APPLIES_TO],
            },
          ],
        },
      ],
    },
  ],
};
