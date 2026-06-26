import type { CollectionConfig } from "payload";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

const NOTE_TYPES = [
  { label: "Strategy", value: "strategy" },
  { label: "Meeting", value: "meeting" },
  { label: "Opportunity", value: "opportunity" },
  { label: "Research", value: "research" },
  { label: "Sales", value: "sales" },
  { label: "Website", value: "website" },
  { label: "Infrastructure", value: "infrastructure" },
  { label: "Marketing", value: "marketing" },
  { label: "Finance", value: "finance" },
  { label: "Relationship", value: "relationship" },
  { label: "Personal", value: "personal" },
  { label: "Follow-up", value: "follow-up" },
  { label: "Internal", value: "internal" },
] as const;

export const ExecutiveNotes: CollectionConfig = {
  slug: "executive-notes",
  labels: { singular: "Executive Note", plural: "Executive Notes" },
  defaultSort: "-updatedAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "title",
    defaultColumns: [
      "title",
      "client",
      "noteType",
      "priority",
      "pinned",
      "reminderDate",
      "updatedAt",
    ],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Executive knowledge base — institutional memory for every client relationship. " +
      "Vault: /admin/operations/strategy",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (!data) return data;
        const parts: string[] = [];
        if (data.title) parts.push(String(data.title));
        if (data.summary) parts.push(String(data.summary));
        if (Array.isArray(data.tags)) {
          parts.push(...data.tags.map((t: { tag?: string } | string) =>
            typeof t === "string" ? t : String(t.tag ?? ""),
          ));
        }
        if (parts.length) data.searchKeywords = parts.join(" ").toLowerCase();
        return data;
      },
    ],
  },
  fields: [
    {
      name: "client",
      type: "relationship",
      relationTo: "clients",
      required: true,
      label: "Client",
      admin: { position: "sidebar" },
    },
    {
      name: "title",
      type: "text",
      required: true,
      label: "Title",
    },
    {
      name: "summary",
      type: "textarea",
      label: "Summary",
      admin: { description: "Plain-text preview used in vault search and command center." },
    },
    {
      name: "content",
      type: "richText",
      editor: lexicalEditor(),
      label: "Content",
    },
    {
      name: "noteType",
      type: "select",
      required: true,
      defaultValue: "strategy",
      label: "Note Type",
      options: [...NOTE_TYPES],
      admin: { position: "sidebar" },
    },
    {
      name: "priority",
      type: "select",
      required: true,
      defaultValue: "normal",
      label: "Priority",
      options: [
        { label: "Low", value: "low" },
        { label: "Normal", value: "normal" },
        { label: "High", value: "high" },
        { label: "Critical", value: "critical" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "active",
      label: "Status",
      options: [
        { label: "Active", value: "active" },
        { label: "Archived", value: "archived" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "pinned",
      type: "checkbox",
      label: "Pinned",
      defaultValue: false,
      admin: { position: "sidebar" },
    },
    {
      name: "private",
      type: "checkbox",
      label: "Private",
      defaultValue: false,
      admin: {
        position: "sidebar",
        description: "Internal-only — never surfaced to Client HQ.",
      },
    },
    {
      name: "reminderDate",
      type: "date",
      label: "Reminder Date",
      admin: {
        position: "sidebar",
        date: { pickerAppearance: "dayOnly" },
      },
    },
    {
      name: "author",
      type: "text",
      label: "Author",
      admin: { position: "sidebar" },
    },
    {
      type: "tabs",
      tabs: [
        {
          label: "Related",
          fields: [
            {
              name: "relatedProjects",
              type: "relationship",
              relationTo: "client-projects",
              hasMany: true,
              label: "Projects",
            },
            {
              name: "relatedReports",
              type: "relationship",
              relationTo: "monthly-reports",
              hasMany: true,
              label: "Reports",
            },
            {
              name: "relatedProposals",
              type: "relationship",
              relationTo: "proposals",
              hasMany: true,
              label: "Proposals",
            },
            {
              name: "relatedAssets",
              type: "relationship",
              relationTo: "creative-assets",
              hasMany: true,
              label: "Assets",
            },
            {
              name: "relatedAudits",
              type: "relationship",
              relationTo: "website-audits",
              hasMany: true,
              label: "Website Audits",
            },
            {
              name: "relatedInfrastructure",
              type: "relationship",
              relationTo: "client-infrastructure",
              hasMany: true,
              label: "Infrastructure",
            },
            {
              name: "relatedAutomationEvents",
              type: "relationship",
              relationTo: "automation-events",
              hasMany: true,
              label: "Automation Events",
            },
            {
              name: "timelineEvent",
              type: "relationship",
              relationTo: "executive-timeline-events",
              label: "Linked Timeline Event",
              admin: { description: "Set when this note was promoted to the executive timeline." },
            },
          ],
        },
        {
          label: "Attachments",
          fields: [
            {
              name: "attachments",
              type: "array",
              label: "Attachments",
              fields: [
                {
                  name: "file",
                  type: "upload",
                  relationTo: "media",
                  required: true,
                  label: "File",
                },
                {
                  name: "caption",
                  type: "text",
                  label: "Caption",
                },
              ],
            },
          ],
        },
        {
          label: "Search",
          fields: [
            {
              name: "tags",
              type: "array",
              label: "Tags",
              fields: [{ name: "tag", type: "text", required: true, label: "Tag" }],
            },
            {
              name: "searchKeywords",
              type: "text",
              label: "Search Keywords",
              admin: {
                readOnly: true,
                description: "Auto-generated from title, summary, and tags.",
              },
            },
          ],
        },
      ],
    },
  ],
};
