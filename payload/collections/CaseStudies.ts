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

export const CaseStudies: CollectionConfig = {
  slug: "case-studies",
  labels: { singular: "Case study", plural: "Case studies" },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "client", "industry", "featured", "status"],
    group: PAYLOAD_GROUPS.portfolio,
    description:
      "Long-form proof with client context, strategy, execution, and measurable results.",
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
      name: "client",
      type: "text",
      required: true,
    },
    {
      name: "industry",
      type: "text",
      required: true,
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
      required: true,
    },
    {
      name: "challenge",
      type: "richText",
      editor: lexicalEditor(),
      required: true,
    },
    {
      name: "strategy",
      type: "richText",
      editor: lexicalEditor(),
      required: true,
    },
    {
      name: "execution",
      type: "richText",
      editor: lexicalEditor(),
      required: true,
    },
    {
      name: "results",
      type: "richText",
      editor: lexicalEditor(),
      required: true,
    },
    {
      name: "resultsHighlights",
      type: "array",
      label: "Results highlights",
      fields: [
        {
          name: "label",
          type: "text",
          required: true,
        },
        {
          name: "value",
          type: "text",
          required: true,
        },
      ],
    },
    {
      name: "gallery",
      type: "array",
      fields: [
        {
          name: "image",
          type: "upload",
          relationTo: "media",
          required: true,
        },
        {
          name: "caption",
          type: "text",
        },
      ],
    },
    {
      name: "relatedProjects",
      type: "relationship",
      relationTo: "projects",
      hasMany: true,
    },
    featuredField,
    statusField,
    publishedAtField,
    ...seoFields,
  ],
};
