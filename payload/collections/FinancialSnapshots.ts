import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

const SNAPSHOT_TYPES = [
  { label: "Executive", value: "executive" },
  { label: "Client", value: "client" },
  { label: "MRR", value: "mrr" },
  { label: "Pipeline", value: "pipeline" },
  { label: "Contracted", value: "contracted" },
  { label: "Renewal", value: "renewal" },
  { label: "At Risk", value: "at-risk" },
] as const;

export const FinancialSnapshots: CollectionConfig = {
  slug: "financial-snapshots",
  labels: { singular: "Financial Snapshot", plural: "Financial Snapshots" },
  defaultSort: "-generatedAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "periodLabel",
    defaultColumns: ["snapshotType", "client", "periodLabel", "generatedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description: "Deterministic financial snapshots — rebuilt via Financial Command API.",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: "snapshotType",
      type: "select",
      required: true,
      options: [...SNAPSHOT_TYPES],
      admin: { position: "sidebar" },
    },
    {
      name: "client",
      type: "relationship",
      relationTo: "clients",
      admin: { position: "sidebar" },
    },
    { name: "periodLabel", type: "text", required: true, label: "Period Label" },
    {
      name: "generatedAt",
      type: "date",
      required: true,
      admin: { date: { pickerAppearance: "dayAndTime" }, position: "sidebar" },
    },
    {
      name: "metrics",
      type: "json",
      required: true,
      label: "Snapshot Metrics",
    },
  ],
};
