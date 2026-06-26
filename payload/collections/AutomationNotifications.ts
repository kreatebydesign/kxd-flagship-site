import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const AutomationNotifications: CollectionConfig = {
  slug: "automation-notifications",
  labels: { singular: "Automation Notification", plural: "Automation Notifications" },
  defaultSort: "-createdAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "severity", "module", "status", "client", "createdAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Internal notification queue — no external delivery. Placeholder for future alerting.",
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
      name: "severity",
      type: "select",
      required: true,
      label: "Severity",
      defaultValue: "info",
      options: [
        { label: "Info", value: "info" },
        { label: "Warning", value: "warning" },
        { label: "Critical", value: "critical" },
        { label: "Success", value: "success" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "module",
      type: "text",
      required: true,
      label: "Module",
      admin: { position: "sidebar" },
    },
    {
      name: "status",
      type: "select",
      required: true,
      label: "Status",
      defaultValue: "queued",
      options: [
        { label: "Queued", value: "queued" },
        { label: "Resolved", value: "resolved" },
      ],
      admin: { position: "sidebar" },
    },
    {
      type: "tabs",
      tabs: [
        {
          label: "Notification",
          fields: [
            { name: "title", type: "text", required: true, label: "Title" },
            { name: "summary", type: "textarea", label: "Summary" },
            {
              name: "resolvedAt",
              type: "date",
              label: "Resolved At",
              admin: { date: { pickerAppearance: "dayAndTime" } },
            },
            {
              name: "metadata",
              type: "json",
              label: "Metadata",
            },
          ],
        },
      ],
    },
  ],
};
