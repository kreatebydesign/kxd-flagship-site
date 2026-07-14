import type { CollectionConfig } from "payload";
import { isPayloadAdminUser } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

/**
 * Phase 34B — Reusable client vehicle inventory.
 * Entitlement-gated in CES; Primal enabled first.
 * Public reads go through /api/public/inventory (VIN excluded).
 */
export const ClientInventoryVehicles: CollectionConfig = {
  slug: "client-inventory-vehicles",
  labels: {
    singular: "Inventory vehicle",
    plural: "Inventory vehicles",
  },
  lockDocuments: false,
  admin: {
    group: PAYLOAD_GROUPS.kxdOs,
    useAsTitle: "title",
    defaultColumns: [
      "title",
      "client",
      "condition",
      "listingStatus",
      "price",
      "featured",
      "updatedAt",
    ],
    description:
      "Client-managed vehicle listings. Public website consumption uses the inventory API only.",
  },
  access: {
    read: isPayloadAdminUser,
    create: isPayloadAdminUser,
    update: isPayloadAdminUser,
    delete: isPayloadAdminUser,
  },
  fields: [
    {
      name: "client",
      type: "relationship",
      relationTo: "clients",
      required: true,
      index: true,
      admin: { position: "sidebar" },
    },
    {
      name: "title",
      type: "text",
      required: true,
    },
    {
      name: "slug",
      type: "text",
      required: true,
      index: true,
      admin: {
        description: "URL-safe identifier unique per client.",
      },
    },
    {
      type: "row",
      fields: [
        { name: "year", type: "number", admin: { width: "25%" } },
        { name: "make", type: "text", required: true, admin: { width: "25%" } },
        { name: "model", type: "text", required: true, admin: { width: "25%" } },
        {
          name: "trim",
          type: "text",
          label: "Trim / variant",
          admin: { width: "25%" },
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "condition",
          type: "select",
          required: true,
          defaultValue: "used",
          options: [
            { label: "New", value: "new" },
            { label: "Used", value: "used" },
          ],
          admin: { width: "50%" },
        },
        {
          name: "listingStatus",
          type: "select",
          required: true,
          defaultValue: "draft",
          options: [
            { label: "Draft", value: "draft" },
            { label: "Available", value: "available" },
            { label: "Pending", value: "pending" },
            { label: "Sold", value: "sold" },
            { label: "Hidden", value: "hidden" },
            { label: "Coming soon", value: "coming_soon" },
          ],
          admin: { width: "50%" },
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "price",
          type: "number",
          admin: { width: "33%" },
        },
        {
          name: "priceDisplayMode",
          type: "select",
          defaultValue: "exact",
          options: [
            { label: "Exact", value: "exact" },
            { label: "Contact", value: "contact" },
            { label: "Call", value: "call" },
            { label: "Hidden", value: "hidden" },
          ],
          admin: { width: "33%" },
        },
        {
          name: "mileage",
          type: "number",
          admin: { width: "34%" },
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "vin",
          type: "text",
          label: "VIN",
          admin: {
            width: "50%",
            description: "Private — never exposed on public inventory API.",
          },
        },
        {
          name: "stockNumber",
          type: "text",
          label: "Stock number",
          admin: { width: "50%" },
        },
      ],
    },
    {
      name: "summary",
      type: "textarea",
      label: "Short summary",
    },
    {
      name: "description",
      type: "textarea",
      label: "Full description",
    },
    {
      name: "specifications",
      type: "array",
      labels: { singular: "Specification", plural: "Specifications" },
      fields: [
        { name: "label", type: "text", required: true },
        { name: "value", type: "text", required: true },
      ],
    },
    {
      name: "highlights",
      type: "array",
      labels: { singular: "Highlight", plural: "Highlights" },
      fields: [{ name: "text", type: "text", required: true }],
    },
    {
      name: "primaryImage",
      type: "upload",
      relationTo: "media",
      label: "Primary image",
    },
    {
      name: "gallery",
      type: "array",
      labels: { singular: "Gallery image", plural: "Gallery" },
      fields: [
        {
          name: "image",
          type: "upload",
          relationTo: "media",
          required: true,
        },
      ],
    },
    {
      name: "featured",
      type: "checkbox",
      defaultValue: false,
      admin: { position: "sidebar" },
    },
    {
      name: "sortOrder",
      type: "number",
      defaultValue: 0,
      admin: { position: "sidebar" },
    },
    {
      name: "publishedAt",
      type: "date",
      admin: {
        position: "sidebar",
        date: { pickerAppearance: "dayAndTime" },
      },
    },
    {
      name: "soldAt",
      type: "date",
      admin: {
        position: "sidebar",
        date: { pickerAppearance: "dayAndTime" },
      },
    },
    {
      name: "externalUrl",
      type: "text",
      label: "External URL",
      admin: { position: "sidebar" },
    },
    {
      name: "createdBy",
      type: "text",
      admin: { readOnly: true, position: "sidebar" },
    },
    {
      name: "updatedBy",
      type: "text",
      admin: { readOnly: true, position: "sidebar" },
    },
  ],
};
