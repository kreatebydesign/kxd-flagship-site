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

export const Insights: CollectionConfig = {
  slug: "insights",
  labels: { singular: "Insight", plural: "Insights" },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "category", "publishedAt", "status"],
    group: PAYLOAD_GROUPS.content,
    description: "Editorial content for SEO authority and thought leadership.",
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
        { label: "Luxury Web Design", value: "luxury-web-design" },
        { label: "Hospitality", value: "hospitality" },
        { label: "Motorsports", value: "motorsports" },
        { label: "Membership Platforms", value: "membership-platforms" },
        { label: "Operational Platforms", value: "operational-platforms" },
        { label: "Agency", value: "agency" },
      ],
    },
    {
      name: "excerpt",
      type: "textarea",
      required: true,
    },
    {
      name: "heroImage",
      type: "upload",
      relationTo: "media",
    },
    {
      name: "author",
      type: "relationship",
      relationTo: "team-members",
    },
    {
      name: "content",
      type: "richText",
      editor: lexicalEditor(),
      required: true,
    },
    {
      name: "readingTimeMinutes",
      type: "number",
      min: 1,
      admin: {
        position: "sidebar",
      },
    },
    featuredField,
    statusField,
    publishedAtField,
    ...seoFields,
  ],
};
