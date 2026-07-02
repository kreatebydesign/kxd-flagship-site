import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

const EVENT_TYPES = [
  { label: "Proposal Approved", value: "revenue.proposal-approved" },
  { label: "Proposal Converted", value: "revenue.proposal-converted" },
  { label: "Contract Signed", value: "revenue.contract-signed" },
  { label: "Retainer Started", value: "revenue.retainer-started" },
  { label: "Retainer Renewed", value: "revenue.retainer-renewed" },
  { label: "Retainer Ended", value: "revenue.retainer-ended" },
  { label: "Project Launched", value: "revenue.project-launched" },
  { label: "Project Completed", value: "revenue.project-completed" },
  { label: "Billing Setup Missing", value: "billing.setup-missing" },
  { label: "Revenue At Risk", value: "revenue.at-risk" },
  { label: "Revenue Recovered", value: "revenue.recovered" },
] as const;

export const RevenueEvents: CollectionConfig = {
  slug: "revenue-events",
  labels: { singular: "Revenue Event", plural: "Revenue Events" },
  defaultSort: "-occurredAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "title",
    defaultColumns: ["client", "eventType", "amount", "occurredAt"],
    group: PAYLOAD_GROUPS.kxdOs,
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
      admin: { position: "sidebar" },
    },
    {
      name: "proposal",
      type: "relationship",
      relationTo: "proposals",
      admin: { position: "sidebar" },
    },
    {
      name: "contract",
      type: "relationship",
      relationTo: "contracts" as "clients",
      admin: { position: "sidebar" },
    },
    {
      name: "retainer",
      type: "relationship",
      relationTo: "retainers",
      admin: { position: "sidebar" },
    },
    {
      name: "project",
      type: "relationship",
      relationTo: "client-projects",
      admin: { position: "sidebar" },
    },
    {
      name: "eventType",
      type: "select",
      required: true,
      options: [...EVENT_TYPES],
      admin: { position: "sidebar" },
    },
    { name: "title", type: "text", required: true },
    { name: "summary", type: "textarea" },
    { name: "amount", type: "number", label: "Amount ($)" },
    {
      name: "occurredAt",
      type: "date",
      required: true,
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
    {
      name: "dedupeKey",
      type: "text",
      unique: true,
      admin: { readOnly: true, position: "sidebar" },
    },
    { name: "metadata", type: "json" },
  ],
};
