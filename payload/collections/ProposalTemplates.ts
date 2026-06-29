import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

const PROPOSAL_TYPES = [
  { label: "Website", value: "website" },
  { label: "Branding", value: "branding" },
  { label: "Marketing Retainer", value: "marketing-retainer" },
  { label: "CRM / Automation", value: "crm-automation" },
  { label: "Consulting", value: "consulting" },
  { label: "One-Time Project", value: "one-time-project" },
  { label: "Monthly Retainer", value: "monthly-retainer" },
  { label: "Custom", value: "custom" },
] as const;

export const ProposalTemplates: CollectionConfig = {
  slug: "proposal-templates",
  labels: { singular: "Proposal Template", plural: "Proposal Templates" },
  defaultSort: "sortOrder",
  lockDocuments: false,
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "proposalType", "active", "sortOrder", "updatedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Reusable executive proposal templates. Builder: /admin/sales/proposals/new",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: "proposalType",
      type: "select",
      required: true,
      defaultValue: "website",
      options: [...PROPOSAL_TYPES],
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
    { name: "title", type: "text", required: true, label: "Template Title" },
    { name: "slug", type: "text", label: "Slug" },
    { name: "description", type: "textarea", label: "Description" },
    { name: "heroTitle", type: "text", label: "Default Hero Title" },
    { name: "heroSubtitle", type: "textarea", label: "Default Hero Subtitle" },
    { name: "executiveSummary", type: "textarea", label: "Default Executive Summary" },
    { name: "scope", type: "textarea", label: "Default Scope" },
    { name: "deliverables", type: "textarea", label: "Default Deliverables" },
    { name: "timeline", type: "textarea", label: "Default Timeline" },
    { name: "terms", type: "textarea", label: "Default Terms" },
    { name: "internalNotes", type: "textarea", label: "Default Internal Notes" },
    {
      name: "sectionBlocks",
      type: "json",
      label: "Section Blocks",
      admin: { description: "Ordered builder sections for this template." },
    },
    {
      name: "optionalServices",
      type: "json",
      label: "Optional Add-ons",
    },
    {
      name: "estimateBlueprint",
      type: "json",
      label: "Estimate Blueprint",
      admin: { description: "Default estimate line items for pricing engine." },
    },
    {
      name: "defaultInvestment",
      type: "number",
      label: "Default One-Time ($)",
    },
    {
      name: "defaultRecurring",
      type: "number",
      label: "Default Recurring ($/mo)",
    },
  ],
};
