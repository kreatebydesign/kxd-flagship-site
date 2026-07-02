import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";
import { publishRetainerAutomation } from "../hooks/automation.ts";
import { publishRetainerActivityHook } from "../hooks/client-activity.ts";
import { publishRetainerRevenueHook } from "../hooks/revenue-events.ts";

export const Retainers: CollectionConfig = {
  slug: "retainers",
  labels: { singular: "Retainer", plural: "Retainers" },
  defaultSort: "-createdAt",
  lockDocuments: false,
  hooks: {
    afterChange: [publishRetainerAutomation, publishRetainerActivityHook, publishRetainerRevenueHook],
  },
  admin: {
    useAsTitle: "retainerName",
    defaultColumns: ["client", "retainerName", "monthlyAmount", "billingDay", "billingStatus", "nextInvoiceDate"],
    group: PAYLOAD_GROUPS.kxdOs,
    description: "Active and historical retainer agreements. Drives MRR tracking and billing intelligence in the Operations Command Center.",
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
              label: "Monthly Value ($)",
              admin: {
                description: "Recurring monthly invoice amount in USD. Used for MRR calculations.",
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
              name: "billingDay",
              type: "number",
              label: "Billing Day of Month",
              min: 1,
              max: 31,
              admin: {
                description: "Day of the month this retainer invoices (1–31).",
              },
            },
            {
              name: "autoRenew",
              type: "checkbox",
              label: "Auto-Renew",
              defaultValue: true,
              admin: {
                description: "Whether this retainer auto-renews at the end of the contract period.",
              },
            },
          ],
        },

        // ── Dates ─────────────────────────────────────────────────────────────
        {
          label: "Dates",
          fields: [
            {
              name: "contractStartDate",
              type: "date",
              label: "Contract Start Date",
              admin: {
                date: { pickerAppearance: "dayOnly" },
                description: "When the contract formally begins.",
              },
            },
            {
              name: "contractEndDate",
              type: "date",
              label: "Contract End Date",
              admin: {
                date: { pickerAppearance: "dayOnly" },
                description: "When the current contract period ends. Leave blank for open-ended.",
              },
            },
            {
              name: "startDate",
              type: "date",
              label: "Service Start Date",
              admin: {
                date: { pickerAppearance: "dayOnly" },
                description: "When active delivery begins (may differ from contract start).",
              },
            },
            {
              name: "renewalDate",
              type: "date",
              label: "Next Renewal Date",
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
                description: "Used by the Operations Command Center for upcoming invoice alerts.",
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
              admin: {
                description: "Internal team notes about this retainer arrangement.",
              },
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
        { label: "Current",  value: "current" },
        { label: "Active",   value: "active" },
        { label: "Upcoming", value: "upcoming" },
        { label: "Paused",   value: "paused" },
        { label: "Overdue",  value: "overdue" },
        { label: "Ended",    value: "ended" },
      ],
      admin: {
        position: "sidebar",
        description: "Current billing state. 'Current' = invoiced and up to date. 'Upcoming' = invoice due within 14 days.",
      },
    },
  ],
};
