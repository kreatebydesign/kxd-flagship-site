import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const FlyerRequests: CollectionConfig = {
  slug: "flyer-requests",
  labels: { singular: "Flyer Request", plural: "Flyer Requests" },
  defaultSort: "-createdAt",
  admin: {
    useAsTitle: "flyerTitle",
    defaultColumns: ["flyerTitle", "client", "flyerType", "status", "priority", "deadline"],
    group: PAYLOAD_GROUPS.creativeEngine,
    description: "Premium flyer creation requests for clients — events, promos, announcements, and print.",
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
            { name: "flyerTitle", type: "text", required: true, label: "Flyer Title" },
            { name: "client",     type: "relationship", relationTo: "clients",           required: true, label: "Client" },
            { name: "relatedProject",  type: "relationship", relationTo: "client-projects",  label: "Related Project" },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { name: "relatedCampaign", type: "relationship", relationTo: "creative-campaigns" as any, label: "Related Campaign" },
            {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              name: "brandKit", type: "relationship", relationTo: "brand-kits" as any, label: "Brand Kit",
              admin: { description: "Brand kit to apply for colors, typography, and copy direction." },
            },
            {
              name: "flyerType",
              type: "select",
              label: "Flyer Type",
              options: [
                { label: "Event",           value: "event" },
                { label: "Promotion",       value: "promotion" },
                { label: "Announcement",    value: "announcement" },
                { label: "Hiring",          value: "hiring" },
                { label: "Menu",            value: "menu" },
                { label: "Fundraiser",      value: "fundraiser" },
                { label: "Launch",          value: "launch" },
                { label: "Social Square",   value: "social-square" },
                { label: "Story",           value: "story" },
                { label: "Print",           value: "print" },
                { label: "Other",           value: "other" },
              ],
            },
            {
              name: "sizeFormat",
              type: "select",
              label: "Size / Format",
              options: [
                { label: "Square (1:1)",  value: "square" },
                { label: "Story (9:16)",  value: "story" },
                { label: "Portrait",      value: "portrait" },
                { label: "Landscape",     value: "landscape" },
                { label: "Letter (8.5×11)", value: "letter" },
                { label: "Poster",        value: "poster" },
                { label: "Custom",        value: "custom" },
              ],
            },
            { name: "eventDate",       type: "date",     label: "Event Date",       admin: { date: { pickerAppearance: "dayOnly" } } },
            { name: "deadline",        type: "date",     label: "Deadline",         admin: { date: { pickerAppearance: "dayOnly" } } },
            { name: "audience",        type: "text",     label: "Target Audience" },
            { name: "keyDetails",      type: "textarea", label: "Key Details",       admin: { description: "Date, time, location, names, pricing — anything that must appear on the flyer." } },
            { name: "offerOrMessage",  type: "textarea", label: "Offer or Message" },
            { name: "cta",             type: "text",     label: "Call to Action" },
          ],
        },

        // ── Assets & Direction ────────────────────────────────────────────────
        {
          label: "Assets & Direction",
          fields: [
            { name: "requiredLogos",  type: "textarea", label: "Required Logos", admin: { description: "Which client logos must appear?" } },
            { name: "requiredImages", type: "textarea", label: "Required Images", admin: { description: "Photos, product images, or background imagery needed." } },
            { name: "canvaDirection", type: "textarea", label: "Canva Direction", admin: { description: "Design direction for future Canva integration." } },
          ],
        },

        // ── Generated Content ─────────────────────────────────────────────────
        {
          label: "Generated Content",
          admin: { description: "AI content scaffolding — ready for future generation integration." },
          fields: [
            { name: "generatedHeadlineOptions", type: "textarea", label: "Generated Headline Options" },
            { name: "generatedCopy",            type: "textarea", label: "Generated Body Copy" },
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
        { label: "Designing", value: "designing" },
        { label: "Review",    value: "review" },
        { label: "Approved",  value: "approved" },
        { label: "Delivered", value: "delivered" },
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
