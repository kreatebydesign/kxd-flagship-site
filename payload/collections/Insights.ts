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
  defaultSort: "-publishedAt",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "category", "publishedAt", "featured", "status"],
    group: PAYLOAD_GROUPS.content,
    description: "KXD Journal — editorial content for SEO authority and thought leadership.",
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
        { label: "Luxury Web Design",     value: "luxury-web-design" },
        { label: "Operational Systems",   value: "operational-systems" },
        { label: "Hospitality Growth",    value: "hospitality-growth" },
        { label: "Motorsports Strategy",  value: "motorsports-strategy" },
        { label: "Brand Systems",         value: "brand-systems" },
        { label: "Founder Perspectives",  value: "founder-perspectives" },
      ],
    },
    {
      name: "excerpt",
      type: "textarea",
      required: true,
      admin: {
        description: "2–3 sentence summary shown on the overview grid.",
      },
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
      label: "Reading Time (min)",
      admin: {
        position: "sidebar",
        description: "Estimated read time displayed on article pages.",
      },
    },
    featuredField,
    statusField,
    publishedAtField,
    ...seoFields,
  ],
};
