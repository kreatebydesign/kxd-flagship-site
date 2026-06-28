import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

const STATUSES = [
  { label: "Draft", value: "draft" },
  { label: "In Progress", value: "in-progress" },
  { label: "Blocked", value: "blocked" },
  { label: "Ready", value: "ready" },
  { label: "Approved", value: "approved" },
  { label: "Launched", value: "launched" },
  { label: "Archived", value: "archived" },
] as const;

const RECOMMENDATIONS = [
  { label: "Not Ready", value: "not-ready" },
  { label: "Needs Review", value: "needs-review" },
  { label: "Ready to Launch", value: "ready-to-launch" },
  { label: "Approved", value: "approved" },
] as const;

export const WebsiteQAChecks: CollectionConfig = {
  slug: "website-qa-checks",
  labels: { singular: "Website QA Check", plural: "Website QA Checks" },
  defaultSort: "-updatedAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "websiteUrl",
    defaultColumns: ["client", "websiteUrl", "status", "readinessScore", "launchDate", "updatedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description: "Launch QA & readiness — OS: /admin/operations/launch-qa",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
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
      name: "websiteUrl",
      type: "text",
      label: "Website URL",
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "draft",
      options: [...STATUSES],
      admin: { position: "sidebar" },
    },
    {
      name: "launchDate",
      type: "date",
      label: "Launch Date",
      admin: { position: "sidebar" },
    },
    {
      name: "readinessScore",
      type: "number",
      label: "Readiness Score",
      defaultValue: 0,
      admin: { position: "sidebar" },
    },
    {
      name: "recommendation",
      type: "select",
      defaultValue: "not-ready",
      options: [...RECOMMENDATIONS],
      label: "Launch Recommendation",
      admin: { position: "sidebar" },
    },
    {
      name: "checkedBy",
      type: "text",
      label: "Checked By",
      admin: { position: "sidebar" },
    },
    {
      name: "approvedBy",
      type: "text",
      label: "Approved By",
      admin: { position: "sidebar" },
    },
    {
      name: "completedAt",
      type: "date",
      label: "Completed At",
      admin: { position: "sidebar" },
    },
    {
      name: "approvedAt",
      type: "date",
      label: "Approved At",
      admin: { position: "sidebar" },
    },
    {
      name: "notes",
      type: "textarea",
      label: "Notes",
    },
    {
      name: "categories",
      type: "json",
      label: "Category Summaries",
    },
    {
      name: "checklistItems",
      type: "json",
      required: true,
      label: "Checklist Items",
    },
    {
      name: "blockers",
      type: "json",
      label: "Blockers",
    },
    {
      name: "warnings",
      type: "json",
      label: "Warnings",
    },
    {
      name: "metadata",
      type: "json",
      label: "Metadata",
    },
  ],
};
