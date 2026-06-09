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
    defaultColumns: ["title", "category", "status"],
    group: PAYLOAD_GROUPS.content,
    description:
      "Core KXD offerings. Luxury websites remain the primary entry point.",
  },
  access: {
    read: isAuthenticatedOrPublished,
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  fields: [
    {
      type: "tabs",
      tabs: [
        {
          label: "Core Positioning",
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
                { label: "Brand Systems & Identity", value: "brand-systems-identity" },
                { label: "Ecommerce Experiences", value: "ecommerce" },
                { label: "Growth Infrastructure", value: "growth-infrastructure" },
                { label: "Operational Platforms", value: "operational-platforms" },
                { label: "Enterprise Systems", value: "enterprise-systems" },
                { label: "Ongoing Partnership", value: "ongoing-partnership" },
              ],
              defaultValue: "luxury-websites",
            },
            {
              name: "eyebrow",
              type: "text",
              admin: {
                description:
                  "Small label above the headline (e.g. Flagship Offering).",
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
              admin: {
                description:
                  "Long-form service description used on detail pages.",
              },
            },
            {
              name: "heroImage",
              type: "upload",
              relationTo: "media",
            },
          ],
        },

        {
          label: "Offer Details",
          fields: [
            {
              name: "bestFor",
              type: "array",
              label: "Best For",
              fields: [
                {
                  name: "item",
                  type: "text",
                  required: true,
                },
              ],
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
              name: "outcomes",
              type: "array",
              label: "Client Outcomes",
              fields: [
                {
                  name: "item",
                  type: "text",
                  required: true,
                },
              ],
            },

            {
              name: "process",
              type: "array",
              label: "Process",
              fields: [
                {
                  name: "stepTitle",
                  type: "text",
                  required: true,
                },
                {
                  name: "stepDescription",
                  type: "textarea",
                  required: true,
                },
              ],
            },
          ],
        },

        {
          label: "Investment",
          fields: [
            {
              name: "investmentLabel",
              type: "text",
              defaultValue: "Custom Investment",
            },

            {
              name: "investmentRange",
              type: "text",
              admin: {
                description:
                  "Example: $5,000 – $15,000",
              },
            },

            {
              name: "timelineLabel",
              type: "text",
              admin: {
                description:
                  "Example: 4–8 Weeks",
              },
            },

            {
              name: "engagementType",
              type: "select",
              defaultValue: "project",
              options: [
                {
                  label: "Project",
                  value: "project",
                },
                {
                  label: "Retainer",
                  value: "retainer",
                },
                {
                  label: "Hybrid",
                  value: "hybrid",
                },
                {
                  label: "Enterprise",
                  value: "enterprise",
                },
              ],
            },
          ],
        },

        {
          label: "FAQ",
          fields: [
            {
              name: "faqs",
              type: "array",
              fields: [
                {
                  name: "question",
                  type: "text",
                  required: true,
                },
                {
                  name: "answer",
                  type: "textarea",
                  required: true,
                },
              ],
            },
          ],
        },

        {
          label: "CTA",
          fields: [
            {
              name: "ctaLabel",
              type: "text",
              defaultValue: "Start the Conversation",
            },

            {
              name: "ctaHref",
              type: "text",
              defaultValue: "/contact",
            },

            {
              name: "secondaryCtaLabel",
              type: "text",
            },

            {
              name: "secondaryCtaHref",
              type: "text",
            },
          ],
        },
      ],
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

    featuredField,
    statusField,
    publishedAtField,

    ...seoFields,
  ],
};