import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const PromoVideoRequests: CollectionConfig = {
  slug: "promo-video-requests",
  labels: { singular: "Promo Video Request", plural: "Promo Video Requests" },
  defaultSort: "-createdAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "videoTitle",
    defaultColumns: ["videoTitle", "client", "videoType", "status", "priority", "deadline"],
    group: PAYLOAD_GROUPS.creativeEngine,
    description: "High-end KXD promo videos, site launch reels, highlight edits, and client showcase content.",
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
        // ── Brief ─────────────────────────────────────────────────────────────
        {
          label: "Brief",
          fields: [
            { name: "videoTitle",     type: "text", required: true, label: "Video Title" },
            { name: "client",         type: "relationship", relationTo: "clients",            required: true, label: "Client" },
            { name: "relatedProject", type: "relationship", relationTo: "client-projects",    label: "Related Project" },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { name: "relatedCampaign",type: "relationship", relationTo: "creative-campaigns" as any, label: "Related Campaign" },
            {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              name: "brandKit", type: "relationship", relationTo: "brand-kits" as any, label: "Brand Kit",
              admin: { description: "Brand kit supplying visual direction for this video." },
            },
            {
              name: "videoType",
              type: "select",
              label: "Video Type",
              options: [
                { label: "Website Launch",    value: "website-launch" },
                { label: "Case Study",        value: "case-study" },
                { label: "Promo",             value: "promo" },
                { label: "Highlight Reel",    value: "highlight-reel" },
                { label: "Event Recap",       value: "event-recap" },
                { label: "Product / Service", value: "product-service" },
                { label: "Testimonial",       value: "testimonial" },
                { label: "Before & After",    value: "before-after" },
                { label: "Social Reel",       value: "social-reel" },
                { label: "Other",             value: "other" },
              ],
            },
            {
              name: "platform",
              type: "select",
              label: "Platform",
              options: [
                { label: "Facebook",  value: "facebook" },
                { label: "Instagram", value: "instagram" },
                { label: "Reels",     value: "reels" },
                { label: "Stories",   value: "stories" },
                { label: "LinkedIn",  value: "linkedin" },
                { label: "YouTube",   value: "youtube" },
                { label: "Website",   value: "website" },
                { label: "Other",     value: "other" },
              ],
            },
            {
              name: "aspectRatio",
              type: "select",
              label: "Aspect Ratio",
              options: [
                { label: "9:16 (Vertical)", value: "9:16" },
                { label: "1:1 (Square)",    value: "1:1" },
                { label: "4:5",             value: "4:5" },
                { label: "16:9 (Landscape)",value: "16:9" },
                { label: "Custom",          value: "custom" },
              ],
            },
            {
              name: "durationTarget",
              type: "select",
              label: "Duration Target",
              options: [
                { label: "15 seconds", value: "15s" },
                { label: "30 seconds", value: "30s" },
                { label: "45 seconds", value: "45s" },
                { label: "60 seconds", value: "60s" },
                { label: "90 seconds", value: "90s" },
                { label: "Custom",     value: "custom" },
              ],
            },
            {
              name: "visualStyle",
              type: "select",
              label: "Visual Style",
              options: [
                { label: "Cinematic",   value: "cinematic" },
                { label: "Luxury",      value: "luxury" },
                { label: "Editorial",   value: "editorial" },
                { label: "Energetic",   value: "energetic" },
                { label: "Minimal",     value: "minimal" },
                { label: "Bold",        value: "bold" },
                { label: "Documentary", value: "documentary" },
                { label: "Other",       value: "other" },
              ],
            },
            { name: "goal",       type: "textarea", label: "Goal" },
            { name: "audience",   type: "text",     label: "Target Audience" },
            { name: "deadline",   type: "date",     label: "Deadline", admin: { date: { pickerAppearance: "dayOnly" } } },
          ],
        },

        // ── Assets Needed ─────────────────────────────────────────────────────
        {
          label: "Assets Needed",
          fields: [
            { name: "websiteUrl",          type: "text",     label: "Website URL", admin: { description: "Used to pull screenshots for website-launch videos." } },
            { name: "requiredScreenshots", type: "textarea", label: "Required Screenshots" },
            { name: "requiredClips",       type: "textarea", label: "Required Clips / Footage" },
            { name: "musicDirection",      type: "textarea", label: "Music Direction" },
            { name: "shotList",            type: "textarea", label: "Shot List" },
          ],
        },

        // ── Generated Content ─────────────────────────────────────────────────
        {
          label: "Generated Content",
          admin: { description: "AI script and copy scaffolding — ready for future generation integration." },
          fields: [
            { name: "generatedScript",      type: "textarea", label: "Generated Script" },
            { name: "generatedCaptions",    type: "textarea", label: "Generated Captions" },
            { name: "generatedOnScreenText",type: "textarea", label: "Generated On-Screen Text" },
            { name: "generatedPostCopy",    type: "textarea", label: "Generated Post Copy" },
          ],
        },

        // ── Internal ──────────────────────────────────────────────────────────
        {
          label: "Internal",
          fields: [
            { name: "editingNotes",      type: "textarea", label: "Editing Notes" },
            { name: "internalNotes",     type: "textarea", label: "Internal Notes" },
            { name: "nextAction",        type: "text",     label: "Next Action" },
            { name: "nextActionDueDate", type: "date",     label: "Next Action Due", admin: { date: { pickerAppearance: "dayOnly" } } },
          ],
        },
      ],
    },

    // ── Sidebar ───────────────────────────────────────────────────────────────
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "new",
      options: [
        { label: "New",           value: "new" },
        { label: "Scripting",     value: "scripting" },
        { label: "Assets Needed", value: "assets-needed" },
        { label: "Editing",       value: "editing" },
        { label: "Review",        value: "review" },
        { label: "Approved",      value: "approved" },
        { label: "Delivered",     value: "delivered" },
        { label: "Archived",      value: "archived" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "priority",
      type: "select",
      defaultValue: "normal",
      options: [
        { label: "Low",    value: "low" },
        { label: "Normal", value: "normal" },
        { label: "High",   value: "high" },
        { label: "Urgent", value: "urgent" },
      ],
      admin: { position: "sidebar" },
    },
  ],
};
