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

/** Phase 37G — explicit ISO 4217 codes currently supported by KXD billing config. */
const CURRENCY_CODES = [{ label: "USD", value: "usd" }] as const;

/** Phase 37G — intended collection behavior (internal; not Stripe execution). */
const COLLECTION_METHODS = [
  { label: "Send invoice", value: "send_invoice" },
  { label: "Charge automatically", value: "charge_automatically" },
] as const;

/** Phase 37G — conservative tax posture only; never calculates tax. */
const TAX_POSTURES = [
  { label: "Not configured", value: "not_configured" },
  { label: "Tax exempt", value: "tax_exempt" },
  { label: "Taxable", value: "taxable" },
  { label: "Requires review", value: "requires_review" },
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
      name: "currencyCode",
      type: "select",
      label: "Currency",
      options: [...CURRENCY_CODES],
      admin: {
        description:
          "Authoritative billing currency. Null until an operator explicitly configures it — never inferred.",
      },
    },
    {
      name: "collectionMethod",
      type: "select",
      label: "Collection Method",
      options: [...COLLECTION_METHODS],
      admin: {
        description:
          "Intended collection behavior for future invoicing. Does not enable Stripe collection.",
      },
    },
    {
      name: "taxPosture",
      type: "select",
      label: "Tax Posture",
      options: [...TAX_POSTURES],
      admin: {
        description:
          "Recorded tax posture only. Does not calculate tax or configure Stripe Tax.",
      },
    },
    {
      name: "paymentPreference",
      type: "select",
      defaultValue: "invoice",
      options: [...PAYMENT_PREFERENCES],
      admin: {
        position: "sidebar",
        description:
          "Payment instrument preference (invoice/ACH/card/wire). Distinct from collection method.",
      },
    },
    {
      name: "invoiceCadence",
      type: "select",
      defaultValue: "monthly",
      options: [...INVOICE_CADENCES],
      admin: {
        position: "sidebar",
        description:
          "Billing-profile cadence preference only. Commercial retainer cadence remains on the agreement.",
      },
    },
    {
      name: "paymentTerms",
      type: "select",
      defaultValue: "net-30",
      options: [...PAYMENT_TERMS],
      admin: {
        position: "sidebar",
        description:
          "Due terms for send-invoice collection. Not applicable to automatic collection.",
      },
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
