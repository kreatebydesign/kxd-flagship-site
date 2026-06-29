import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";
import { publishCommunicationActivityHook } from "../hooks/client-communications.ts";

const COMMUNICATION_TYPES = [
  { label: "Email", value: "email" },
  { label: "Call", value: "call" },
  { label: "Meeting", value: "meeting" },
  { label: "Text", value: "text" },
  { label: "Note", value: "note" },
  { label: "Form Submission", value: "form_submission" },
  { label: "Campaign Update", value: "campaign_update" },
  { label: "Support Follow-up", value: "support_followup" },
] as const;

const DIRECTIONS = [
  { label: "Inbound", value: "inbound" },
  { label: "Outbound", value: "outbound" },
  { label: "Internal", value: "internal" },
] as const;

const STATUSES = [
  { label: "Logged", value: "logged" },
  { label: "Needs Reply", value: "needs_reply" },
  { label: "Replied", value: "replied" },
  { label: "Resolved", value: "resolved" },
  { label: "Archived", value: "archived" },
] as const;

const PRIORITIES = [
  { label: "Low", value: "low" },
  { label: "Normal", value: "normal" },
  { label: "High", value: "high" },
  { label: "Urgent", value: "urgent" },
] as const;

export const ClientCommunications: CollectionConfig = {
  slug: "client-communications",
  labels: { singular: "Client Communication", plural: "Client Communications" },
  defaultSort: "-date",
  lockDocuments: false,
  admin: {
    useAsTitle: "subject",
    defaultColumns: [
      "client",
      "type",
      "direction",
      "status",
      "priority",
      "date",
      "followUpDate",
      "updatedAt",
    ],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Client correspondence and touchpoints — emails, calls, meetings, and follow-ups. " +
      "Workspace: /admin/operations/client-command/[clientId]?tab=emails",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  hooks: {
    afterChange: [publishCommunicationActivityHook],
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
      name: "type",
      type: "select",
      required: true,
      defaultValue: "email",
      options: [...COMMUNICATION_TYPES],
      admin: { position: "sidebar" },
    },
    {
      name: "direction",
      type: "select",
      required: true,
      defaultValue: "outbound",
      options: [...DIRECTIONS],
      admin: { position: "sidebar" },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "logged",
      options: [...STATUSES],
      admin: { position: "sidebar" },
    },
    {
      name: "priority",
      type: "select",
      required: true,
      defaultValue: "normal",
      options: [...PRIORITIES],
      admin: { position: "sidebar" },
    },
    {
      name: "date",
      type: "date",
      required: true,
      label: "Communication Date",
      admin: { date: { pickerAppearance: "dayAndTime" }, position: "sidebar" },
    },
    {
      name: "followUpDate",
      type: "date",
      label: "Follow-Up Date",
      admin: { date: { pickerAppearance: "dayOnly" }, position: "sidebar" },
    },
    {
      name: "subject",
      type: "text",
      label: "Subject",
    },
    {
      name: "summary",
      type: "textarea",
      label: "Summary",
    },
    {
      name: "bodyPreview",
      type: "textarea",
      label: "Body Preview",
      admin: { description: "Short excerpt — full inbox sync comes in a future phase." },
    },
    {
      name: "contactName",
      type: "text",
      label: "Contact Name",
    },
    {
      name: "contactEmail",
      type: "email",
      label: "Contact Email",
    },
    {
      name: "participants",
      type: "array",
      label: "Participants",
      fields: [
        { name: "name", type: "text", label: "Name" },
        { name: "email", type: "email", label: "Email" },
      ],
    },
    {
      name: "source",
      type: "text",
      label: "Source",
      admin: { description: "e.g. manual, gmail, resend, contact-form" },
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
      name: "metadata",
      type: "json",
      label: "Metadata",
      admin: { description: "Integration payloads — Gmail thread ID, Resend event ID, etc." },
    },
  ],
};
