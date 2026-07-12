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
  { label: "Inbox", value: "new" },
  { label: "Planned", value: "planned" },
  { label: "In Progress", value: "in-progress" },
  { label: "Waiting on Client", value: "waiting-on-client" },
  { label: "Waiting on KXD", value: "waiting-on-kxd" },
  { label: "Blocked", value: "blocked" },
  { label: "Review", value: "review" },
  { label: "Completed", value: "completed" },
  { label: "Archived", value: "archived" },
] as const;

const PRIORITIES = [
  { label: "Critical", value: "critical" },
  { label: "High", value: "high" },
  { label: "Normal", value: "normal" },
  { label: "Low", value: "low" },
] as const;

/**
 * Phase 14B + 20A — Work Engine collection.
 * Execution layer for running the agency. OS: /admin/work
 */
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
      "status",
      "priority",
      "dueDate",
      "assignedTo",
      "updatedAt",
    ],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "KXD Work Engine — execution heartbeat of the agency. Workspace: /admin/work",
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
      required: false,
      label: "Client",
      admin: {
        position: "sidebar",
        description: "Optional — leave empty for internal studio work.",
      },
    },
    {
      name: "internalProject",
      type: "text",
      label: "Internal project",
      admin: {
        position: "sidebar",
        description: "Studio initiative or internal workstream label.",
      },
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
      admin: {
        position: "sidebar",
        description: "Team-ready assignment for future operator routing.",
      },
    },
    {
      name: "estimatedEffort",
      type: "number",
      label: "Estimated effort (hours)",
      admin: { position: "sidebar", step: 0.25 },
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
      name: "startDate",
      type: "date",
      label: "Start Date",
      admin: {
        date: { pickerAppearance: "dayOnly" },
        position: "sidebar",
        description: "Planned start — distinct from actual started timestamp.",
      },
    },
    {
      name: "dueDate",
      type: "date",
      label: "Due Date",
      admin: { date: { pickerAppearance: "dayOnly" }, position: "sidebar" },
    },
    {
      name: "plannedForDate",
      type: "date",
      label: "Planned for",
      admin: {
        date: { pickerAppearance: "dayOnly" },
        position: "sidebar",
        description:
          "Daily execution plan — place work on a day without changing the due date.",
      },
    },
    {
      name: "schedulingStatus",
      type: "select",
      label: "Scheduling status",
      defaultValue: "none",
      options: [
        { label: "None", value: "none" },
        { label: "Proposed", value: "proposed" },
        { label: "Approved", value: "approved" },
        { label: "Pending calendar write", value: "pending_calendar_write" },
        { label: "Scheduled", value: "scheduled" },
        { label: "Conflict", value: "conflict" },
        { label: "Sync error", value: "sync_error" },
      ],
      admin: {
        position: "sidebar",
        readOnly: true,
        description:
          "Projection only — updated exclusively by scheduling services. Scheduled requires a confirmed Google event.",
      },
    },
    {
      name: "scheduledStart",
      type: "date",
      label: "Scheduled start",
      admin: {
        date: { pickerAppearance: "dayAndTime" },
        position: "sidebar",
        readOnly: true,
        description: "Projection of active schedule link — not independently mutable.",
      },
    },
    {
      name: "scheduledEnd",
      type: "date",
      label: "Scheduled end",
      admin: {
        date: { pickerAppearance: "dayAndTime" },
        position: "sidebar",
        readOnly: true,
        description: "Projection of active schedule link — not independently mutable.",
      },
    },
    {
      name: "activeScheduleLink",
      type: "relationship",
      relationTo: "work-schedule-links",
      label: "Active schedule link",
      admin: {
        position: "sidebar",
        readOnly: true,
        description: "Canonical scheduling record — managed by lib/scheduling services.",
      },
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
      name: "parentWork",
      type: "relationship",
      relationTo: "work",
      label: "Parent work",
      admin: {
        position: "sidebar",
        description: "Future subtask relationship — optional parent work item.",
      },
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
              admin: {
                description: "Concise context — what this work represents.",
              },
            },
            {
              name: "description",
              type: "textarea",
              label: "Description",
              admin: {
                description: "Fuller brief for execution. Rich text may follow later.",
              },
            },
            {
              name: "notes",
              type: "textarea",
              label: "Notes",
              admin: { description: "Operator notes — internal only." },
            },
            {
              name: "tags",
              type: "array",
              label: "Tags",
              labels: { singular: "Tag", plural: "Tags" },
              fields: [
                {
                  name: "tag",
                  type: "text",
                  required: true,
                  label: "Tag",
                },
              ],
              admin: {
                description: "Lightweight labels for future filters and views.",
              },
            },
            {
              name: "sourceId",
              type: "text",
              label: "Source ID",
              admin: {
                description:
                  "External record identifier (request id, review id, etc.). Used for idempotent spawning.",
              },
            },
            {
              name: "createdBy",
              type: "text",
              label: "Created By",
              admin: { description: "Operator email or system identifier." },
            },
            {
              name: "activityHistory",
              type: "array",
              label: "Activity history",
              labels: { singular: "Entry", plural: "Entries" },
              admin: {
                description: "Append-only execution history. Timeline remains the relationship record.",
                readOnly: true,
              },
              fields: [
                { name: "at", type: "date", required: true, label: "At" },
                { name: "actor", type: "text", label: "Actor" },
                { name: "action", type: "text", required: true, label: "Action" },
                { name: "detail", type: "textarea", label: "Detail" },
              ],
            },
            {
              name: "attachments",
              type: "array",
              label: "Attachments",
              labels: { singular: "Attachment", plural: "Attachments" },
              admin: {
                description: "Future-ready attachment slots — upload plumbing comes later.",
              },
              fields: [
                {
                  name: "label",
                  type: "text",
                  label: "Label",
                },
                {
                  name: "media",
                  type: "upload",
                  relationTo: "media",
                  label: "File",
                },
              ],
            },
            {
              name: "metadata",
              type: "json",
              label: "Metadata",
              admin: {
                description:
                  "Structured context for AI, reporting, notifications, and future automation.",
              },
            },
          ],
        },
      ],
    },
  ],
};
