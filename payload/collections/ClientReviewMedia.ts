import path from "path";
import { fileURLToPath } from "url";
import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

/**
 * Client-scoped review attachments — separate from public Marketing `media`.
 * Files live outside `public/` and are served through the portal API.
 */
export const ClientReviewMedia: CollectionConfig = {
  slug: "client-review-media",
  labels: { singular: "Review attachment", plural: "Review attachments" },
  lockDocuments: false,
  admin: {
    group: PAYLOAD_GROUPS.kxdOs,
    useAsTitle: "originalFilename",
    defaultColumns: ["originalFilename", "client", "relatedRequest", "mimeType", "createdAt"],
    description:
      "Website Review attachments uploaded by portal clients. Not part of the public media library.",
  },
  upload: {
    staticDir: path.resolve(dirname, "../../private/client-review-media"),
    mimeTypes: [
      "image/*",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
    ],
    imageSizes: [
      {
        name: "preview",
        width: 320,
        height: 320,
        position: "centre",
      },
    ],
    adminThumbnail: "preview",
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
  ],
};
