/**
 * KXD Network — owner-curated Selected work for the private member directory.
 * Not a live client list, pipeline, or public portfolio.
 */
import type { CollectionConfig } from "payload";
import { isPayloadAdminUser, isStudioPayloadOperator } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const KxdNetworkShowcase: CollectionConfig = {
  slug: "kxd-network-showcase",
  labels: {
    singular: "KXD Network Selected Work",
    plural: "KXD Network Selected Work",
  },
  defaultSort: "sortOrder",
  lockDocuments: false,
  admin: {
    useAsTitle: "companyName",
    defaultColumns: [
      "companyName",
      "directoryVisibility",
      "ownerApprovedForNetwork",
      "categoryMarket",
      "updatedAt",
    ],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Owner-approved completed/public work shown inside The Network. " +
      "Never prospects, deal values, referral data, or unpublished clients. " +
      "Published records are queryable only by active partner sessions and authorized owners.",
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false;
      if (user.collection === "users") return isStudioPayloadOperator(user);
      return false;
    },
    create: isPayloadAdminUser,
    update: isPayloadAdminUser,
    delete: isPayloadAdminUser,
  },
  fields: [
    {
      name: "directoryVisibility",
      type: "select",
      required: true,
      defaultValue: "private",
      options: [
        { label: "Private", value: "private" },
        { label: "Published", value: "published" },
      ],
      label: "Visibility",
      admin: {
        description: "Published items appear only to active KXD Network members.",
      },
    },
    {
      name: "companyName",
      type: "text",
      required: true,
      label: "Company name",
    },
    {
      name: "categoryMarket",
      type: "text",
      label: "Category or market",
    },
    {
      name: "workDescription",
      type: "text",
      label: "KXD work description",
      maxLength: 200,
      admin: {
        description: "One concise factual line about the completed work.",
      },
    },
    {
      name: "mark",
      type: "upload",
      relationTo: "media",
      label: "Approved logo or image",
      admin: {
        description: "Optional. Official media library only.",
      },
    },
    {
      name: "websiteUrl",
      type: "text",
      label: "Public website URL",
      admin: {
        description: "Optional external public link. Never a private client URL.",
      },
    },
    {
      name: "creditedPartner",
      type: "relationship",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      relationTo: "kxd-partner-profiles" as any,
      label: "Credited partner",
      admin: {
        description: "Optional. Shown only when attribution is explicitly enabled.",
      },
    },
    {
      name: "creditAttribution",
      type: "checkbox",
      defaultValue: false,
      label: "Show partner attribution",
      admin: {
        description:
          "When enabled, the credited partner display name may appear. Never automatic.",
      },
    },
    {
      name: "ownerApprovedForNetwork",
      type: "checkbox",
      defaultValue: false,
      label: "Approved for Network display",
      admin: {
        description:
          "Explicit owner confirmation required before a published item can appear to members.",
      },
    },
    {
      name: "sortOrder",
      type: "number",
      defaultValue: 0,
      label: "Sort order",
      admin: {
        position: "sidebar",
        description: "Lower numbers appear first.",
      },
    },
  ],
};
