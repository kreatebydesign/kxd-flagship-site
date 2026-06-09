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
      },
    },
  ],
};
