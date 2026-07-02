import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";
import { publishContractLifecycleHook } from "../hooks/contracts.ts";

const STATUSES = [
  { label: "Draft", value: "draft" },
  { label: "Sent", value: "sent" },
  { label: "Viewed", value: "viewed" },
  { label: "Signed", value: "signed" },
  { label: "Declined", value: "declined" },
  { label: "Expired", value: "expired" },
  { label: "Archived", value: "archived" },
] as const;

const CONTRACT_TYPES = [
  { label: "Service Agreement", value: "service-agreement" },
  { label: "Monthly Retainer", value: "monthly-retainer" },
  { label: "Website Agreement", value: "website-agreement" },
  { label: "Marketing Retainer", value: "marketing-retainer" },
  { label: "CRM Agreement", value: "crm-agreement" },
  { label: "Consulting", value: "consulting" },
  { label: "Custom", value: "custom" },
] as const;

export const Contracts: CollectionConfig = {
  slug: "contracts",
  labels: { singular: "Contract", plural: "Contracts" },
  defaultSort: "-updatedAt",
  lockDocuments: false,
  hooks: {
    afterChange: [publishContractLifecycleHook],
  },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "client", "status", "contractType", "signedAt", "updatedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description: "Executive contracts — workspace: /admin/operations/client-command/[id]?tab=contracts",
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
      admin: { position: "sidebar" },
    },
    {
      name: "proposal",
      type: "relationship",
      relationTo: "proposals",
      label: "Source Proposal",
      admin: { position: "sidebar" },
    },
    {
      name: "template",
      type: "relationship",
      relationTo: "contract-templates" as "clients",
      label: "Template",
      admin: { position: "sidebar" },
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
      name: "contractType",
      type: "select",
      required: true,
      defaultValue: "service-agreement",
      options: [...CONTRACT_TYPES],
      admin: { position: "sidebar" },
    },
    { name: "title", type: "text", required: true },
    { name: "publicTitle", type: "text", label: "Public Title" },
    { name: "body", type: "textarea", label: "Contract Body" },
    { name: "terms", type: "textarea" },
    { name: "executiveNotes", type: "textarea", label: "Executive Notes (private)" },
    {
      name: "monthlyAmount",
      type: "number",
      label: "Monthly Amount ($)",
    },
    {
      name: "projectAmount",
      type: "number",
      label: "Project Amount ($)",
    },
    {
      name: "startDate",
      type: "date",
      label: "Start Date",
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
    {
      name: "sentAt",
      type: "date",
      admin: { date: { pickerAppearance: "dayAndTime" }, position: "sidebar" },
    },
    {
      name: "viewedAt",
      type: "date",
      admin: { date: { pickerAppearance: "dayAndTime" }, position: "sidebar" },
    },
    {
      name: "signedAt",
      type: "date",
      admin: { date: { pickerAppearance: "dayAndTime" }, position: "sidebar" },
    },
    {
      name: "expiresAt",
      type: "date",
      admin: { date: { pickerAppearance: "dayAndTime" }, position: "sidebar" },
    },
    {
      name: "publicToken",
      type: "text",
      unique: true,
      admin: { readOnly: true, position: "sidebar" },
    },
    { name: "signerName", type: "text", label: "Signer Name" },
    { name: "signerEmail", type: "email", label: "Signer Email" },
    { name: "signerTitle", type: "text", label: "Signer Title" },
    {
      name: "esignProvider",
      type: "text",
      label: "E-Sign Provider",
      admin: { description: "Future-ready — DocuSign, HelloSign, etc." },
    },
    {
      name: "esignEnvelopeId",
      type: "text",
      label: "E-Sign Envelope ID",
    },
    {
      name: "relatedProject",
      type: "relationship",
      relationTo: "client-projects",
      label: "Related Project",
    },
    {
      name: "relatedRetainer",
      type: "relationship",
      relationTo: "retainers",
      label: "Related Retainer",
    },
  ],
};
