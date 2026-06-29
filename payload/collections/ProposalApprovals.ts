import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

const APPROVAL_ACTIONS = [
  { label: "Approved", value: "approved" },
  { label: "Declined", value: "declined" },
  { label: "Revision Requested", value: "revision-requested" },
  { label: "Questions", value: "questions" },
  { label: "Internal Approved", value: "internal-approved" },
  { label: "Sent for Review", value: "sent-for-review" },
] as const;

export const ProposalApprovals: CollectionConfig = {
  slug: "proposal-approvals",
  labels: { singular: "Proposal Approval", plural: "Proposal Approvals" },
  defaultSort: "-occurredAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "action",
    defaultColumns: ["proposal", "action", "actorName", "revisionNumber", "occurredAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description: "Proposal approval and revision history.",
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
      name: "action",
      type: "select",
      required: true,
      options: [...APPROVAL_ACTIONS],
      admin: { position: "sidebar" },
    },
    {
      name: "revisionNumber",
      type: "number",
      label: "Revision",
      defaultValue: 1,
      admin: { position: "sidebar" },
    },
    { name: "actorName", type: "text", label: "Actor Name" },
    { name: "actorEmail", type: "email", label: "Actor Email" },
    { name: "actorRole", type: "text", label: "Actor Role" },
    { name: "notes", type: "textarea", label: "Notes" },
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
