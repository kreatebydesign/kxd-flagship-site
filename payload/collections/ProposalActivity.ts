import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

const EVENT_TYPES = [
  { label: "Created", value: "proposal.created" },
  { label: "Internal Review", value: "proposal.internal-review" },
  { label: "Sent", value: "proposal.sent" },
  { label: "Viewed", value: "proposal.viewed" },
  { label: "Question", value: "proposal.question" },
  { label: "Revised", value: "proposal.revised" },
  { label: "Approved", value: "proposal.approved" },
  { label: "Declined", value: "proposal.declined" },
  { label: "Expired", value: "proposal.expired" },
  { label: "Archived", value: "proposal.archived" },
] as const;

export const ProposalActivity: CollectionConfig = {
  slug: "proposal-activity",
  labels: { singular: "Proposal Activity", plural: "Proposal Activity" },
  defaultSort: "-occurredAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "title",
    defaultColumns: ["proposal", "eventType", "title", "actor", "occurredAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description: "Executive proposal lifecycle activity log.",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: "proposal",
      type: "relationship",
      relationTo: "proposals",
      required: true,
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
    {
      name: "eventType",
      type: "select",
      required: true,
      options: [...EVENT_TYPES],
      admin: { position: "sidebar" },
    },
    { name: "title", type: "text", required: true, label: "Title" },
    { name: "summary", type: "textarea", label: "Summary" },
    { name: "actor", type: "text", label: "Actor" },
    {
      name: "occurredAt",
      type: "date",
      required: true,
      label: "Occurred At",
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
    {
      name: "metadata",
      type: "json",
      label: "Metadata",
    },
  ],
};
