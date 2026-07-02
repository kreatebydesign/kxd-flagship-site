import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

const CONTRACT_TYPES = [
  { label: "Service Agreement", value: "service-agreement" },
  { label: "Monthly Retainer", value: "monthly-retainer" },
  { label: "Website Agreement", value: "website-agreement" },
  { label: "Marketing Retainer", value: "marketing-retainer" },
  { label: "CRM Agreement", value: "crm-agreement" },
  { label: "Consulting", value: "consulting" },
  { label: "Custom", value: "custom" },
] as const;

export const ContractTemplates: CollectionConfig = {
  slug: "contract-templates",
  labels: { singular: "Contract Template", plural: "Contract Templates" },
  defaultSort: "sortOrder",
  lockDocuments: false,
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "contractType", "active", "sortOrder"],
    group: PAYLOAD_GROUPS.kxdOs,
    description: "Reusable contract templates with merge fields for proposals.",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: "contractType",
      type: "select",
      required: true,
      defaultValue: "service-agreement",
      options: [...CONTRACT_TYPES],
      admin: { position: "sidebar" },
    },
    {
      name: "active",
      type: "checkbox",
      defaultValue: true,
      admin: { position: "sidebar" },
    },
    {
      name: "sortOrder",
      type: "number",
      defaultValue: 0,
      admin: { position: "sidebar" },
    },
    { name: "title", type: "text", required: true },
    { name: "slug", type: "text" },
    { name: "description", type: "textarea" },
    { name: "body", type: "textarea", required: true, label: "Template Body" },
    {
      name: "terms",
      type: "textarea",
      label: "Default Terms",
    },
    {
      name: "mergeFields",
      type: "json",
      label: "Merge Fields",
      admin: {
        description:
          "Supported: {{clientName}}, {{businessName}}, {{services}}, {{pricing}}, {{terms}}, {{startDate}}, {{monthlyAmount}}, {{projectAmount}}, {{executiveName}}",
      },
    },
  ],
};
