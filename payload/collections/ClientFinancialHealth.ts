import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

const RISK_LEVELS = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Critical", value: "critical" },
] as const;

const RENEWAL_STATUSES = [
  { label: "Not Applicable", value: "n/a" },
  { label: "Current", value: "current" },
  { label: "Approaching", value: "approaching" },
  { label: "Overdue", value: "overdue" },
  { label: "Ended", value: "ended" },
] as const;

export const ClientFinancialHealth: CollectionConfig = {
  slug: "client-financial-health",
  labels: { singular: "Client Financial Health", plural: "Client Financial Health" },
  defaultSort: "-lastCalculatedAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "client",
    defaultColumns: ["client", "healthScore", "riskLevel", "mrr", "billingSetupComplete", "lastCalculatedAt"],
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
      name: "client",
      type: "relationship",
      relationTo: "clients",
      required: true,
      unique: true,
      admin: { position: "sidebar" },
    },
    {
      name: "healthScore",
      type: "number",
      defaultValue: 50,
      min: 0,
      max: 100,
      admin: { position: "sidebar" },
    },
    {
      name: "riskLevel",
      type: "select",
      defaultValue: "low",
      options: [...RISK_LEVELS],
      admin: { position: "sidebar" },
    },
    { name: "mrr", type: "number", label: "MRR ($)" },
    { name: "lifetimeValue", type: "number", label: "Lifetime Value ($)" },
    { name: "contractedValue", type: "number", label: "Contracted Value ($)" },
    { name: "pipelineValue", type: "number", label: "Pipeline Value ($)" },
    { name: "projectValue", type: "number", label: "Project Value ($)" },
    { name: "atRiskAmount", type: "number", label: "At-Risk Amount ($)" },
    {
      name: "billingSetupComplete",
      type: "checkbox",
      defaultValue: false,
      admin: { position: "sidebar" },
    },
    {
      name: "renewalStatus",
      type: "select",
      defaultValue: "n/a",
      options: [...RENEWAL_STATUSES],
      admin: { position: "sidebar" },
    },
    { name: "flags", type: "json", label: "Risk Flags" },
    { name: "recommendations", type: "json", label: "Recommendations" },
    {
      name: "lastCalculatedAt",
      type: "date",
      admin: { date: { pickerAppearance: "dayAndTime" }, position: "sidebar" },
    },
  ],
};
