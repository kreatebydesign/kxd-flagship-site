import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

const STATUSES = [
  { label: "Pending", value: "pending" },
  { label: "In Progress", value: "in-progress" },
  { label: "Completed", value: "completed" },
  { label: "Failed", value: "failed" },
] as const;

const MODES = [
  { label: "New Client", value: "new-client" },
  { label: "Existing Client", value: "existing-client" },
  { label: "Project Expansion", value: "project-expansion" },
  { label: "Retainer Only", value: "retainer-only" },
  { label: "One-Time", value: "one-time" },
  { label: "Hybrid", value: "hybrid" },
] as const;

export const ProposalConversions: CollectionConfig = {
  slug: "proposal-conversions",
  labels: { singular: "Proposal Conversion", plural: "Proposal Conversions" },
  defaultSort: "-convertedAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "title",
    defaultColumns: ["proposal", "client", "status", "conversionMode", "convertedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description: "Idempotent proposal → client launch conversion records.",
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
      unique: true,
      admin: { position: "sidebar" },
    },
    {
      name: "client",
      type: "relationship",
      relationTo: "clients",
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
      name: "conversionMode",
      type: "select",
      defaultValue: "hybrid",
      options: [...MODES],
      admin: { position: "sidebar" },
    },
    { name: "title", type: "text", required: true },
    { name: "summary", type: "textarea" },
    {
      name: "convertedAt",
      type: "date",
      label: "Converted At",
      admin: { date: { pickerAppearance: "dayAndTime" }, position: "sidebar" },
    },
    {
      name: "relatedProject",
      type: "relationship",
      relationTo: "client-projects",
      label: "Project",
    },
    {
      name: "relatedRetainer",
      type: "relationship",
      relationTo: "retainers",
      label: "Retainer",
    },
    {
      name: "relatedContract",
      type: "relationship",
      relationTo: "contracts" as "clients",
      label: "Contract",
    },
    {
      name: "relatedOnboarding",
      type: "relationship",
      relationTo: "client-onboarding",
      label: "Onboarding",
    },
    {
      name: "launchStatus",
      type: "select",
      defaultValue: "queued",
      options: [
        { label: "Queued", value: "queued" },
        { label: "In Progress", value: "in-progress" },
        { label: "Completed", value: "completed" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "result",
      type: "json",
      label: "Conversion Result",
      admin: { description: "Created record IDs and metadata." },
    },
    { name: "errorLog", type: "textarea", label: "Error Log" },
  ],
};
