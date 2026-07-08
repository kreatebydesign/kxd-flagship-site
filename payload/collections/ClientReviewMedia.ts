import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

/**
 * Client-scoped review attachments — separate from public Marketing `media`.
 * Binary content is stored through `lib/client-review-media/storage` adapters.
 */
export const ClientReviewMedia: CollectionConfig = {
  slug: "client-review-media",
  labels: { singular: "Review attachment", plural: "Review attachments" },
  lockDocuments: false,
  admin: {
    group: PAYLOAD_GROUPS.kxdOs,
    useAsTitle: "originalFilename",
    defaultColumns: [
      "originalFilename",
      "client",
      "relatedRequest",
      "storageProvider",
      "mimeType",
      "createdAt",
    ],
    description:
      "Website Review attachments uploaded by portal clients. Not part of the public media library.",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: "client",
      type: "relationship",
      relationTo: "clients",
      required: true,
      label: "Client",
    },
    {
      name: "relatedRequest",
      type: "relationship",
      relationTo: "client-requests",
      label: "Related request",
      admin: {
        description: "Set when the revision is submitted.",
      },
    },
    {
      name: "originalFilename",
      type: "text",
      label: "Original filename",
    },
    {
      name: "uploadedByEmail",
      type: "text",
      label: "Uploaded by",
    },
    {
      name: "mimeType",
      type: "text",
      label: "MIME type",
    },
    {
      name: "filesize",
      type: "number",
      label: "File size (bytes)",
    },
    {
      name: "storageProvider",
      type: "select",
      label: "Storage provider",
      defaultValue: "local",
      options: [
        { label: "Local filesystem", value: "local" },
        { label: "Vercel Blob", value: "vercel-blob" },
      ],
      required: true,
    },
    {
      name: "storageKey",
      type: "text",
      label: "Storage key",
      required: true,
      admin: {
        description: "Provider-specific object key. Legacy rows may use `filename` only.",
      },
    },
    {
      name: "filename",
      type: "text",
      label: "Legacy filename",
      admin: {
        readOnly: true,
        description: "Payload upload filename from pre-18G records.",
      },
    },
  ],
};
