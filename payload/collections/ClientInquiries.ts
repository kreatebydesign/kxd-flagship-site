/**
 * Client Inquiries — Managed Client Lead Operations (Phase 2).
 *
 * Operational record of an inquiry actually received by a managed client.
 * Not a raw analytics event. Not a KXD sales-lead. Not a confirmed sale.
 * Not a commission event.
 *
 * Attribution evidence remains on client-site-events (CSI).
 */

import type { CollectionConfig } from "payload";
import { denyAll, isStudioPayloadOperator } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const ClientInquiries: CollectionConfig = {
  slug: "client-inquiries",
  labels: {
    singular: "Client Inquiry",
    plural: "Client Inquiries",
  },
  defaultSort: "-receivedAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "inquiryKey",
    defaultColumns: [
      "inquiryKey",
      "clientKey",
      "channel",
      "operationalStatus",
      "verificationState",
      "reconciliationState",
      "receivedAt",
    ],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Managed-client received inquiries. Sibling to KXD sales-leads — never promoted into KXD Sales.",
  },
  access: {
    read: ({ req: { user } }) => isStudioPayloadOperator(user),
    create: ({ req: { user } }) => isStudioPayloadOperator(user),
    update: ({ req: { user } }) => isStudioPayloadOperator(user),
    delete: denyAll,
  },
  fields: [
    {
      name: "inquiryKey",
      type: "text",
      required: true,
      unique: true,
      index: true,
      label: "Stable Inquiry ID",
      admin: {
        description: "Immutable operational identity for this received inquiry.",
      },
    },
    {
      name: "client",
      type: "relationship",
      relationTo: "clients",
      required: true,
      index: true,
      label: "Client",
      admin: { position: "sidebar" },
    },
    {
      name: "clientKey",
      type: "text",
      required: true,
      index: true,
      label: "Client Key",
      admin: {
        position: "sidebar",
        description: "Must match clients.slug / CSI clientKey.",
      },
    },
    {
      name: "channel",
      type: "select",
      required: true,
      defaultValue: "form",
      options: [
        { label: "Form", value: "form" },
        { label: "Call", value: "call" },
        { label: "Email", value: "email" },
        { label: "Chat", value: "chat" },
        { label: "Walk-in", value: "walk_in" },
        { label: "Other", value: "other" },
      ],
    },
    {
      name: "receivedAt",
      type: "date",
      required: true,
      index: true,
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
    {
      name: "destinationInbox",
      type: "text",
      label: "Destination / Inbox",
    },
    {
      name: "landingPage",
      type: "text",
      label: "Landing Page",
    },
    {
      name: "campaign",
      type: "text",
      label: "Campaign",
    },
    {
      name: "sourceMedium",
      type: "text",
      label: "Source / Medium",
    },
    {
      name: "contactName",
      type: "text",
      label: "Contact Name",
    },
    {
      name: "contactEmail",
      type: "email",
      label: "Contact Email",
    },
    {
      name: "contactPhone",
      type: "text",
      label: "Contact Phone",
    },
    {
      name: "messageSummary",
      type: "textarea",
      label: "Inquiry Summary",
      admin: {
        description: "Short operational summary — avoid dumping full PII threads.",
      },
    },
    {
      name: "assignedOwner",
      type: "relationship",
      relationTo: "users",
      label: "Assigned Owner",
      admin: { position: "sidebar" },
    },
    {
      name: "firstRespondedAt",
      type: "date",
      label: "First Response At",
      admin: { date: { pickerAppearance: "dayAndTime" }, position: "sidebar" },
    },
    {
      name: "responseTimeSeconds",
      type: "number",
      label: "Response Time (seconds)",
      admin: {
        position: "sidebar",
        description: "Derived from receivedAt → firstRespondedAt.",
        readOnly: true,
      },
    },
    {
      name: "operationalStatus",
      type: "select",
      required: true,
      defaultValue: "new",
      index: true,
      options: [
        { label: "New", value: "new" },
        { label: "Acknowledged", value: "acknowledged" },
        { label: "In Progress", value: "in_progress" },
        { label: "Closed", value: "closed" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "disposition",
      type: "select",
      defaultValue: "none",
      options: [
        { label: "None", value: "none" },
        { label: "Contacted", value: "contacted" },
        { label: "Nurturing", value: "nurturing" },
        { label: "Appointment set", value: "appointment_set" },
        { label: "Not interested", value: "not_interested" },
        { label: "Unable to reach", value: "unable_to_reach" },
        { label: "Spam", value: "spam" },
        { label: "Other", value: "other" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "leadQuality",
      type: "select",
      defaultValue: "unreviewed",
      options: [
        { label: "Unreviewed", value: "unreviewed" },
        { label: "High", value: "high" },
        { label: "Medium", value: "medium" },
        { label: "Low", value: "low" },
        { label: "Spam", value: "spam" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "verificationState",
      type: "select",
      required: true,
      defaultValue: "unverified",
      index: true,
      options: [
        { label: "Unverified", value: "unverified" },
        { label: "Verified", value: "verified" },
        { label: "Rejected", value: "rejected" },
        { label: "Spam", value: "spam" },
        { label: "Duplicate", value: "duplicate" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "verifiedAt",
      type: "date",
      admin: { date: { pickerAppearance: "dayAndTime" }, position: "sidebar" },
    },
    {
      name: "verifiedBy",
      type: "relationship",
      relationTo: "users",
      admin: { position: "sidebar" },
    },
    {
      name: "qualificationState",
      type: "select",
      required: true,
      defaultValue: "unreviewed",
      index: true,
      options: [
        { label: "Unreviewed", value: "unreviewed" },
        { label: "Qualified", value: "qualified" },
        { label: "Unqualified", value: "unqualified" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "outcomeState",
      type: "select",
      required: true,
      defaultValue: "open",
      index: true,
      options: [
        { label: "Open", value: "open" },
        { label: "Won", value: "won" },
        { label: "Lost", value: "lost" },
        { label: "No response", value: "no_response" },
        { label: "Not applicable", value: "not_applicable" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "outcomeNote",
      type: "textarea",
      label: "Outcome Note",
    },
    {
      name: "confirmedSaleReference",
      type: "text",
      label: "Confirmed Sale Reference",
      admin: {
        description:
          "Human-authorized sale reference only. Never implies commission by itself.",
      },
    },
    {
      name: "sourceSystem",
      type: "text",
      label: "Source System",
      admin: { position: "sidebar" },
    },
    {
      name: "sourceExternalId",
      type: "text",
      index: true,
      label: "Source External ID",
      admin: {
        position: "sidebar",
        description: "e.g. OTP stable lead ID — provenance only.",
      },
    },
    {
      name: "sourceClientSiteEvent",
      type: "relationship",
      relationTo: "client-site-events",
      unique: true,
      label: "Linked CSI Event",
      admin: {
        position: "sidebar",
        description: "Attribution evidence link — not business truth.",
      },
    },
    {
      name: "reconciliationState",
      type: "select",
      required: true,
      defaultValue: "unlinked",
      index: true,
      options: [
        { label: "Unlinked", value: "unlinked" },
        { label: "Matched", value: "matched" },
        { label: "Ads without inquiry", value: "ads_without_inquiry" },
        { label: "Inquiry without ads", value: "inquiry_without_ads" },
        { label: "Not applicable", value: "not_applicable" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "googleConversionObserved",
      type: "checkbox",
      defaultValue: false,
      label: "Google Conversion Observed",
      admin: {
        position: "sidebar",
        description: "Evidence flag only — not proof of receipt or sale.",
      },
    },
    {
      name: "operatorNotes",
      type: "textarea",
      label: "Operator Notes",
      admin: {
        description: "Brief operational notes. Relationship history stays in Activity Engine.",
      },
    },
  ],
};
