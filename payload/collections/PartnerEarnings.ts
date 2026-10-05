/**
 * Partner commission / earnings ledger — operator-authored only.
 * Partners see approved + paid entries (safe fields only).
 */
import type { CollectionConfig } from "payload";
import { isPayloadAdminUser, isStudioPayloadOperator } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const PartnerEarnings: CollectionConfig = {
  slug: "partner-earnings",
  labels: { singular: "Partner Earning", plural: "Partner Earnings" },
  defaultSort: "-createdAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "relatedBusinessName",
    defaultColumns: [
      "relatedBusinessName",
      "earningType",
      "amountCents",
      "paymentStatus",
      "partner",
      "updatedAt",
    ],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Partner-attributed commission ledger. Operators approve, adjust, void, and mark paid. " +
      "Never calculate from proposal quotes. Partners see only approved/paid safe fields.",
  },
  access: {
    read: ({ req: { user } }) => Boolean(user) && isStudioPayloadOperator(user),
    create: isPayloadAdminUser,
    update: isPayloadAdminUser,
    delete: isPayloadAdminUser,
  },
  fields: [
    {
      name: "partner",
      type: "relationship",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      relationTo: "kxd-partner-profiles" as any,
      required: true,
      label: "Partner",
      admin: { position: "sidebar" },
    },
    {
      name: "earningType",
      type: "select",
      required: true,
      label: "Earning type",
      options: [
        { label: "Project commission", value: "project_commission" },
        { label: "Monthly bonus", value: "monthly_bonus" },
        { label: "Retention kicker", value: "retention_kicker" },
        { label: "Performance bonus", value: "performance_bonus" },
        { label: "Adjustment", value: "adjustment" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "paymentStatus",
      type: "select",
      required: true,
      defaultValue: "pending_approval",
      label: "Payment status",
      options: [
        { label: "Pending review", value: "pending_approval" },
        { label: "Approved", value: "approved" },
        { label: "Paid", value: "paid" },
        { label: "Void", value: "void" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "relatedBusinessName",
      type: "text",
      required: true,
      label: "Related business",
    },
    {
      name: "amountCents",
      type: "number",
      required: true,
      min: 0,
      label: "Amount (cents)",
      admin: {
        description: "Payable amount in cents. Partners cannot alter.",
      },
    },
    {
      name: "rateBps",
      type: "number",
      min: 0,
      max: 10000,
      label: "Rate (basis points)",
      admin: {
        description: "Snapshot at creation. 1000 = 10%.",
      },
    },
    {
      name: "eligibleCollectedCents",
      type: "number",
      min: 0,
      label: "Eligible collected amount (cents)",
      admin: {
        description:
          "Snapshot of collected eligible revenue used for the calculation. Never a proposal quote.",
      },
    },
    {
      name: "relevantMonth",
      type: "text",
      label: "Relevant month",
      admin: {
        description: "e.g. 2026-09. Optional for project commissions.",
      },
    },
    {
      name: "coveredServiceMonth",
      type: "number",
      min: 1,
      max: 24,
      label: "Covered service month",
      admin: {
        description: "1–3 for monthly bonus; 4 for retention kicker when applicable.",
      },
    },
    {
      name: "relatedSalesLead",
      type: "relationship",
      relationTo: "sales-leads",
      label: "Related sales lead",
      admin: { position: "sidebar" },
    },
    {
      name: "relatedPartnerReferral",
      type: "relationship",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      relationTo: "partner-referrals" as any,
      label: "Related partner referral",
      admin: { position: "sidebar" },
    },
    {
      name: "approvedBy",
      type: "text",
      label: "Approved by",
      admin: { position: "sidebar" },
    },
    {
      name: "approvedAt",
      type: "date",
      label: "Approved at",
      admin: {
        position: "sidebar",
        date: { pickerAppearance: "dayAndTime" },
      },
    },
    {
      name: "paidAt",
      type: "date",
      label: "Paid at",
      admin: {
        position: "sidebar",
        date: { pickerAppearance: "dayAndTime" },
      },
    },
    {
      name: "voidedAt",
      type: "date",
      label: "Voided at",
      admin: {
        position: "sidebar",
        date: { pickerAppearance: "dayAndTime" },
      },
    },
    {
      name: "operatorNotes",
      type: "textarea",
      label: "Operator explanation",
      admin: {
        description: "Internal only. Never shown to partners.",
      },
    },
  ],
};
