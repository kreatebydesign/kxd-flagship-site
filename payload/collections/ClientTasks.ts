import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";
import { publishClientTaskActivityHook } from "../hooks/client-tasks.ts";

const SOURCE_TYPES = [
  { label: "Client Request", value: "client-request" },
  { label: "Monthly Deliverable", value: "monthly-deliverable" },
  { label: "Project Task", value: "project-task" },
  { label: "Follow-up", value: "follow-up" },
  { label: "Admin Task", value: "admin-task" },
  { label: "Upgrade Offer", value: "upgrade-offer" },
  { label: "Growth Opportunity", value: "growth-opportunity" },
  { label: "Playbook Step", value: "playbook-step" },
  { label: "Portal Request", value: "portal-request" },
  { label: "Retainer Task", value: "retainer-task" },
  { label: "Content", value: "content" },
  { label: "Website", value: "website" },
  { label: "SEO", value: "seo" },
  { label: "Ads", value: "ads" },
  { label: "Internal", value: "internal" },
  { label: "Manual", value: "manual" },
] as const;

const CATEGORIES = [
  { label: "Website", value: "website" },
  { label: "SEO", value: "seo" },
  { label: "Branding", value: "branding" },
  { label: "Design", value: "design" },
  { label: "Marketing", value: "marketing" },
  { label: "CRM", value: "crm" },
  { label: "Automation", value: "automation" },
  { label: "Hosting", value: "hosting" },
  { label: "Infrastructure", value: "infrastructure" },
  { label: "Content", value: "content" },
  { label: "Reporting", value: "reporting" },
  { label: "General", value: "general" },
] as const;

const PRIORITIES = [
  { label: "Critical", value: "critical" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
] as const;

const STATUSES = [
  { label: "Backlog", value: "backlog" },
  { label: "To Do", value: "to-do" },
  { label: "In Progress", value: "in-progress" },
  { label: "Review", value: "review" },
  { label: "Waiting On Client", value: "waiting-on-client" },
  { label: "Waiting On KXD", value: "waiting-on-kxd" },
  { label: "Blocked", value: "blocked" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
] as const;

export const ClientTasks: CollectionConfig = {
  slug: "client-tasks",
  labels: { singular: "Work Item", plural: "Work Items" },
  defaultSort: "-updatedAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "client", "sourceType", "status", "priority", "dueDate", "assignedTo", "updatedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description: "KXD Work Items — day-to-day execution. OS: /admin/operations/work",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  hooks: {
    afterChange: [publishClientTaskActivityHook],
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
      name: "project",
      type: "relationship",
      relationTo: "client-projects",
      label: "Project",
      admin: { position: "sidebar" },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "backlog",
      label: "Status",
      options: [...STATUSES],
      admin: { position: "sidebar" },
    },
    {
      name: "priority",
      type: "select",
      required: true,
      defaultValue: "medium",
      label: "Priority",
      options: [...PRIORITIES],
      admin: { position: "sidebar" },
    },
    {
      name: "sourceType",
      type: "select",
      label: "Source Type",
      defaultValue: "manual",
      options: [...SOURCE_TYPES],
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
      admin: { position: "sidebar" },
    },
    {
      name: "dueDate",
      type: "date",
      label: "Due Date",
      admin: { date: { pickerAppearance: "dayOnly" }, position: "sidebar" },
    },
    {
      name: "startDate",
      type: "date",
      label: "Start Date",
      admin: { date: { pickerAppearance: "dayOnly" }, position: "sidebar" },
    },
    {
      name: "completedDate",
      type: "date",
      label: "Completed Date",
      admin: { date: { pickerAppearance: "dayAndTime" }, position: "sidebar" },
    },
    {
      name: "estimatedHours",
      type: "number",
      label: "Estimated Hours",
      admin: { position: "sidebar" },
    },
    {
      name: "actualHours",
      type: "number",
      label: "Actual Hours",
      admin: { position: "sidebar" },
    },
    {
      name: "clientVisible",
      type: "checkbox",
      label: "Client Visible",
      defaultValue: true,
      admin: { position: "sidebar", description: "Show in Client HQ when enabled" },
    },
    {
      type: "tabs",
      tabs: [
        {
          label: "Task",
          fields: [
            { name: "title", type: "text", required: true, label: "Title" },
            { name: "description", type: "textarea", label: "Description" },
            { name: "blockedReason", type: "textarea", label: "Blocked Reason" },
            { name: "createdFrom", type: "text", label: "Created From" },
            { name: "notes", type: "textarea", label: "Notes" },
            {
              name: "internalNotes",
              type: "textarea",
              label: "Internal Notes",
              admin: { description: "Admin-only — not shown in Client HQ." },
            },
            {
              name: "dependencies",
              type: "json",
              label: "Dependencies",
              admin: { description: "Future-ready dependency graph (JSON)" },
            },
            {
              name: "labels",
              type: "array",
              label: "Labels",
              fields: [{ name: "label", type: "text", required: true }],
            },
            {
              name: "attachments",
              type: "array",
              label: "Attachments",
              fields: [
                { name: "label", type: "text", label: "Label" },
                { name: "url", type: "text", label: "URL" },
              ],
            },
          ],
        },
        {
          label: "Related",
          fields: [
            {
              name: "relatedDeliverable",
              type: "relationship",
              relationTo: "monthly-deliverables",
              label: "Related Deliverable",
            },
            {
              name: "relatedRequest",
              type: "relationship",
              relationTo: "client-requests",
              label: "Related Request",
            },
            {
              name: "relatedPlaybook",
              type: "relationship",
              relationTo: "playbooks",
              label: "Related Playbook",
            },
            {
              name: "relatedReport",
              type: "relationship",
              relationTo: "monthly-reports",
              label: "Related Report",
            },
            {
              name: "relatedProposal",
              type: "relationship",
              relationTo: "proposals",
              label: "Related Proposal",
            },
            {
              name: "relatedRetainer",
              type: "relationship",
              relationTo: "retainers",
              label: "Related Retainer",
            },
            {
              name: "relatedUpgradeOfferId",
              type: "number",
              label: "Related Upgrade Offer ID",
              admin: {
                description: "Phase 12A.4 will link upgrade-offers collection.",
              },
            },
          ],
        },
      ],
    },
  ],
};
