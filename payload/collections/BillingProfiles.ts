import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

const PAYMENT_PREFERENCES = [
  { label: "Invoice", value: "invoice" },
  { label: "ACH", value: "ach" },
  { label: "Card", value: "card" },
  { label: "Wire", value: "wire" },
  { label: "Other", value: "other" },
] as const;

const INVOICE_CADENCES = [
  { label: "Monthly", value: "monthly" },
  { label: "Quarterly", value: "quarterly" },
  { label: "Milestone", value: "milestone" },
  { label: "On Completion", value: "on-completion" },
] as const;

const PAYMENT_TERMS = [
  { label: "Due on Receipt", value: "due-on-receipt" },
  { label: "Net 15", value: "net-15" },
  { label: "Net 30", value: "net-30" },
  { label: "Net 45", value: "net-45" },
] as const;

const BILLING_STATUSES = [
  { label: "Not Configured", value: "not-configured" },
  { label: "Partial", value: "partial" },
  { label: "Active", value: "active" },
  { label: "Paused", value: "paused" },
  { label: "Archived", value: "archived" },
] as const;

export const BillingProfiles: CollectionConfig = {
  slug: "billing-profiles",
  labels: { singular: "Billing Profile", plural: "Billing Profiles" },
  defaultSort: "-updatedAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "billingContact",
    defaultColumns: ["client", "billingEmail", "billingStatus", "invoiceCadence", "updatedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description: "Per-client billing configuration — workspace: /admin/operations/client-command/[id]?tab=financial",
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
      name: "billingStatus",
      type: "select",
      required: true,
      defaultValue: "not-configured",
      options: [...BILLING_STATUSES],
      admin: { position: "sidebar" },
    },
    { name: "billingContact", type: "text", label: "Billing Contact" },
    { name: "billingEmail", type: "email", label: "Billing Email" },
    {
      name: "paymentPreference",
      type: "select",
      defaultValue: "invoice",
      options: [...PAYMENT_PREFERENCES],
      admin: { position: "sidebar" },
    },
    {
      name: "invoiceCadence",
      type: "select",
      defaultValue: "monthly",
      options: [...INVOICE_CADENCES],
      admin: { position: "sidebar" },
    },
    {
      name: "paymentTerms",
      type: "select",
      defaultValue: "net-30",
      options: [...PAYMENT_TERMS],
      admin: { position: "sidebar" },
    },
    {
      name: "missingSetupFlags",
      type: "json",
      label: "Missing Setup Flags",
      admin: {
        description: "e.g. missing-billing-email, missing-payment-terms, missing-external-id",
      },
    },
    {
      name: "stripeCustomerId",
      type: "text",
      label: "Stripe Customer ID",
      admin: { description: "Future-ready — Stripe integration." },
    },
    {
      name: "stripeSubscriptionId",
      type: "text",
      label: "Stripe Subscription ID",
    },
    {
      name: "quickbooksCustomerId",
      type: "text",
      label: "QuickBooks Customer ID",
      admin: { description: "Future-ready — QuickBooks integration." },
    },
    {
      name: "waveCustomerId",
      type: "text",
      label: "Wave Customer ID",
      admin: { description: "Future-ready — Wave integration." },
    },
    { name: "executiveNotes", type: "textarea", label: "Executive Notes (private)" },
  ],
};
