import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";
import { publishInfrastructureEventAutomation } from "../hooks/automation.ts";

export const InfrastructureEvents: CollectionConfig = {
  slug: "infrastructure-events",
  labels: { singular: "Infrastructure Event", plural: "Infrastructure Events" },
  defaultSort: "-occurredAt",
  lockDocuments: false,
  hooks: {
    afterChange: [publishInfrastructureEventAutomation],
  },
  admin: {
    useAsTitle: "title",
    defaultColumns: [
      "client",
      "eventType",
      "severity",
      "status",
      "occurredAt",
      "updatedAt",
    ],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Infrastructure timeline — deployments, renewals, DNS changes, issues, and recommendations.",
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
      name: "infrastructure",
      type: "relationship",
      relationTo: "client-infrastructure",
      label: "Infrastructure Record",
      admin: { position: "sidebar" },
    },
    {
      name: "eventType",
      type: "select",
      required: true,
      label: "Event Type",
      defaultValue: "general",
      options: [
        { label: "Domain", value: "domain" },
        { label: "DNS", value: "dns" },
        { label: "SSL", value: "ssl" },
        { label: "Hosting", value: "hosting" },
        { label: "Deployment", value: "deployment" },
        { label: "Analytics", value: "analytics" },
        { label: "Search Console", value: "search-console" },
        { label: "Email", value: "email" },
        { label: "Payments", value: "payments" },
        { label: "Cost", value: "cost" },
        { label: "Renewal", value: "renewal" },
        { label: "Issue", value: "issue" },
        { label: "Recommendation", value: "recommendation" },
        { label: "General", value: "general" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "severity",
      type: "select",
      label: "Severity",
      required: true,
      defaultValue: "info",
      options: [
        { label: "Info", value: "info" },
        { label: "Success", value: "success" },
        { label: "Warning", value: "warning" },
        { label: "Critical", value: "critical" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "status",
      type: "select",
      label: "Status",
      required: true,
      defaultValue: "open",
      options: [
        { label: "Open", value: "open" },
        { label: "Resolved", value: "resolved" },
        { label: "Ignored", value: "ignored" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "source",
      type: "select",
      label: "Source",
      defaultValue: "manual",
      options: [
        { label: "Manual", value: "manual" },
        { label: "System", value: "system" },
        { label: "AI", value: "ai" },
      ],
      admin: { position: "sidebar" },
    },
    { name: "title", type: "text", required: true, label: "Title" },
    { name: "description", type: "textarea", label: "Description" },
    {
      name: "occurredAt",
      type: "date",
      required: true,
      label: "Occurred At",
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
    {
      name: "resolvedAt",
      type: "date",
      label: "Resolved At",
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
    {
      name: "internalOnly",
      type: "checkbox",
      label: "Internal Only",
      defaultValue: true,
      admin: {
        description: "Hidden from client-facing surfaces until explicitly published.",
      },
    },
  ],
};
