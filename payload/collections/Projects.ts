import type { CollectionConfig } from "payload";
import { isAuthenticatedOrPublished } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";
import {
  featuredField,
  publishedAtField,
  seoFields,
  slugField,
  statusField,
} from "../fields/shared.ts";

const projectTypeOptions = [
  { label: "Luxury Website", value: "luxury-website" },
  { label: "Ecommerce Experience", value: "ecommerce" },
  { label: "Membership Platform", value: "membership-platform" },
  { label: "Operational System", value: "operational-system" },
  { label: "Client Dashboard", value: "client-dashboard" },
  { label: "Enterprise Platform", value: "enterprise-platform" },
];

export const Projects: CollectionConfig = {
  slug: "projects",
  labels: { singular: "Project", plural: "Projects" },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "client", "projectType", "featured", "status"],
    group: PAYLOAD_GROUPS.portfolio,
    description:
      "Portfolio entries for luxury websites, ecommerce, platforms, and enterprise systems.",
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
      admin: {
        description: "e.g. Hospitality, Motorsports, Luxury Retail",
      },
    },
    {
      name: "projectType",
      type: "select",
      required: true,
      options: projectTypeOptions,
      defaultValue: "luxury-website",
    },
    {
      name: "year",
      type: "number",
      min: 2018,
      max: 2100,
    },
    {
      name: "summary",
      type: "textarea",
      required: true,
      admin: {
        description: "Short portfolio summary for cards and listings.",
      },
    },
    {
      name: "heroImage",
      type: "upload",
      relationTo: "media",
      required: true,
    },
    {
      name: "gallery",
      type: "array",
      label: "Gallery",
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
      name: "services",
      type: "relationship",
      relationTo: "services",
      hasMany: true,
    },
    {
      name: "caseStudy",
      type: "relationship",
      relationTo: "case-studies",
      hasMany: false,
      admin: {
        description: "Optional linked case study with full narrative.",
      },
    },
    {
      name: "liveUrl",
      type: "text",
      label: "Live URL",
    },
    featuredField,
    statusField,
    publishedAtField,
    ...seoFields,
  ],
};
