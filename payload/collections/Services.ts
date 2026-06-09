import type { CollectionConfig } from "payload";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { isAuthenticatedOrPublished } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";
import {
  featuredField,
  publishedAtField,
  seoFields,
  slugField,
  statusField,
} from "../fields/shared.ts";

export const Services: CollectionConfig = {
  slug: "services",
  labels: { singular: "Service", plural: "Services" },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "category", "featured", "status"],
    group: PAYLOAD_GROUPS.content,
    description: "Core KXD offerings. Luxury websites remain the primary entry point.",
  },
  access: {
    read: isAuthenticatedOrPublished,
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
    },
    slugField("title"),
    {
      name: "category",
      type: "select",
      required: true,
      options: [
        { label: "Luxury Websites", value: "luxury-websites" },
        { label: "Ecommerce Experiences", value: "ecommerce" },
        { label: "Growth Infrastructure", value: "growth-infrastructure" },
        { label: "Operational Platforms", value: "operational-platforms" },
        { label: "Enterprise Systems", value: "enterprise-systems" },
      ],
      defaultValue: "luxury-websites",
    },
    {
      name: "order",
      type: "number",
      defaultValue: 0,
      admin: {
        position: "sidebar",
        description: "Lower numbers appear first.",
      },
    },
    {
      name: "headline",
      type: "text",
      required: true,
    },
    {
      name: "summary",
      type: "textarea",
      required: true,
    },
    {
      name: "description",
      type: "richText",
      editor: lexicalEditor(),
    },
    {
      name: "deliverables",
      type: "array",
      fields: [
        {
          name: "item",
          type: "text",
          required: true,
        },
      ],
    },
    {
      name: "heroImage",
      type: "upload",
      relationTo: "media",
    },
    featuredField,
    statusField,
    publishedAtField,
    ...seoFields,
  ],
};
