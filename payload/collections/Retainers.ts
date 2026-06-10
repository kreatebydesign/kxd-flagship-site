import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const Retainers: CollectionConfig = {
  slug: "retainers",
  labels: { singular: "Retainer", plural: "Retainers" },
  defaultSort: "-createdAt",
  admin: {
    useAsTitle: "retainerName",
    defaultColumns: ["retainerName", "client", "monthlyAmount", "billingStatus", "renewalDate"],
    group: PAYLOAD_GROUPS.kxdOs,
    description: "Active and historical retainer agreements per client.",
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
        // ── Agreement ─────────────────────────────────────────────────────────
        {
          label: "Agreement",
          fields: [
            {
              name: "retainerName",
              type: "text",
              required: true,
              label: "Retainer Name",
              admin: {
                description: "e.g. Primal Motorsports — Monthly Platform Retainer",
              },
            },
            {
              name: "client",
              type: "relationship",
              relationTo: "clients",
              required: true,
              label: "Client",
            },
            {
              name: "monthlyAmount",
              type: "number",
              label: "Monthly Amount ($)",
              admin: {
                description: "Recurring monthly invoice amount in USD.",
              },
            },
            {
              name: "billingCadence",
              type: "select",
              label: "Billing Cadence",
              defaultValue: "monthly",
              options: [
                { label: "Monthly",       value: "monthly" },
                { label: "Quarterly",     value: "quarterly" },
                { label: "Annual",        value: "annual" },
                { label: "Project-Based", value: "project-based" },
              ],
            },
            {
              name: "startDate",
              type: "date",
              label: "Start Date",
              admin: {
                date: { pickerAppearance: "dayOnly" },
              },
            },
            {
              name: "renewalDate",
              type: "date",
              label: "Renewal Date",
              admin: {
                date: { pickerAppearance: "dayOnly" },
              },
            },
            {
              name: "nextInvoiceDate",
              type: "date",
              label: "Next Invoice Date",
              admin: {
                date: { pickerAppearance: "dayOnly" },
              },
            },
          ],
        },

        // ── Scope ─────────────────────────────────────────────────────────────
        {
          label: "Scope",
          fields: [
            {
              name: "scopeSummary",
              type: "textarea",
              label: "Scope Summary",
              admin: {
                description: "High-level description of what is included each month.",
              },
            },
            {
              name: "includedServices",
              type: "textarea",
              label: "Included Services",
              admin: {
                description: "Comma-separated or line-separated list of included deliverables.",
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
      name: "billingStatus",
      type: "select",
      label: "Billing Status",
      required: true,
      defaultValue: "active",
      options: [
        { label: "Active",  value: "active" },
        { label: "Paused",  value: "paused" },
        { label: "Overdue", value: "overdue" },
        { label: "Ended",   value: "ended" },
      ],
      admin: {
        position: "sidebar",
        description: "Current billing state for this retainer.",
      },
    },
  ],
};
