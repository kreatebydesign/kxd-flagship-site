import type { CollectionConfig } from "payload";
import { isAuthenticatedOrPublished } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";
import { featuredField, publishedAtField, statusField } from "../fields/shared.ts";

export const Partners: CollectionConfig = {
  slug: "partners",
  labels: { singular: "Partner", plural: "Partners" },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "category", "featured", "status"],
    group: PAYLOAD_GROUPS.content,
  },
  access: {
    read: isAuthenticatedOrPublished,
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
    },
    {
      name: "category",
      type: "select",
      options: [
        { label: "Technology", value: "technology" },
        { label: "Platform", value: "platform" },
        { label: "Creative", value: "creative" },
        { label: "Industry", value: "industry" },
      ],
    },
    {
      name: "logo",
      type: "upload",
      relationTo: "media",
      required: true,
    },
    {
      name: "url",
      type: "text",
      label: "Website URL",
    },
    {
      name: "order",
      type: "number",
      defaultValue: 0,
      admin: {
        position: "sidebar",
      },
    },
    featuredField,
    statusField,
    publishedAtField,
  ],
};
