import type { CollectionConfig } from "payload";
import { isAuthenticatedOrPublished } from "../access";
import { PAYLOAD_GROUPS } from "../admin/groups";
import { featuredField, publishedAtField, statusField } from "../fields/shared";

export const Testimonials: CollectionConfig = {
  slug: "testimonials",
  labels: { singular: "Testimonial", plural: "Testimonials" },
  admin: {
    useAsTitle: "authorName",
    defaultColumns: ["authorName", "company", "featured", "status"],
    group: PAYLOAD_GROUPS.social,
  },
  access: {
    read: isAuthenticatedOrPublished,
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  fields: [
    {
      name: "quote",
      type: "textarea",
      required: true,
    },
    {
      name: "authorName",
      type: "text",
      required: true,
    },
    {
      name: "authorTitle",
      type: "text",
    },
    {
      name: "company",
      type: "text",
    },
    {
      name: "project",
      type: "relationship",
      relationTo: "projects",
    },
    {
      name: "portrait",
      type: "upload",
      relationTo: "media",
    },
    featuredField,
    statusField,
    publishedAtField,
  ],
};
