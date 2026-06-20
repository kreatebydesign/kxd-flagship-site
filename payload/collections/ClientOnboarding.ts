import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";
import { syncClientOnboardingSummary } from "../hooks/client-onboarding.ts";

export const ClientOnboarding: CollectionConfig = {
  slug: "client-onboarding",
  labels: { singular: "Client Onboarding", plural: "Client Onboarding" },
  defaultSort: "-updatedAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "businessName",
    defaultColumns: ["client", "businessName", "status", "email", "updatedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Structured client intake workflow — business info, assets, access, and project goals. " +
      "Dashboard: /admin/operations/onboarding",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  hooks: {
    afterChange: [syncClientOnboardingSummary],
  },
  fields: [
    {
      type: "tabs",
      tabs: [
        // ── Relationship ──────────────────────────────────────────────────────
        {
          label: "Client",
          fields: [
            {
              name: "client",
              type: "relationship",
              relationTo: "clients",
              required: true,
              label: "Client",
              admin: {
                description: "The KXD client this onboarding intake belongs to.",
              },
            },
          ],
        },

        // ── Business Information ──────────────────────────────────────────────
        {
          label: "Business Info",
          fields: [
            { name: "businessName",    type: "text",  required: true, label: "Business Name" },
            { name: "dba",             type: "text",  label: "DBA / Trade Name" },
            { name: "primaryContact",  type: "text",  label: "Primary Contact" },
            { name: "email",           type: "email", label: "Email" },
            { name: "phone",           type: "text",  label: "Phone" },
            { name: "address",         type: "text",  label: "Street Address" },
            { name: "city",            type: "text",  label: "City" },
            { name: "state",           type: "text",  label: "State" },
            { name: "zip",             type: "text",  label: "ZIP" },
          ],
        },

        // ── Business Details ──────────────────────────────────────────────────
        {
          label: "Business Details",
          fields: [
            { name: "industry",                 type: "text",     label: "Industry" },
            { name: "yearsInBusiness",          type: "text",     label: "Years in Business" },
            { name: "serviceAreas",             type: "textarea", label: "Service Areas" },
            { name: "shortBusinessDescription", type: "textarea", label: "Short Business Description" },
          ],
        },

        // ── Website Information ───────────────────────────────────────────────
        {
          label: "Website",
          fields: [
            { name: "currentWebsite",    type: "text",     label: "Current Website URL" },
            { name: "hostingProvider",   type: "text",     label: "Hosting Provider" },
            { name: "domainRegistrar",   type: "text",     label: "Domain Registrar" },
            {
              name: "analyticsConnected",
              type: "checkbox",
              label: "Analytics Connected",
              defaultValue: false,
              admin: { description: "Client has connected or provided analytics access." },
            },
          ],
        },

        // ── Social Accounts ───────────────────────────────────────────────────
        {
          label: "Social",
          fields: [
            { name: "facebook",  type: "text", label: "Facebook URL" },
            { name: "instagram", type: "text", label: "Instagram URL" },
            { name: "linkedin",  type: "text", label: "LinkedIn URL" },
            { name: "youtube",   type: "text", label: "YouTube URL" },
            { name: "tiktok",    type: "text", label: "TikTok URL" },
          ],
        },

        // ── Project Goals ─────────────────────────────────────────────────────
        {
          label: "Project Goals",
          fields: [
            { name: "primaryGoal",       type: "textarea", label: "Primary Goal" },
            { name: "successDefinition", type: "textarea", label: "Success Definition" },
            { name: "biggestPainPoint",  type: "textarea", label: "Biggest Pain Point" },
            { name: "topCompetitors",    type: "textarea", label: "Top Competitors" },
          ],
        },

        // ── Brand Assets ──────────────────────────────────────────────────────
        {
          label: "Brand Assets",
          fields: [
            {
              name: "logoFiles",
              type: "relationship",
              relationTo: "media",
              hasMany: true,
              label: "Logo Files",
              admin: { description: "Primary logo files in all required formats." },
            },
            {
              name: "brandGuidelines",
              type: "relationship",
              relationTo: "media",
              hasMany: true,
              label: "Brand Guidelines",
            },
            {
              name: "marketingMaterials",
              type: "relationship",
              relationTo: "media",
              hasMany: true,
              label: "Marketing Materials",
            },
            {
              name: "photos",
              type: "relationship",
              relationTo: "media",
              hasMany: true,
              label: "Photos",
            },
            {
              name: "videos",
              type: "relationship",
              relationTo: "media",
              hasMany: true,
              label: "Videos",
            },
          ],
        },

        // ── Access & Notes ────────────────────────────────────────────────────
        {
          label: "Access & Notes",
          fields: [
            {
              type: "row",
              fields: [
                { name: "websiteAccess",     type: "checkbox", label: "Website Access",     defaultValue: false },
                { name: "domainAccess",      type: "checkbox", label: "Domain Access",      defaultValue: false },
                { name: "hostingAccess",     type: "checkbox", label: "Hosting Access",     defaultValue: false },
              ],
            },
            {
              type: "row",
              fields: [
                { name: "socialMediaAccess", type: "checkbox", label: "Social Media Access", defaultValue: false },
                { name: "analyticsAccess",   type: "checkbox", label: "Analytics Access",   defaultValue: false },
                { name: "emailAccess",       type: "checkbox", label: "Email Access",       defaultValue: false },
              ],
            },
            { name: "notes", type: "textarea", label: "Additional Notes" },
          ],
        },
      ],
    },

    // ── Sidebar ───────────────────────────────────────────────────────────────
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "draft",
      options: [
        { label: "Draft",       value: "draft" },
        { label: "Sent",        value: "sent" },
        { label: "In Progress", value: "in-progress" },
        { label: "Submitted",   value: "submitted" },
        { label: "Approved",    value: "approved" },
      ],
      admin: {
        position: "sidebar",
        description: "Current onboarding workflow status.",
      },
    },
    {
      name: "submittedAt",
      type: "date",
      label: "Submitted At",
      admin: {
        position: "sidebar",
        date: { pickerAppearance: "dayAndTime" },
        description: "When the client submitted the intake form.",
      },
    },
    {
      name: "approvedAt",
      type: "date",
      label: "Approved At",
      admin: {
        position: "sidebar",
        date: { pickerAppearance: "dayAndTime" },
        description: "When KXD approved the onboarding intake.",
      },
    },
  ],
};
