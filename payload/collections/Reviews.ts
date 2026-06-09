import type { CollectionConfig } from "payload";
import { isAuthenticatedOrPublished } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";
import { featuredField, publishedAtField, statusField } from "../fields/shared.ts";

const MIN_PUBLIC_RATING = 4.5;

export const Reviews: CollectionConfig = {
  slug: "reviews",
  labels: { singular: "Review", plural: "Reviews" },
  admin: {
    useAsTitle: "authorName",
    defaultColumns: ["authorName", "rating", "source", "featured", "status"],
    group: PAYLOAD_GROUPS.social,
    description:
      "Public reviews rated 4.5 and above. Prepared for future Google Business Profile sync.",
  },
  access: {
    read: ({ req: { user } }) => {
      if (user) return true;
      return {
        status: { equals: "published" },
        rating: { greater_than_equal: MIN_PUBLIC_RATING },
      };
    },
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  fields: [
    {
      name: "authorName",
      type: "text",
      required: true,
    },
    {
      name: "rating",
      type: "number",
      required: true,
      min: 1,
      max: 5,
      admin: {
        step: 0.1,
        description: "Only reviews rated 4.5+ are shown publicly.",
      },
    },
    {
      name: "reviewText",
      type: "textarea",
      required: true,
    },
    {
      name: "reviewDate",
      type: "date",
      required: true,
      admin: {
        date: {
          pickerAppearance: "dayOnly",
        },
      },
    },
    {
      name: "source",
      type: "select",
      required: true,
      defaultValue: "manual",
      options: [
        { label: "Manual", value: "manual" },
        { label: "Google", value: "google" },
        { label: "Client", value: "client" },
      ],
    },
    {
      name: "externalSync",
      type: "group",
      label: "External sync",
      admin: {
        description: "Internal fields for future review synchronization.",
      },
      fields: [
        {
          name: "externalId",
          type: "text",
          unique: true,
          index: true,
          admin: {
            readOnly: true,
            description: "Provider-specific review identifier.",
          },
        },
        {
          name: "provider",
          type: "select",
          options: [
            { label: "Google Business Profile", value: "google-business-profile" },
          ],
        },
        {
          name: "lastSyncedAt",
          type: "date",
          admin: {
            readOnly: true,
          },
        },
        {
          name: "syncStatus",
          type: "select",
          defaultValue: "manual",
          options: [
            { label: "Manual", value: "manual" },
            { label: "Synced", value: "synced" },
            { label: "Pending", value: "pending" },
            { label: "Error", value: "error" },
          ],
        },
      ],
    },
    featuredField,
    statusField,
    publishedAtField,
  ],
};
