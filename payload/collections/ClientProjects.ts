import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";
import { publishProjectAutomation } from "../hooks/automation.ts";

export const ClientProjects: CollectionConfig = {
  slug: "client-projects",
  labels: { singular: "Client Project", plural: "Client Projects" },
  defaultSort: "-createdAt",
  lockDocuments: false,
  hooks: {
    afterChange: [publishProjectAutomation],
  },
  admin: {
    useAsTitle: "projectName",
    defaultColumns: ["projectName", "client", "projectType", "status", "priority", "targetLaunchDate"],
    group: PAYLOAD_GROUPS.kxdOs,
    description: "All active and historical client delivery projects.",
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
        // ── Project ───────────────────────────────────────────────────────────
        {
          label: "Project",
          fields: [
            {
              name: "projectName",
              type: "text",
              required: true,
              label: "Project Name",
            },
            {
              name: "client",
              type: "relationship",
              relationTo: "clients",
              required: true,
              label: "Client",
            },
            {
              name: "projectType",
              type: "select",
              label: "Project Type",
              options: [
                { label: "Website",    value: "website" },
                { label: "Brand",      value: "brand" },
                { label: "Platform",   value: "platform" },
                { label: "SEO",        value: "seo" },
                { label: "Content",    value: "content" },
                { label: "Consulting", value: "consulting" },
                { label: "Support",    value: "support" },
                { label: "Other",      value: "other" },
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
              name: "targetLaunchDate",
              type: "date",
              label: "Target Launch Date",
              admin: {
                date: { pickerAppearance: "dayOnly" },
              },
            },
          ],
        },

        // ── Delivery ──────────────────────────────────────────────────────────
        {
          label: "Delivery",
          fields: [
            {
              name: "liveUrl",
              type: "text",
              label: "Live URL",
            },
            {
              name: "repoUrl",
              type: "text",
              label: "Repository URL",
            },
            {
              name: "vercelProject",
              type: "text",
              label: "Vercel Project Name",
            },
            {
              name: "nextAction",
              type: "text",
              label: "Next Action",
              admin: {
                description: "Single most important next delivery step.",
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
      defaultValue: "planning",
      options: [
        { label: "Planning",          value: "planning" },
        { label: "Active",            value: "active" },
        { label: "Waiting on Client", value: "waiting-on-client" },
        { label: "Review",            value: "review" },
        { label: "Launched",          value: "launched" },
        { label: "Paused",            value: "paused" },
        { label: "Archived",          value: "archived" },
      ],
      admin: {
        position: "sidebar",
        description: "Current delivery status.",
      },
    },
    {
      name: "priority",
      type: "select",
      required: true,
      defaultValue: "normal",
      options: [
        { label: "Low",    value: "low" },
        { label: "Normal", value: "normal" },
        { label: "High",   value: "high" },
        { label: "Urgent", value: "urgent" },
      ],
      admin: {
        position: "sidebar",
        description: "Internal priority level.",
      },
    },
  ],
};
