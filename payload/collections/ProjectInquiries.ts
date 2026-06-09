import type { CollectionConfig } from "payload";
import { isAuthenticated, publicCreate } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const ProjectInquiries: CollectionConfig = {
  slug: "project-inquiries",
  labels: { singular: "Project Inquiry", plural: "Project Inquiries" },
  defaultSort: "-createdAt",
  admin: {
    useAsTitle: "companyName",
    defaultColumns: ["companyName", "contactName", "email", "investmentRange", "status", "createdAt"],
    group: PAYLOAD_GROUPS.leads,
    description:
      "Multi-step project intake submissions from /start-project. Sorted newest first.",
  },
  access: {
    read: isAuthenticated,
    create: publicCreate,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      type: "tabs",
      tabs: [
        // ── Company & Contact ─────────────────────────────────────────────
        {
          label: "Company & Contact",
          fields: [
            {
              name: "companyName",
              type: "text",
              required: true,
              label: "Company Name",
            },
            {
              name: "websiteUrl",
              type: "text",
              label: "Website URL",
            },
            {
              name: "contactName",
              type: "text",
              required: true,
              label: "Contact Name",
            },
            {
              name: "email",
              type: "email",
              required: true,
            },
            {
              name: "phone",
              type: "text",
              label: "Phone",
            },
          ],
        },

        // ── Project Scope ─────────────────────────────────────────────────
        {
          label: "Project Scope",
          fields: [
            {
              name: "servicesInterested",
              type: "text",
              label: "Services Interested In",
              admin: {
                description: "Comma-separated list of selected services from intake form.",
              },
            },
            {
              name: "businessGoals",
              type: "textarea",
              label: "Business Goals",
            },
            {
              name: "investmentRange",
              type: "select",
              label: "Investment Range",
              options: [
                { label: "Under $10,000", value: "under-10k" },
                { label: "$10,000 – $25,000", value: "10k-25k" },
                { label: "$25,000 – $50,000", value: "25k-50k" },
                { label: "$50,000 – $100,000", value: "50k-100k" },
                { label: "$100,000+", value: "100k-plus" },
                { label: "Not yet determined", value: "not-determined" },
              ],
            },
            {
              name: "timeline",
              type: "select",
              label: "Desired Timeline",
              options: [
                { label: "Immediately", value: "immediate" },
                { label: "Within 30 Days", value: "within-30-days" },
                { label: "Within 60–90 Days", value: "60-90-days" },
                { label: "3–6 Months", value: "3-6-months" },
                { label: "Exploring Options", value: "exploring" },
              ],
            },
          ],
        },

        // ── Assets & Notes ────────────────────────────────────────────────
        {
          label: "Assets & Notes",
          fields: [
            {
              name: "assetsAvailable",
              type: "text",
              label: "Existing Assets",
              admin: {
                description: "Comma-separated list of assets the client already has.",
              },
            },
            {
              name: "notes",
              type: "textarea",
              label: "Additional Notes",
            },
          ],
        },
      ],
    },

    // ── Sidebar ───────────────────────────────────────────────────────────────
    {
      name: "status",
      type: "select",
      defaultValue: "new",
      required: true,
      options: [
        { label: "New", value: "new" },
        { label: "Reviewing", value: "reviewing" },
        { label: "Discovery", value: "discovery" },
        { label: "Proposal", value: "proposal" },
        { label: "Active", value: "active" },
        { label: "Closed", value: "closed" },
      ],
      admin: {
        position: "sidebar",
        description: "Current stage of this project inquiry.",
      },
    },
    {
      name: "submittedAt",
      type: "date",
      label: "Submitted At",
      admin: {
        position: "sidebar",
        readOnly: true,
        description: "Auto-set on creation.",
      },
    },
  ],
};
