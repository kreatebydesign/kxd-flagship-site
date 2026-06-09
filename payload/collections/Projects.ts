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
    defaultColumns: ["title", "client", "industry", "tier", "status"],
    group: PAYLOAD_GROUPS.portfolio,
    description:
      "Portfolio entries powering /work. Includes full case study narrative for /work/[slug].",
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
        // ── Portfolio card ────────────────────────────────────────────────────
        {
          label: "Portfolio Card",
          fields: [
            {
              name: "title",
              type: "text",
              required: true,
              admin: {
                description: "Display title for the project card (usually client name).",
              },
            },
            slugField("title"),
            {
              name: "client",
              type: "text",
              required: true,
              admin: { description: "Full legal/brand name of the client." },
            },
            {
              name: "industry",
              type: "text",
              required: true,
              admin: {
                description: "e.g. Motorsports, Hospitality, Civic, Automotive",
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
              name: "tier",
              type: "select",
              options: [
                { label: "Primary (featured grid)", value: "primary" },
                { label: "Secondary (supporting grid)", value: "secondary" },
              ],
              defaultValue: "secondary",
              required: true,
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
              name: "service",
              type: "text",
              admin: {
                description:
                  "Service label shown on card hover (e.g. Luxury Website Experiences).",
              },
            },
            {
              name: "outcome",
              type: "text",
              admin: {
                description: "Short outcome statement for card hover reveal.",
              },
            },
            {
              name: "description",
              type: "textarea",
              admin: {
                description: "Slightly longer card description. Falls back to summary.",
              },
            },
          ],
        },

        // ── Media ─────────────────────────────────────────────────────────────
        {
          label: "Media",
          fields: [
            {
              name: "heroImage",
              type: "upload",
              relationTo: "media",
              admin: { description: "Primary hero image for cards and detail page." },
            },
            {
              name: "logoUrl",
              type: "text",
              label: "Logo URL",
              admin: {
                description:
                  "Path to client logo (e.g. /migrated-assets/logos/client.svg). Used when heroImage is absent.",
              },
            },
            {
              name: "imagePosition",
              type: "text",
              admin: {
                description:
                  "CSS object-position value (e.g. center top). Leave blank for default.",
              },
            },
            {
              name: "imageContain",
              type: "checkbox",
              label: "Use object-contain (logo-only cards)",
              defaultValue: false,
            },
            {
              name: "gallery",
              type: "array",
              label: "Showcase gallery",
              admin: { description: "Images shown in the detail page showcase section." },
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
                  admin: { description: "Short caption shown below the image." },
                },
              ],
            },
          ],
        },

        // ── Case study ───────────────────────────────────────────────────────
        {
          label: "Case Study",
          description: "Narrative content for /work/[slug] detail page.",
          fields: [
            {
              name: "tagline",
              type: "text",
              admin: {
                description:
                  "One-line case study tagline shown in hero and outcomes pull quote.",
              },
            },
            {
              name: "scope",
              type: "array",
              label: "Scope tags",
              admin: {
                description: "Service/scope tags displayed in the hero (e.g. Luxury Website Experiences).",
              },
              fields: [
                {
                  name: "item",
                  type: "text",
                  required: true,
                },
              ],
            },
            {
              name: "liveUrl",
              type: "text",
              label: "Live URL",
              admin: { description: "e.g. https://client.com" },
            },
            {
              name: "context",
              type: "textarea",
              label: "Context & opportunity",
              admin: {
                description: "Background paragraph setting up the engagement context.",
              },
            },
            {
              name: "challenge",
              type: "textarea",
              admin: {
                description:
                  "The challenge/problem this project solved. First sentence gets hero treatment.",
              },
            },
            {
              name: "strategy",
              type: "textarea",
              label: "Strategic approach",
              admin: { description: "How KXD approached the problem." },
            },
            {
              name: "execution",
              type: "array",
              admin: {
                description:
                  "Execution steps displayed in the grid (use 'Heading — body copy' format).",
              },
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
              label: "Qualitative outcomes",
              admin: { description: "Outcome statements for the outcomes section." },
              fields: [
                {
                  name: "item",
                  type: "text",
                  required: true,
                },
              ],
            },
            {
              name: "whyItWorked",
              type: "textarea",
              label: "Why it worked",
              admin: {
                description:
                  "Closing analysis in blockquote style. Explains KXD methodology.",
              },
            },
          ],
        },

        // ── Relations ─────────────────────────────────────────────────────────
        {
          label: "Relations",
          fields: [
            {
              name: "services",
              type: "relationship",
              relationTo: "services",
              hasMany: true,
              admin: { description: "KXD services delivered in this engagement." },
            },
            {
              name: "caseStudy",
              type: "relationship",
              relationTo: "case-studies",
              hasMany: false,
              admin: {
                description:
                  "Optional legacy CaseStudies collection link. Prefer the Case Study tab above.",
              },
            },
          ],
        },
      ],
    },

    // ── Sidebar ───────────────────────────────────────────────────────────────
    {
      name: "order",
      type: "number",
      defaultValue: 0,
      admin: {
        position: "sidebar",
        description: "Display order — lower numbers appear first.",
      },
    },

    featuredField,
    statusField,
    publishedAtField,

    ...seoFields,
  ],
};
