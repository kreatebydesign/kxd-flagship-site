import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

const EVENT_TYPES = [
  { label: "Created", value: "contract.created" },
  { label: "Sent", value: "contract.sent" },
  { label: "Viewed", value: "contract.viewed" },
  { label: "Signed", value: "contract.signed" },
  { label: "Declined", value: "contract.declined" },
  { label: "Expired", value: "contract.expired" },
  { label: "Archived", value: "contract.archived" },
] as const;

export const ContractActivity: CollectionConfig = {
  slug: "contract-activity",
  labels: { singular: "Contract Activity", plural: "Contract Activity" },
  defaultSort: "-occurredAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "title",
    defaultColumns: ["contract", "eventType", "title", "occurredAt"],
    group: PAYLOAD_GROUPS.kxdOs,
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: "contract",
      type: "relationship",
      relationTo: "contracts" as "clients",
      required: true,
      admin: { position: "sidebar" },
    },
    {
      name: "client",
      type: "relationship",
      relationTo: "clients",
      admin: { position: "sidebar" },
    },
    {
      name: "eventType",
      type: "select",
      required: true,
      options: [...EVENT_TYPES],
      admin: { position: "sidebar" },
    },
    { name: "title", type: "text", required: true },
    { name: "summary", type: "textarea" },
    { name: "actor", type: "text" },
    {
      name: "occurredAt",
      type: "date",
      required: true,
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
    { name: "metadata", type: "json" },
  ],
};
