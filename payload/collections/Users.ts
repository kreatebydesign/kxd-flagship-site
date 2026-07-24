import type { CollectionConfig } from "payload";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const Users: CollectionConfig = {
  slug: "users",
  labels: { singular: "Admin user", plural: "Admin users" },
  admin: {
    useAsTitle: "email",
    group: PAYLOAD_GROUPS.system,
    description: "KXD team access for Payload admin and future KXD OS integrations.",
  },
  auth: true,
  fields: [
    {
      name: "displayName",
      type: "text",
      label: "Display name",
    },
    {
      name: "role",
      type: "select",
      defaultValue: "editor",
      options: [
        { label: "Admin", value: "admin" },
        { label: "Editor", value: "editor" },
      ],
      admin: {
        position: "sidebar",
        description: "Payload access class. Admin retains full studio authority.",
      },
    },
    {
      name: "staffRole",
      type: "select",
      defaultValue: "none",
      options: [
        { label: "None (full operator when admin)", value: "none" },
        { label: "Operations Coordinator (HR/Admin Assistant)", value: "operations_coordinator" },
        {
          label: "Executive Operations Coordinator",
          value: "executive_operations_coordinator",
        },
        { label: "Operations Manager", value: "operations_manager" },
      ],
      admin: {
        position: "sidebar",
        description:
          "Role-driven staff experience. Restricted staff land on Staff Home with deny-by-default permissions.",
      },
    },
    {
      name: "staffOnboardingCompletedAt",
      type: "date",
      admin: {
        position: "sidebar",
        description: "Set when the staff first-login welcome is completed.",
        date: { pickerAppearance: "dayAndTime" },
      },
    },
  ],
};
