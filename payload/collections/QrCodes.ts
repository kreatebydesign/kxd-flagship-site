import type { CollectionConfig } from "payload";
import { isPayloadAdminUser } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

/**
 * QR Generator V1 — saved QR metadata (no image blobs).
 * PNG/SVG are regenerated from destinationUrl + settings.
 * Operator-only. Not exposed to portal clients.
 */
export const QrCodes: CollectionConfig = {
  slug: "qr-codes",
  labels: {
    singular: "QR code",
    plural: "QR codes",
  },
  defaultSort: "-createdAt",
  lockDocuments: false,
  timestamps: true,
  admin: {
    useAsTitle: "label",
    defaultColumns: ["label", "destinationUrl", "client", "createdAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Operator QR Generator records. Destination URLs are stored exactly as entered; images are regenerated on demand.",
  },
  access: {
    read: isPayloadAdminUser,
    create: isPayloadAdminUser,
    update: isPayloadAdminUser,
    delete: isPayloadAdminUser,
  },
  fields: [
    {
      name: "label",
      type: "text",
      required: false,
      label: "Internal label",
      admin: {
        description: "Metadata only — never alters the QR destination.",
      },
    },
    {
      name: "destinationUrl",
      type: "text",
      required: true,
      index: true,
      label: "Destination URL",
      admin: {
        description: "Exact string encoded into the QR. Never shortened or rewritten.",
      },
    },
    {
      name: "client",
      type: "relationship",
      relationTo: "clients",
      required: false,
      index: true,
      label: "Client",
      admin: {
        description: "Optional association with an existing KXD client.",
      },
    },
    {
      name: "createdBy",
      type: "relationship",
      relationTo: "users",
      required: false,
      index: true,
      label: "Created by",
      admin: {
        readOnly: true,
      },
    },
    {
      name: "errorCorrectionLevel",
      type: "select",
      required: true,
      defaultValue: "H",
      options: [
        { label: "L", value: "L" },
        { label: "M", value: "M" },
        { label: "Q", value: "Q" },
        { label: "H", value: "H" },
      ],
      label: "Error correction",
    },
    {
      name: "width",
      type: "number",
      required: true,
      defaultValue: 1024,
      min: 128,
      max: 4096,
      label: "PNG width (px)",
    },
    {
      name: "margin",
      type: "number",
      required: true,
      defaultValue: 4,
      min: 2,
      max: 16,
      label: "Quiet zone (modules)",
    },
    {
      name: "version",
      type: "text",
      required: true,
      defaultValue: "v1",
      label: "Generator version",
      admin: {
        readOnly: true,
      },
    },
  ],
};
