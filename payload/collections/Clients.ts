import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const Clients: CollectionConfig = {
  slug: "clients",
  labels: { singular: "Client", plural: "Clients" },
  defaultSort: "name",
  lockDocuments: false,
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "status", "brandTier", "relationshipStatus", "monthlyRetainerAmount"],
    group: PAYLOAD_GROUPS.kxdOs,
    description: "Active, paused, and archived KXD clients. Core record for the agency OS.",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      type: "tabs",
      tabs: [
        // ── Identity ──────────────────────────────────────────────────────────
        {
          label: "Identity",
          fields: [
            {
              name: "name",
              type: "text",
              required: true,
              label: "Client / Company Name",
            },
            {
              name: "slug",
              type: "text",
              required: true,
              unique: true,
              label: "Slug",
              admin: {
                description: "URL-safe identifier. e.g. primal-motorsports",
              },
            },
            {
              name: "companyWebsite",
              type: "text",
              label: "Company Website",
            },
            {
              name: "primaryContactName",
              type: "text",
              label: "Primary Contact Name",
            },
            {
              name: "primaryContactEmail",
              type: "email",
              label: "Primary Contact Email",
            },
          ],
        },

        // ── Billing ───────────────────────────────────────────────────────────
        {
          label: "Billing",
          fields: [
            {
              name: "monthlyRetainerAmount",
              type: "number",
              label: "Monthly Retainer Amount ($)",
              admin: {
                description: "Monthly retainer value in USD.",
              },
            },
            {
              name: "billingDay",
              type: "number",
              label: "Billing Day of Month",
              min: 1,
              max: 28,
              admin: {
                description: "Day of the month invoices are issued (1–28).",
              },
            },
            {
              name: "nextBillingDate",
              type: "date",
              label: "Next Billing Date",
              admin: {
                date: { pickerAppearance: "dayOnly" },
              },
            },
          ],
        },

        // ── Relationship ──────────────────────────────────────────────────────
        {
          label: "Relationship",
          fields: [
            {
              name: "nextAction",
              type: "text",
              label: "Next Action",
              admin: {
                description: "Single most important next step for this client.",
              },
            },
            {
              name: "nextActionDueDate",
              type: "date",
              label: "Next Action Due Date",
              admin: {
                date: { pickerAppearance: "dayOnly" },
              },
            },
            {
              name: "notes",
              type: "textarea",
              label: "Internal Notes",
            },
          ],
        },
      ],
    },

    // ── Sidebar ───────────────────────────────────────────────────────────────
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "active",
      options: [
        { label: "Active",    value: "active" },
        { label: "Paused",    value: "paused" },
        { label: "Archived",  value: "archived" },
        { label: "Prospect",  value: "prospect" },
      ],
      admin: {
        position: "sidebar",
        description: "Current engagement status.",
      },
    },
    {
      name: "brandTier",
      type: "select",
      label: "Brand Tier",
      options: [
        { label: "Flagship",    value: "flagship" },
        { label: "Growth",      value: "growth" },
        { label: "Maintenance", value: "maintenance" },
        { label: "Internal",    value: "internal" },
      ],
      admin: {
        position: "sidebar",
        description: "KXD service tier classification.",
      },
    },
    {
      name: "relationshipStatus",
      type: "select",
      label: "Relationship Health",
      defaultValue: "healthy",
      options: [
        { label: "Healthy",         value: "healthy" },
        { label: "Needs Attention", value: "needs-attention" },
        { label: "At Risk",         value: "at-risk" },
        { label: "Paused",          value: "paused" },
      ],
      admin: {
        position: "sidebar",
        description: "Internal health rating for this client relationship.",
      },
    },
  ],
};
