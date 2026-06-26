import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const AutomationEvents: CollectionConfig = {
  slug: "automation-events",
  labels: { singular: "Automation Event", plural: "Automation Events" },
  defaultSort: "-createdAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "eventName",
    defaultColumns: ["module", "eventName", "status", "client", "ruleId", "createdAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Central automation event log — every module publishes standardized events here. " +
      "Dashboard: /admin/operations/automation",
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
      label: "Client",
      admin: { position: "sidebar" },
    },
    {
      name: "module",
      type: "select",
      required: true,
      label: "Module",
      options: [
        { label: "Launch", value: "Launch" },
        { label: "Onboarding", value: "Onboarding" },
        { label: "Infrastructure", value: "Infrastructure" },
        { label: "Website Auditor", value: "Website Auditor" },
        { label: "Founder Intelligence", value: "Founder Intelligence" },
        { label: "Growth", value: "Growth" },
        { label: "Creative", value: "Creative" },
        { label: "Projects", value: "Projects" },
        { label: "Requests", value: "Requests" },
        { label: "Deliverables", value: "Deliverables" },
        { label: "Portal", value: "Portal" },
        { label: "Automation", value: "Automation" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "status",
      type: "select",
      required: true,
      label: "Status",
      defaultValue: "published",
      options: [
        { label: "Published", value: "published" },
        { label: "Processed", value: "processed" },
        { label: "Failed", value: "failed" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "ruleId",
      type: "text",
      label: "Rule ID",
      admin: { position: "sidebar" },
    },
    {
      type: "tabs",
      tabs: [
        {
          label: "Event",
          fields: [
            { name: "eventName", type: "text", required: true, label: "Event Name" },
            {
              name: "payload",
              type: "json",
              label: "Payload",
              admin: { description: "Structured event data for rules and downstream consumers." },
            },
            { name: "errorMessage", type: "textarea", label: "Error Message" },
            {
              name: "processedAt",
              type: "date",
              label: "Processed At",
              admin: { date: { pickerAppearance: "dayAndTime" } },
            },
          ],
        },
      ],
    },
  ],
};
