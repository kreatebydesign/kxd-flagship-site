import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

const STATUSES = [
  { label: "Draft", value: "draft" },
  { label: "In Progress", value: "in-progress" },
  { label: "Blueprints Ready", value: "blueprints-ready" },
  { label: "Completed", value: "completed" },
  { label: "Archived", value: "archived" },
] as const;

const BLUEPRINT_STATUSES = [
  { label: "Pending", value: "pending" },
  { label: "Generated", value: "generated" },
  { label: "Applied", value: "applied" },
] as const;

const TEMPLATES = [
  { label: "Standard Business", value: "standard-business" },
  { label: "Contractor", value: "contractor" },
  { label: "Motorsports", value: "motorsports" },
  { label: "Restaurant", value: "restaurant" },
  { label: "Hospitality", value: "hospitality" },
  { label: "Political Campaign", value: "political-campaign" },
  { label: "Professional Services", value: "professional-services" },
  { label: "Creative Agency", value: "creative-agency" },
] as const;

const PHASES = [
  { label: "Business Foundation", value: "business-foundation" },
  { label: "Brand Strategy", value: "brand-strategy" },
  { label: "Website Strategy", value: "website-strategy" },
  { label: "SEO Strategy", value: "seo-strategy" },
  { label: "Business Systems", value: "business-systems" },
  { label: "Production Planning", value: "production-planning" },
  { label: "Launch Planning", value: "launch-planning" },
] as const;

export const GenesisSessions: CollectionConfig = {
  slug: "genesis-sessions",
  labels: { singular: "Genesis Session", plural: "Genesis Sessions" },
  defaultSort: "-updatedAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "sessionLabel",
    defaultColumns: ["sessionLabel", "templateId", "status", "progressPercent", "client", "updatedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description: "KXD Genesis engagement blueprints — OS: /admin/operations/genesis",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: "sessionLabel",
      type: "text",
      required: true,
      label: "Session Label",
    },
    {
      name: "templateId",
      type: "select",
      required: true,
      defaultValue: "standard-business",
      label: "Industry Template",
      options: [...TEMPLATES],
      admin: { position: "sidebar" },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "draft",
      label: "Status",
      options: [...STATUSES],
      admin: { position: "sidebar" },
    },
    {
      name: "currentPhase",
      type: "select",
      required: true,
      defaultValue: "business-foundation",
      label: "Current Phase",
      options: [...PHASES],
      admin: { position: "sidebar" },
    },
    {
      name: "progressPercent",
      type: "number",
      label: "Discovery Progress %",
      defaultValue: 0,
      admin: { position: "sidebar" },
    },
    {
      name: "launchReadiness",
      type: "number",
      label: "Launch Readiness %",
      defaultValue: 0,
      admin: { position: "sidebar" },
    },
    {
      name: "blueprintStatus",
      type: "select",
      required: true,
      defaultValue: "pending",
      label: "Blueprint Status",
      options: [...BLUEPRINT_STATUSES],
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
      name: "project",
      type: "relationship",
      relationTo: "client-projects",
      label: "Project",
      admin: { position: "sidebar" },
    },
    {
      name: "createdBy",
      type: "relationship",
      relationTo: "users",
      label: "Created By",
      admin: { position: "sidebar" },
    },
    {
      name: "completedAt",
      type: "date",
      label: "Completed At",
      admin: { position: "sidebar" },
    },
    {
      name: "recommendedNextStep",
      type: "text",
      label: "Recommended Next Step",
    },
    {
      name: "missingFields",
      type: "json",
      label: "Missing Fields",
    },
    {
      name: "discoveryData",
      type: "json",
      required: true,
      label: "Discovery Data",
    },
    {
      name: "blueprints",
      type: "json",
      label: "Generated Blueprints",
    },
    {
      name: "metadata",
      type: "json",
      label: "Metadata",
    },
  ],
};
