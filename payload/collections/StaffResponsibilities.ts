import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

/**
 * Recurring staff responsibility templates.
 * Materialize into Work Engine items — never a parallel task engine.
 * Not assigned by default; Matt (or a labeled local fixture) must set an owner.
 */
export const StaffResponsibilities: CollectionConfig = {
  slug: "staff-responsibilities",
  labels: {
    singular: "Staff Responsibility",
    plural: "Staff Responsibilities",
  },
  defaultSort: "title",
  lockDocuments: false,
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "owner", "cadence", "active", "requiresApproval", "updatedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Reusable staff responsibilities that create Work Engine items for the owner. Workspace: /admin/operations/staff/oversight",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
    },
    {
      name: "purpose",
      type: "textarea",
      required: true,
      admin: { description: "Why this responsibility exists." },
    },
    {
      name: "expectedOutcome",
      type: "textarea",
      required: true,
      admin: { description: "What done looks like — never an external auto-action." },
    },
    {
      name: "estimatedMinutes",
      type: "number",
      admin: { position: "sidebar", step: 5 },
    },
    {
      name: "owner",
      type: "relationship",
      relationTo: "users",
      required: false,
      admin: {
        position: "sidebar",
        description: "Required before daily materialization. Leave empty until Matt assigns.",
      },
    },
    {
      name: "cadence",
      type: "select",
      required: true,
      defaultValue: "daily",
      options: [
        { label: "Daily", value: "daily" },
        { label: "Weekdays", value: "weekdays" },
        { label: "Weekly", value: "weekly" },
        { label: "Monthly (1st)", value: "monthly" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "weekdayMask",
      type: "array",
      labels: { singular: "Weekday", plural: "Weekdays" },
      admin: {
        description: "For weekly cadence: 0=Sun … 6=Sat.",
      },
      fields: [
        {
          name: "day",
          type: "number",
          required: true,
          min: 0,
          max: 6,
        },
      ],
    },
    {
      name: "scope",
      type: "select",
      required: true,
      defaultValue: "internal",
      options: [
        { label: "Internal", value: "internal" },
        { label: "Client", value: "client" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "client",
      type: "relationship",
      relationTo: "clients",
      required: false,
      admin: {
        position: "sidebar",
        condition: (_, siblingData) => siblingData?.scope === "client",
      },
    },
    {
      name: "requiresApproval",
      type: "checkbox",
      defaultValue: false,
      admin: {
        position: "sidebar",
        description: "When true, daily instances are tagged for Matt approval.",
      },
    },
    {
      name: "active",
      type: "checkbox",
      defaultValue: true,
      admin: { position: "sidebar" },
    },
    {
      name: "libraryKey",
      type: "text",
      admin: {
        position: "sidebar",
        description: "Optional key from the built-in responsibility library.",
      },
    },
  ],
};
