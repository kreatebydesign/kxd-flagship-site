import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const BrandKits: CollectionConfig = {
  slug: "brand-kits",
  labels: { singular: "Brand Kit", plural: "Brand Kits" },
  defaultSort: "-createdAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "brandName",
    defaultColumns: ["brandName", "client", "status", "nextActionDueDate"],
    group: PAYLOAD_GROUPS.creativeEngine,
    description: "Elite client brand foundations and mini brand guides.",
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
            { name: "brandName",    type: "text", required: true, label: "Brand Name" },
            { name: "slug",         type: "text", required: true, unique: true, label: "Slug" },
            { name: "client",       type: "relationship", relationTo: "clients", required: true, label: "Client" },
            { name: "relatedProject", type: "relationship", relationTo: "client-projects", label: "Related Project" },
            {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              name: "campaign", type: "relationship", relationTo: "creative-campaigns" as any, label: "Related Campaign",
              admin: { description: "Campaign this brand kit was built to support." },
            },
            { name: "industry",     type: "text",     label: "Industry" },
            { name: "audience",     type: "textarea", label: "Target Audience" },
            { name: "brandPersonality",    type: "textarea", label: "Brand Personality" },
            { name: "positioningStatement",type: "textarea", label: "Positioning Statement" },
            { name: "taglineOptions",      type: "textarea", label: "Tagline Options", admin: { description: "One per line or comma-separated." } },
          ],
        },

        // ── Visual ────────────────────────────────────────────────────────────
        {
          label: "Visual",
          fields: [
            { name: "primaryColor",        type: "text", label: "Primary Color", admin: { description: "Hex code, e.g. #0A0A0A" } },
            { name: "secondaryColor",      type: "text", label: "Secondary Color" },
            { name: "accentColor",         type: "text", label: "Accent Color" },
            { name: "neutralColor",        type: "text", label: "Neutral Color" },
            { name: "typographyDirection", type: "textarea", label: "Typography Direction" },
            { name: "logoNotes",           type: "textarea", label: "Logo Notes" },
            { name: "canvaDirection",      type: "textarea", label: "Canva Direction", admin: { description: "Canva workspace notes and template direction for future integration." } },
          ],
        },

        // ── Voice & Copy ──────────────────────────────────────────────────────
        {
          label: "Voice & Copy",
          fields: [
            { name: "voiceTone",           type: "textarea", label: "Voice & Tone" },
            { name: "brandKeywords",       type: "textarea", label: "Brand Keywords" },
            { name: "doRules",             type: "textarea", label: "Do Rules" },
            { name: "dontRules",           type: "textarea", label: "Don't Rules" },
            { name: "socialBio",           type: "textarea", label: "Social Bio" },
            { name: "websiteIntroCopy",    type: "textarea", label: "Website Intro Copy" },
            { name: "primaryCTA",          type: "text",     label: "Primary CTA" },
            { name: "secondaryCTA",        type: "text",     label: "Secondary CTA" },
          ],
        },

        // ── Delivery ──────────────────────────────────────────────────────────
        {
          label: "Delivery",
          fields: [
            { name: "internalNotes",      type: "textarea", label: "Internal Notes" },
            { name: "nextAction",         type: "text",     label: "Next Action" },
            { name: "nextActionDueDate",  type: "date",     label: "Next Action Due", admin: { date: { pickerAppearance: "dayOnly" } } },
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
        { label: "Draft",     value: "draft" },
        { label: "In Review", value: "in-review" },
        { label: "Approved",  value: "approved" },
        { label: "Delivered", value: "delivered" },
        { label: "Archived",  value: "archived" },
      ],
      admin: { position: "sidebar" },
    },
  ],
};
