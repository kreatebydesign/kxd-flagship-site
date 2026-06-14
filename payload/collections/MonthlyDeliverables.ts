import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const MonthlyDeliverables: CollectionConfig = {
  slug: "monthly-deliverables",
  labels: { singular: "Monthly Deliverable", plural: "Monthly Deliverables" },
  defaultSort: "-createdAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "client", "category", "status", "dueDate", "month", "year"],
    group: PAYLOAD_GROUPS.kxdOs,
    description: "Trackable monthly deliverable items scoped to a client and optionally a project.",
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
        // ── Deliverable ───────────────────────────────────────────────────────
        {
          label: "Deliverable",
          fields: [
            {
              name: "title",
              type: "text",
              required: true,
              label: "Title",
              admin: {
                description: "e.g. June Homepage Refresh — Primal Motorsports",
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
              name: "relatedProject",
              type: "relationship",
              relationTo: "client-projects",
              label: "Related Project",
              admin: {
                description: "Optional. Link to the parent project if applicable.",
              },
            },
            {
              name: "category",
              type: "select",
              label: "Category",
              options: [
                { label: "Website",     value: "website" },
                { label: "SEO",         value: "seo" },
                { label: "Content",     value: "content" },
                { label: "Reporting",   value: "reporting" },
                { label: "Strategy",    value: "strategy" },
                { label: "Support",     value: "support" },
                { label: "Design",      value: "design" },
                { label: "Development", value: "development" },
                { label: "Admin",       value: "admin" },
              ],
            },
            {
              name: "month",
              type: "number",
              label: "Month",
              min: 1,
              max: 12,
              admin: {
                description: "Month number (1–12).",
              },
            },
            {
              name: "year",
              type: "number",
              label: "Year",
              admin: {
                description: "e.g. 2026",
              },
            },
          ],
        },

        // ── Tracking ──────────────────────────────────────────────────────────
        {
          label: "Tracking",
          fields: [
            {
              name: "dueDate",
              type: "date",
              label: "Due Date",
              admin: {
                date: { pickerAppearance: "dayOnly" },
              },
            },
            {
              name: "completedDate",
              type: "date",
              label: "Completed Date",
              admin: {
                date: { pickerAppearance: "dayOnly" },
              },
            },
            {
              name: "owner",
              type: "text",
              label: "Owner",
              admin: {
                description: "Person responsible for delivering this item.",
              },
            },
            {
              name: "notes",
              type: "textarea",
              label: "Notes",
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
      defaultValue: "not-started",
      options: [
        { label: "Not Started",       value: "not-started" },
        { label: "In Progress",       value: "in-progress" },
        { label: "Waiting on Client", value: "waiting-on-client" },
        { label: "Complete",          value: "complete" },
        { label: "Blocked",           value: "blocked" },
      ],
      admin: {
        position: "sidebar",
        description: "Current delivery status of this deliverable.",
      },
    },
  ],
};
