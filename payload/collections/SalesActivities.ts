import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";
import { onSalesActivityCreated } from "../hooks/sales-activities.ts";

export const SalesActivities: CollectionConfig = {
  slug: "sales-activities",
  labels: { singular: "Sales Activity", plural: "Sales Activities" },
  defaultSort: "-occurredAt",
  lockDocuments: false,
  hooks: {
    afterChange: [onSalesActivityCreated],
  },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "activityType", "lead", "client", "occurredAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description: "Sales activity log — calls, meetings, proposals, follow-ups.",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: "activityType",
      type: "select",
      required: true,
      label: "Activity Type",
      defaultValue: "note",
      options: [
        { label: "Call", value: "call" },
        { label: "Meeting", value: "meeting" },
        { label: "Email", value: "email" },
        { label: "Proposal Sent", value: "proposal-sent" },
        { label: "Proposal Viewed", value: "proposal-viewed" },
        { label: "Follow-Up", value: "follow-up" },
        { label: "Note", value: "note" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "lead",
      type: "relationship",
      relationTo: "sales-leads",
      label: "Lead",
      admin: { position: "sidebar" },
    },
    {
      name: "proposal",
      type: "relationship",
      relationTo: "proposals",
      label: "Proposal",
      admin: { position: "sidebar" },
    },
    {
      name: "client",
      type: "relationship",
      relationTo: "clients",
      label: "Client",
      admin: { position: "sidebar" },
    },
    { name: "title", type: "text", required: true, label: "Title" },
    { name: "summary", type: "textarea", label: "Summary" },
    {
      name: "occurredAt",
      type: "date",
      required: true,
      label: "Occurred At",
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
    {
      name: "timelinePublished",
      type: "checkbox",
      label: "Timeline Published",
      defaultValue: false,
      admin: { readOnly: true, position: "sidebar" },
    },
  ],
};
