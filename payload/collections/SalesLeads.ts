import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const SalesLeads: CollectionConfig = {
  slug: "sales-leads",
  labels: { singular: "Sales Lead", plural: "Sales Leads" },
  defaultSort: "-updatedAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "companyName",
    defaultColumns: [
      "companyName",
      "contactName",
      "status",
      "estimatedValue",
      "probability",
      "nextFollowUp",
      "updatedAt",
    ],
    group: PAYLOAD_GROUPS.kxdOs,
    description: "KXD Sales Engine — pipeline leads. Dashboard: /admin/sales",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "new",
      label: "Pipeline Status",
      options: [
        { label: "New", value: "new" },
        { label: "Discovery", value: "discovery" },
        { label: "Proposal", value: "proposal" },
        { label: "Negotiation", value: "negotiation" },
        { label: "Won", value: "won" },
        { label: "Lost", value: "lost" },
        { label: "Nurturing", value: "nurturing" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "source",
      type: "text",
      label: "Source",
      admin: { position: "sidebar" },
    },
    {
      name: "assignedTo",
      type: "text",
      label: "Assigned To",
      admin: { position: "sidebar" },
    },
    {
      type: "tabs",
      tabs: [
        {
          label: "Lead",
          fields: [
            { name: "companyName", type: "text", required: true, label: "Company Name" },
            { name: "contactName", type: "text", required: true, label: "Contact Name" },
            { name: "email", type: "email", label: "Email" },
            { name: "phone", type: "text", label: "Phone" },
            { name: "website", type: "text", label: "Website" },
            { name: "industry", type: "text", label: "Industry" },
            {
              name: "tags",
              type: "text",
              label: "Tags",
              admin: { description: "Comma-separated tags." },
            },
            { name: "notes", type: "textarea", label: "Notes" },
          ],
        },
        {
          label: "Forecast",
          fields: [
            { name: "estimatedValue", type: "number", label: "Estimated Value ($)" },
            { name: "estimatedMRR", type: "number", label: "Estimated MRR ($)" },
            {
              name: "probability",
              type: "number",
              label: "Close Probability (%)",
              min: 0,
              max: 100,
              defaultValue: 25,
            },
            {
              name: "nextFollowUp",
              type: "date",
              label: "Next Follow-Up",
              admin: { date: { pickerAppearance: "dayAndTime" } },
            },
          ],
        },
      ],
    },
  ],
};
