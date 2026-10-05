/**
 * Operator-editable partner commission policy defaults.
 * Not partner-writable. Not automatic payout.
 */
import type { CollectionConfig } from "payload";
import { isPayloadAdminUser, isStudioPayloadOperator } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const PartnerCommissionPolicies: CollectionConfig = {
  slug: "partner-commission-policies",
  labels: {
    singular: "Partner Commission Policy",
    plural: "Partner Commission Policies",
  },
  defaultSort: "key",
  lockDocuments: false,
  admin: {
    useAsTitle: "key",
    defaultColumns: ["key", "projectRateBps", "monthlyRateBps", "active", "updatedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Commission policy defaults for Partner Portal earnings. " +
      "Operators create ledger entries from collected revenue; partners never calculate payouts.",
  },
  access: {
    read: ({ req: { user } }) => Boolean(user) && isStudioPayloadOperator(user),
    create: isPayloadAdminUser,
    update: isPayloadAdminUser,
    delete: isPayloadAdminUser,
  },
  fields: [
    {
      name: "key",
      type: "text",
      required: true,
      unique: true,
      defaultValue: "default",
      label: "Policy key",
      admin: {
        description: 'Use "default" for studio-wide defaults.',
      },
    },
    {
      name: "active",
      type: "checkbox",
      defaultValue: true,
      label: "Active",
      admin: { position: "sidebar" },
    },
    {
      name: "projectRateBps",
      type: "number",
      required: true,
      defaultValue: 1000,
      min: 0,
      max: 10000,
      label: "Project commission (basis points)",
      admin: {
        description: "1000 = 10% of collected eligible project revenue.",
      },
    },
    {
      name: "monthlyRateBps",
      type: "number",
      required: true,
      defaultValue: 1000,
      min: 0,
      max: 10000,
      label: "Monthly bonus (basis points)",
      admin: {
        description: "1000 = 10% of eligible paid recurring revenue for months 1–3.",
      },
    },
    {
      name: "monthlyBonusMonths",
      type: "number",
      required: true,
      defaultValue: 3,
      min: 1,
      max: 12,
      label: "Monthly bonus months",
    },
    {
      name: "retentionKickerEnabled",
      type: "checkbox",
      defaultValue: true,
      label: "Retention kicker enabled",
    },
    {
      name: "retentionKickerRateBps",
      type: "number",
      required: true,
      defaultValue: 1000,
      min: 0,
      max: 10000,
      label: "Retention kicker (basis points)",
      admin: {
        description: "One payment equal to this rate of month-4 paid eligible recurring revenue.",
      },
    },
    {
      name: "retentionKickerMonth",
      type: "number",
      required: true,
      defaultValue: 4,
      min: 2,
      max: 24,
      label: "Retention kicker month",
    },
    {
      name: "eligibleRecurringServices",
      type: "textarea",
      label: "Eligible recurring services",
      defaultValue: "Website Care\nWebsite Management\nSEO & Growth",
      admin: {
        description: "One service label per line. Operator-designated eligible retainers.",
      },
    },
    {
      name: "performanceBonusEnabled",
      type: "checkbox",
      defaultValue: true,
      label: "Performance bonus enabled",
    },
    {
      name: "performanceBonusAmountCents",
      type: "number",
      required: true,
      defaultValue: 25000,
      min: 0,
      label: "Performance bonus amount (cents)",
      admin: { description: "Initial policy: $250 = 25000 cents." },
    },
    {
      name: "performanceBonusProjectCount",
      type: "number",
      required: true,
      defaultValue: 3,
      min: 1,
      label: "Projects required",
    },
    {
      name: "performanceBonusWindowDays",
      type: "number",
      required: true,
      defaultValue: 90,
      min: 1,
      label: "Rolling window (days)",
    },
    {
      name: "operatorNotes",
      type: "textarea",
      label: "Operator notes",
      admin: {
        description: "Internal policy notes. Never shown to partners.",
      },
    },
  ],
};
