import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";
import { onEstimateItemChangeHook, onEstimateItemDeleteHook } from "../hooks/executive-proposals.ts";

const ITEM_TYPES = [
  { label: "Fixed", value: "fixed" },
  { label: "Hourly", value: "hourly" },
  { label: "Monthly Retainer", value: "monthly-retainer" },
  { label: "Quantity", value: "quantity" },
  { label: "Optional Upgrade", value: "optional-upgrade" },
] as const;

export const EstimateItems: CollectionConfig = {
  slug: "estimate-items",
  labels: { singular: "Estimate Item", plural: "Estimate Items" },
  defaultSort: "sortOrder",
  lockDocuments: false,
  admin: {
    useAsTitle: "title",
    defaultColumns: ["proposal", "title", "itemType", "unitPrice", "quantity", "isRecurring", "sortOrder"],
    group: PAYLOAD_GROUPS.kxdOs,
    description: "Proposal estimate line items — pricing engine input.",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  hooks: {
    afterChange: [onEstimateItemChangeHook],
    afterDelete: [onEstimateItemDeleteHook],
  },
  fields: [
    {
      name: "proposal",
      type: "relationship",
      relationTo: "proposals",
      required: true,
      label: "Proposal",
      admin: { position: "sidebar" },
    },
    {
      name: "itemType",
      type: "select",
      required: true,
      defaultValue: "fixed",
      options: [...ITEM_TYPES],
      admin: { position: "sidebar" },
    },
    {
      name: "isRecurring",
      type: "checkbox",
      label: "Recurring",
      defaultValue: false,
      admin: { position: "sidebar" },
    },
    {
      name: "isOptional",
      type: "checkbox",
      label: "Optional",
      defaultValue: false,
      admin: { position: "sidebar" },
    },
    {
      name: "includedByDefault",
      type: "checkbox",
      label: "Included by Default",
      defaultValue: true,
      admin: { position: "sidebar" },
    },
    {
      name: "discountable",
      type: "checkbox",
      label: "Discountable",
      defaultValue: true,
      admin: { position: "sidebar" },
    },
    {
      name: "sortOrder",
      type: "number",
      label: "Sort Order",
      defaultValue: 0,
      admin: { position: "sidebar" },
    },
    { name: "title", type: "text", required: true, label: "Title" },
    { name: "description", type: "textarea", label: "Description" },
    { name: "quantity", type: "number", label: "Quantity", defaultValue: 1 },
    { name: "unitPrice", type: "number", label: "Unit Price ($)" },
    { name: "hours", type: "number", label: "Hours" },
  ],
};
