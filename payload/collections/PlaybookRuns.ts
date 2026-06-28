import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

const RUN_STATUSES = [
  { label: "Not Started", value: "not-started" },
  { label: "In Progress", value: "in-progress" },
  { label: "Blocked", value: "blocked" },
  { label: "Completed", value: "completed" },
  { label: "Archived", value: "archived" },
] as const;

export const PlaybookRuns: CollectionConfig = {
  slug: "playbook-runs",
  labels: { singular: "Playbook Run", plural: "Playbook Runs" },
  defaultSort: "-updatedAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "id",
    defaultColumns: ["playbook", "client", "status", "percentComplete", "startedAt", "updatedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description: "Active and completed playbook executions",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: "playbook",
      type: "relationship",
      relationTo: "playbooks",
      required: true,
      label: "Playbook",
      admin: { position: "sidebar" },
    },
    {
      name: "client",
      type: "relationship",
      relationTo: "clients",
      required: true,
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
      name: "status",
      type: "select",
      required: true,
      label: "Status",
      defaultValue: "not-started",
      options: [...RUN_STATUSES],
      admin: { position: "sidebar" },
    },
    {
      name: "startedBy",
      type: "relationship",
      relationTo: "users",
      label: "Started By",
      admin: { position: "sidebar" },
    },
    {
      name: "assignedTo",
      type: "relationship",
      relationTo: "users",
      label: "Assigned To",
      admin: { position: "sidebar" },
    },
    {
      name: "startedAt",
      type: "date",
      label: "Started At",
      admin: { date: { pickerAppearance: "dayAndTime" }, position: "sidebar" },
    },
    {
      name: "completedAt",
      type: "date",
      label: "Completed At",
      admin: { date: { pickerAppearance: "dayAndTime" }, position: "sidebar" },
    },
    {
      name: "percentComplete",
      type: "number",
      label: "Percent Complete",
      defaultValue: 0,
      admin: { position: "sidebar" },
    },
    {
      name: "currentStep",
      type: "relationship",
      relationTo: "playbook-steps",
      label: "Current Step",
      admin: { position: "sidebar" },
    },
    {
      name: "durationMinutes",
      type: "number",
      label: "Duration (minutes)",
      admin: { position: "sidebar" },
    },
    {
      type: "tabs",
      tabs: [
        {
          label: "Progress",
          fields: [
            {
              name: "completedSteps",
              type: "json",
              label: "Completed Step IDs",
            },
            {
              name: "skippedSteps",
              type: "json",
              label: "Skipped Step IDs",
            },
            {
              name: "timelineEventIds",
              type: "json",
              label: "Timeline Event IDs",
            },
            {
              name: "automationEventIds",
              type: "json",
              label: "Automation Event IDs",
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
