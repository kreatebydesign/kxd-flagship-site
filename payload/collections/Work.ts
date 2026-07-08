import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";
import { publishWorkActivityHook } from "../hooks/work.ts";

const SOURCES = [
  { label: "Website Review", value: "website-review" },
  { label: "Client Request", value: "client-request" },
  { label: "Communication", value: "communication" },
  { label: "Manual", value: "manual" },
  { label: "AI (future)", value: "future-ai" },
  { label: "Automation (future)", value: "future-automation" },
  { label: "Onboarding (future)", value: "future-onboarding" },
  { label: "Brand Center (future)", value: "future-brand-center" },
  { label: "Marketing (future)", value: "future-marketing" },
] as const;

const CATEGORIES = [
  { label: "Website", value: "website" },
  { label: "Creative", value: "creative" },
  { label: "Content", value: "content" },
  { label: "Strategy", value: "strategy" },
  { label: "Communication", value: "communication" },
  { label: "Onboarding", value: "onboarding" },
  { label: "Reporting", value: "reporting" },
  { label: "Operations", value: "operations" },
  { label: "General", value: "general" },
] as const;

const STATUSES = [
  { label: "New", value: "new" },
  { label: "Planned", value: "planned" },
  { label: "In Progress", value: "in-progress" },
  { label: "Waiting on Client", value: "waiting-on-client" },
  { label: "Blocked", value: "blocked" },
  { label: "Review", value: "review" },
  { label: "Completed", value: "completed" },
  { label: "Archived", value: "archived" },
] as const;

const PRIORITIES = [
  { label: "Low", value: "low" },
  { label: "Normal", value: "normal" },
  { label: "High", value: "high" },
  { label: "Critical", value: "critical" },
] as const;

export const Work: CollectionConfig = {
  slug: "work",
  labels: { singular: "Work", plural: "Work" },
  defaultSort: "-updatedAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "title",
    defaultColumns: [
      "title",
      "client",
      "source",
      "status",
      "priority",
      "category",
      "clientVisible",
      "updatedAt",
    ],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "KXD Work Engine — operational heartbeat of every client relationship. OS: /admin/operations/work",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  hooks: {
    afterChange: [publishWorkActivityHook],
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
      name: "status",
      type: "select",
      required: true,
      defaultValue: "new",
      label: "Status",
      options: [...STATUSES],
      admin: { position: "sidebar" },
    },
    {
      name: "priority",
      type: "select",
      required: true,
      defaultValue: "normal",
      label: "Priority",
      options: [...PRIORITIES],
      admin: { position: "sidebar" },
    },
    {
      name: "source",
      type: "select",
      required: true,
      defaultValue: "manual",
      label: "Source",
      options: [...SOURCES],
      admin: { position: "sidebar" },
    },
    {
      name: "category",
      type: "select",
      required: true,
      defaultValue: "general",
      label: "Category",
      options: [...CATEGORIES],
      admin: { position: "sidebar" },
    },
    {
      name: "assignedTo",
      type: "relationship",
      relationTo: "users",
      label: "Assigned To",
      admin: { position: "sidebar", description: "Assignment-ready — future operator routing." },
    },
    {
      name: "clientVisible",
      type: "checkbox",
      label: "Client Visible",
      defaultValue: false,
      admin: {
        position: "sidebar",
        description: "When enabled, work may surface in future client experiences.",
      },
    },
    {
      name: "timelineEnabled",
      type: "checkbox",
      label: "Timeline Enabled",
      defaultValue: true,
      admin: {
        position: "sidebar",
        description: "Publish relationship history to the executive timeline when work moves.",
      },
    },
    {
      name: "dueDate",
      type: "date",
      label: "Due Date",
      admin: { date: { pickerAppearance: "dayOnly" }, position: "sidebar" },
    },
    {
      name: "startedAt",
      type: "date",
      label: "Started At",
      admin: { date: { pickerAppearance: "dayAndTime" }, position: "sidebar" },
    },
    {
      name: "completedAt",
      type: "date",
      label: "Completed At",
      admin: { date: { pickerAppearance: "dayAndTime" }, position: "sidebar" },
    },
    {
      type: "tabs",
      tabs: [
        {
          label: "Work",
          fields: [
            { name: "title", type: "text", required: true, label: "Title" },
            {
              name: "summary",
              type: "textarea",
              label: "Summary",
              admin: { description: "Concise context — what this work represents for the relationship." },
            },
            {
              name: "sourceId",
              type: "text",
              label: "Source ID",
              admin: {
                description: "External record identifier (request id, review id, etc.). Used for idempotent spawning.",
              },
            },
            {
              name: "createdBy",
              type: "text",
              label: "Created By",
              admin: { description: "Operator email or system identifier." },
            },
            {
              name: "metadata",
              type: "json",
              label: "Metadata",
              admin: { description: "Structured context for AI, reporting, and future automation." },
            },
          ],
        },
      ],
    },
  ],
};
