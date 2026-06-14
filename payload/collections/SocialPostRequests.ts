import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const SocialPostRequests: CollectionConfig = {
  slug: "social-post-requests",
  labels: { singular: "Social Post Request", plural: "Social Post Requests" },
  defaultSort: "-createdAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "postTitle",
    defaultColumns: ["postTitle", "client", "platform", "status", "priority", "scheduledDate"],
    group: PAYLOAD_GROUPS.creativeEngine,
    description: "One-off and campaign social copy requests — captions, hashtags, and scheduling.",
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
            { name: "postTitle",       type: "text", required: true, label: "Post Title" },
            { name: "client",          type: "relationship", relationTo: "clients",            required: true, label: "Client" },
            { name: "relatedProject",  type: "relationship", relationTo: "client-projects",    label: "Related Project" },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { name: "relatedCampaign", type: "relationship", relationTo: "creative-campaigns" as any, label: "Related Campaign" },
            {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              name: "brandKit", type: "relationship", relationTo: "brand-kits" as any, label: "Brand Kit",
              admin: { description: "Brand kit for voice, tone, and hashtag direction." },
            },
            {
              name: "postType",
              type: "select",
              label: "Post Type",
              options: [
                { label: "Announcement",       value: "announcement" },
                { label: "Launch",             value: "launch" },
                { label: "Testimonial",        value: "testimonial" },
                { label: "Promo",              value: "promo" },
                { label: "Event",              value: "event" },
                { label: "Educational",        value: "educational" },
                { label: "Behind the Scenes",  value: "behind-the-scenes" },
                { label: "Case Study",         value: "case-study" },
                { label: "Reminder",           value: "reminder" },
                { label: "Other",              value: "other" },
              ],
            },
            {
              name: "platform",
              type: "select",
              label: "Platform",
              options: [
                { label: "Facebook",  value: "facebook" },
                { label: "Instagram", value: "instagram" },
                { label: "LinkedIn",  value: "linkedin" },
                { label: "Website",   value: "website" },
                { label: "Email",     value: "email" },
                { label: "Other",     value: "other" },
              ],
            },
            { name: "audience",       type: "text",     label: "Target Audience" },
            { name: "keyMessage",     type: "textarea", label: "Key Message" },
            { name: "cta",            type: "text",     label: "Call to Action" },
            { name: "imageDirection", type: "textarea", label: "Image Direction" },
            { name: "scheduledDate",  type: "date",     label: "Scheduled Date", admin: { date: { pickerAppearance: "dayOnly" } } },
            { name: "publishedUrl",   type: "text",     label: "Published URL" },
          ],
        },

        // ── Generated Content ─────────────────────────────────────────────────
        {
          label: "Generated Content",
          admin: { description: "AI copy scaffolding — ready for future generation integration." },
          fields: [
            { name: "generatedCaption",      type: "textarea", label: "Generated Caption (Full)" },
            { name: "generatedShortCaption", type: "textarea", label: "Generated Caption (Short)" },
            { name: "generatedHashtags",     type: "textarea", label: "Generated Hashtags" },
          ],
        },

        // ── Internal ──────────────────────────────────────────────────────────
        {
          label: "Internal",
          fields: [
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
        { label: "New",       value: "new" },
        { label: "Drafting",  value: "drafting" },
        { label: "Review",    value: "review" },
        { label: "Approved",  value: "approved" },
        { label: "Scheduled", value: "scheduled" },
        { label: "Published", value: "published" },
        { label: "Archived",  value: "archived" },
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
