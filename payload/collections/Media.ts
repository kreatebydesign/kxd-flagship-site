import type { CollectionConfig } from "payload";
import { publicRead } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const Media: CollectionConfig = {
  slug: "media",
  labels: { singular: "Media asset", plural: "Media library" },
  admin: {
    group: PAYLOAD_GROUPS.system,
  },
  upload: {
    staticDir: "public/media",
    mimeTypes: ["image/*", "video/mp4", "video/webm"],
    imageSizes: [
      {
        name: "thumbnail",
        width: 480,
        height: 480,
        position: "centre",
      },
      {
        name: "card",
        width: 960,
        height: 720,
        position: "centre",
      },
      {
        name: "hero",
        width: 2400,
        height: 1350,
        position: "centre",
      },
      {
        name: "og",
        width: 1200,
        height: 630,
        position: "centre",
      },
    ],
    adminThumbnail: "thumbnail",
    focalPoint: true,
  },
  access: {
    read: publicRead,
  },
  fields: [
    {
      name: "alt",
      type: "text",
      required: true,
    },
    {
      name: "caption",
      type: "text",
    },
  ],
};
