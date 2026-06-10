import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const CreativeCampaigns: CollectionConfig = {
  slug: "creative-campaigns",
  labels: { singular: "Campaign", plural: "Campaigns" },
  defaultSort: "-createdAt",
  admin: {
    useAsTitle: "campaignTitle",
    defaultColumns: ["campaignTitle", "client", "campaignType", "status", "priority", "launchDate"],
    group: PAYLOAD_GROUPS.creativeEngine,
    description: "Full creative & marketing campaigns for clients. Includes copy generation scaffolding for future AI integration.",
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
            { name: "campaignTitle", type: "text", required: true, label: "Campaign Title" },
            { name: "slug", type: "text", required: true, unique: true, label: "Slug" },
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
            },
            {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              name: "brandKit", type: "relationship", relationTo: "brand-kits" as any, label: "Brand Kit",
              admin: { description: "Brand kit driving the visual and copy direction for this campaign." },
            },
            {
              name: "campaignType",
              type: "select",
              label: "Campaign Type",
              options: [
                { label: "Launch",         value: "launch" },
                { label: "Event",          value: "event" },
                { label: "Promotion",      value: "promotion" },
                { label: "Seasonal",       value: "seasonal" },
                { label: "Content Series", value: "content-series" },
                { label: "Website Launch", value: "website-launch" },
                { label: "Brand Launch",   value: "brand-launch" },
                { label: "Announcement",   value: "announcement" },
                { label: "Other",          value: "other" },
              ],
            },
            {
              name: "platforms",
              type: "select",
              label: "Target Platforms",
              hasMany: true,
              options: [
                { label: "Facebook",  value: "facebook" },
                { label: "Instagram", value: "instagram" },
                { label: "LinkedIn",  value: "linkedin" },
                { label: "Website",   value: "website" },
                { label: "Email",     value: "email" },
                { label: "Print",     value: "print" },
                { label: "Reels",     value: "reels" },
                { label: "Stories",   value: "stories" },
                { label: "YouTube",   value: "youtube" },
                { label: "Other",     value: "other" },
              ],
            },
            { name: "goal",     type: "textarea", label: "Campaign Goal" },
            { name: "audience", type: "textarea", label: "Target Audience" },
          ],
        },

        // ── Dates ─────────────────────────────────────────────────────────────
        {
          label: "Dates",
          fields: [
            { name: "startDate",    type: "date", label: "Start Date",   admin: { date: { pickerAppearance: "dayOnly" } } },
            { name: "launchDate",   type: "date", label: "Launch Date",  admin: { date: { pickerAppearance: "dayOnly" } } },
            { name: "deadline",     type: "date", label: "Deadline",     admin: { date: { pickerAppearance: "dayOnly" } } },
            { name: "nextAction",         type: "text", label: "Next Action" },
            { name: "nextActionDueDate",  type: "date", label: "Next Action Due", admin: { date: { pickerAppearance: "dayOnly" } } },
          ],
        },

        // ── Messaging ─────────────────────────────────────────────────────────
        {
          label: "Messaging",
          fields: [
            { name: "campaignMessage", type: "textarea", label: "Core Campaign Message" },
            { name: "primaryCTA",      type: "text",     label: "Primary CTA" },
            { name: "secondaryCTA",    type: "text",     label: "Secondary CTA" },
            { name: "internalNotes",   type: "textarea", label: "Internal Notes" },
          ],
        },

        // ── Generated Content ─────────────────────────────────────────────────
        {
          label: "Generated Content",
          admin: { description: "AI copy generation scaffolding — fields available for future integration." },
          fields: [
            { name: "generatedPostCopy",      type: "textarea", label: "Generated Post Copy" },
            { name: "generatedCaption",       type: "textarea", label: "Generated Caption" },
            { name: "generatedEmailCopy",     type: "textarea", label: "Generated Email Copy" },
            { name: "generatedVideoScript",   type: "textarea", label: "Generated Video Script" },
            { name: "generatedFlyerDirection",type: "textarea", label: "Generated Flyer Direction" },
          ],
        },

        // ── Spawn Engine ──────────────────────────────────────────────────────
        {
          label: "Spawn Engine",
          admin: {
            description: "Configure how many creative work items this campaign should generate when triggered via POST /api/admin/creative/campaigns/spawn. Execution is always manual — nothing runs automatically.",
          },
          fields: [
            {
              name: "autoGenerate",
              type: "checkbox",
              label: "Enable Spawn",
              defaultValue: false,
              admin: {
                description: "Mark this campaign as spawn-ready. Does not trigger generation — use the API to execute.",
              },
            },
            {
              name: "generationConfig",
              type: "group",
              label: "Generation Config",
              admin: {
                description: "How many items to create per type when spawn is triggered. Existing items linked to this campaign are counted first — only the deficit is created.",
              },
              fields: [
                {
                  name: "flyers",
                  type: "number",
                  label: "Flyer Requests",
                  defaultValue: 0,
                  min: 0,
                  max: 20,
                  admin: { description: "Number of flyer requests to generate." },
                },
                {
                  name: "socialPosts",
                  type: "number",
                  label: "Social Post Requests",
                  defaultValue: 0,
                  min: 0,
                  max: 20,
                  admin: { description: "Number of social post requests to generate." },
                },
                {
                  name: "videos",
                  type: "number",
                  label: "Promo Video Requests",
                  defaultValue: 0,
                  min: 0,
                  max: 10,
                  admin: { description: "Number of promo video requests to generate." },
                },
                {
                  name: "createBrandKit",
                  type: "checkbox",
                  label: "Create Brand Kit",
                  defaultValue: false,
                  admin: { description: "Create one brand kit linked to this campaign if one doesn't already exist." },
                },
              ],
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
      defaultValue: "draft",
      options: [
        { label: "Draft",     value: "draft" },
        { label: "Planning",  value: "planning" },
        { label: "Active",    value: "active" },
        { label: "In Review", value: "in-review" },
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
