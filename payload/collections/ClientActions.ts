import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";
import { publishClientActionActivityHook } from "../hooks/client-actions.ts";

const SOURCES = [
  { label: "Communication", value: "Communication" },
  { label: "Intelligence", value: "Intelligence" },
  { label: "Executive", value: "Executive" },
  { label: "Timeline", value: "Timeline" },
  { label: "Manual", value: "Manual" },
  { label: "Revenue", value: "Revenue" },
  { label: "Retention", value: "Retention" },
] as const;

const PRIORITIES = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Critical", value: "critical" },
] as const;

const STATUSES = [
  { label: "Pending", value: "pending" },
  { label: "In Progress", value: "in-progress" },
  { label: "Waiting", value: "waiting" },
  { label: "Completed", value: "completed" },
  { label: "Dismissed", value: "dismissed" },
  { label: "Archived", value: "archived" },
] as const;

const ACTION_TYPES = [
  { label: "Follow Up", value: "follow-up" },
  { label: "Email", value: "email" },
  { label: "Phone Call", value: "phone-call" },
  { label: "Meeting", value: "meeting" },
  { label: "Proposal", value: "proposal" },
  { label: "Upsell", value: "upsell" },
  { label: "Task", value: "task" },
  { label: "Project", value: "project" },
  { label: "Reminder", value: "reminder" },
  { label: "Custom", value: "custom" },
] as const;

export const ClientActions: CollectionConfig = {
  slug: "client-actions",
  labels: { singular: "Client Action", plural: "Client Actions" },
  defaultSort: "-dueDate",
  lockDocuments: false,
  admin: {
    useAsTitle: "title",
    defaultColumns: [
      "client",
      "title",
      "source",
      "priority",
      "status",
      "actionType",
      "dueDate",
      "assignedTo",
      "updatedAt",
    ],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Executive actions from Client Intelligence and manual workflow. " +
      "Workspace: /admin/operations/client-command/[clientId]?tab=actions",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  hooks: {
    afterChange: [publishClientActionActivityHook],
  },
  fields: [
    {
      name: "client",
      type: "relationship",
      relationTo: "clients",
      required: true,
      admin: { position: "sidebar" },
    },
    {
      name: "title",
      type: "text",
      required: true,
    },
    {
      name: "description",
      type: "textarea",
    },
    {
      name: "source",
      type: "select",
      required: true,
      defaultValue: "Manual",
      options: [...SOURCES],
      admin: { position: "sidebar" },
    },
    {
      name: "priority",
      type: "select",
      required: true,
      defaultValue: "medium",
      options: [...PRIORITIES],
      admin: { position: "sidebar" },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "pending",
      options: [...STATUSES],
      admin: { position: "sidebar" },
    },
    {
      name: "actionType",
      type: "select",
      required: true,
      defaultValue: "task",
      options: [...ACTION_TYPES],
      admin: { position: "sidebar" },
    },
    {
      name: "createdBy",
      type: "text",
      label: "Created By",
      admin: { position: "sidebar" },
    },
    {
      name: "assignedTo",
      type: "text",
      label: "Assigned To",
      admin: { position: "sidebar" },
    },
    {
      name: "dueDate",
      type: "date",
      label: "Due Date",
      admin: { date: { pickerAppearance: "dayAndTime" }, position: "sidebar" },
    },
    {
      name: "completedDate",
      type: "date",
      label: "Completed Date",
      admin: { date: { pickerAppearance: "dayAndTime" }, position: "sidebar" },
    },
    {
      name: "relatedCommunication",
      type: "relationship",
      relationTo: "client-communications" as any,
      label: "Related Communication",
    },
    {
      name: "relatedProject",
      type: "relationship",
      relationTo: "client-projects",
      label: "Related Project",
    },
    {
      name: "relatedRequest",
      type: "relationship",
      relationTo: "client-requests",
      label: "Related Request",
    },
    {
      name: "relatedTimelineEvent",
      type: "relationship",
      relationTo: "executive-timeline-events",
      label: "Related Timeline Event",
    },
    {
      name: "memoryReference",
      type: "text",
      label: "Memory Reference",
      admin: {
        description: "Dedupe key from Client Intelligence (e.g. intel:action-no-retainer).",
        position: "sidebar",
      },
    },
    {
      name: "executiveNotes",
      type: "textarea",
      label: "Executive Notes",
    },
    {
      name: "result",
      type: "textarea",
      label: "Result",
    },
    {
      name: "completionNotes",
      type: "textarea",
      label: "Completion Notes",
    },
  ],
};
