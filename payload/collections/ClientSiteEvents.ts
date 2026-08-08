/**
 * Client Site Event Registry — Shared Core ingest facts (csi-v1-a).
 * Not CRM. Not Product Intelligence meaning. Not a monthly-work ledger.
 *
 * Access doctrine:
 * - Public/anonymous: deny all
 * - Portal JWTs / restricted staff: deny all
 * - Studio operators: read-only in Admin/REST
 * - Creates/updates: server webhook path only (overrideAccess)
 * - Deletes: denied (immutable registry; no casual destructive access)
 */

import type { CollectionConfig } from "payload";
import { denyAll, isStudioPayloadOperator } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const ClientSiteEvents: CollectionConfig = {
  slug: "client-site-events",
  labels: {
    singular: "Client Site Event",
    plural: "Client Site Events",
  },
  defaultSort: "-receivedAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "externalEventId",
    defaultColumns: [
      "clientKey",
      "eventClass",
      "externalEventId",
      "sourceSystem",
      "visibilityState",
      "processingStatus",
      "receivedAt",
    ],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Canonical Client Site Intelligence ingest registry. Website leads are attribution facts — not a CRM pipeline. Creates arrive only via signed webhook (overrideAccess).",
  },
  access: {
    // Studio operators may inspect sensitive records in Admin.
    // Portal users and anonymous callers never pass isStudioPayloadOperator.
    read: ({ req: { user } }) => isStudioPayloadOperator(user),
    // Ingest creates only through CSI webhook with overrideAccess: true.
    create: denyAll,
    // Activity-link updates only through CSI server store with overrideAccess: true.
    update: denyAll,
    // Immutable ingest registry — no casual delete via REST/Admin/GraphQL.
    delete: denyAll,
  },
  fields: [
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
      admin: { position: "sidebar" },
    },
    {
      name: "eventClass",
      type: "select",
      required: true,
      index: true,
      options: [
        { label: "Website Lead", value: "website_lead" },
        { label: "Qualified Conversion", value: "qualified_conversion" },
        { label: "Confirmed Sale", value: "confirmed_sale" },
        { label: "Deployment", value: "deployment" },
        { label: "SEO Milestone", value: "seo_milestone" },
        { label: "Indexing Milestone", value: "indexing_milestone" },
        { label: "Analytics Milestone", value: "analytics_milestone" },
        { label: "Form Config Change", value: "form_config_change" },
        { label: "Maintenance", value: "maintenance" },
        { label: "Operator Work", value: "operator_work" },
      ],
    },
    {
      name: "externalEventId",
      type: "text",
      required: true,
      index: true,
      label: "External Event ID",
    },
    {
      name: "sourceSystem",
      type: "text",
      required: true,
      index: true,
      label: "Source System",
    },
    {
      name: "idempotencyKey",
      type: "text",
      required: true,
      unique: true,
      index: true,
      label: "Idempotency Key",
      admin: {
        description: "sourceSystem:externalEventId:eventClass",
        readOnly: true,
      },
    },
    {
      name: "occurredAt",
      type: "date",
      required: true,
      index: true,
      admin: { date: { pickerAppearance: "dayAndTime" }, readOnly: true },
    },
    {
      name: "receivedAt",
      type: "date",
      required: true,
      index: true,
      admin: { date: { pickerAppearance: "dayAndTime" }, readOnly: true },
    },
    {
      name: "sensitivity",
      type: "select",
      required: true,
      defaultValue: "sensitive_contact",
      options: [
        { label: "Internal", value: "internal" },
        { label: "Sensitive Contact", value: "sensitive_contact" },
        { label: "Client Safe", value: "client_safe" },
      ],
      admin: {
        description:
          "Classification only — not an authorization control. Access is enforced by collection access.",
        readOnly: true,
      },
    },
    {
      name: "visibilityState",
      type: "select",
      required: true,
      defaultValue: "internal_only",
      index: true,
      options: [
        { label: "Internal Only", value: "internal_only" },
        { label: "Client Visible", value: "client_visible" },
      ],
      admin: {
        description:
          "Presentation intent only — not an authorization control. Portal cannot read this collection.",
        readOnly: true,
      },
    },
    {
      name: "processingStatus",
      type: "select",
      required: true,
      defaultValue: "received",
      index: true,
      options: [
        { label: "Received", value: "received" },
        { label: "Persisted", value: "persisted" },
        { label: "Activity Published", value: "activity_published" },
        { label: "Failed", value: "failed" },
      ],
      admin: { readOnly: true },
    },
    {
      name: "lifecycleStatus",
      type: "select",
      required: true,
      defaultValue: "new",
      index: true,
      options: [
        { label: "New", value: "new" },
        { label: "Acknowledged", value: "acknowledged" },
        { label: "Sale Confirmed", value: "sold_confirmed" },
        { label: "Closed — No Sale", value: "closed_no_sale" },
      ],
      admin: {
        readOnly: true,
        description:
          "Authoritative operator lifecycle. Website ingest cannot change this field.",
      },
    },
    {
      name: "commissionStatus",
      type: "select",
      required: true,
      defaultValue: "not_due",
      index: true,
      options: [
        { label: "Not Due", value: "not_due" },
        { label: "Due", value: "due" },
        { label: "Paid", value: "paid" },
      ],
      admin: {
        readOnly: true,
        description:
          "Internal commission obligation state. Never controlled by website ingest.",
      },
    },
    {
      name: "commissionAmountCents",
      type: "number",
      min: 0,
      admin: {
        readOnly: true,
        description:
          "Authoritative commission amount, created only by operator sale confirmation.",
      },
    },
    {
      name: "soldAt",
      type: "date",
      admin: { readOnly: true, date: { pickerAppearance: "dayAndTime" } },
    },
    { name: "saleReference", type: "text", admin: { readOnly: true } },
    { name: "cartModelReference", type: "text", admin: { readOnly: true } },
    {
      name: "confirmedBy",
      type: "relationship",
      relationTo: "users",
      admin: { readOnly: true },
    },
    {
      name: "confirmedAt",
      type: "date",
      admin: { readOnly: true, date: { pickerAppearance: "dayAndTime" } },
    },
    {
      name: "commissionPaidAt",
      type: "date",
      admin: { readOnly: true, date: { pickerAppearance: "dayAndTime" } },
    },
    {
      name: "commissionPaymentReference",
      type: "text",
      admin: {
        readOnly: true,
        description:
          "Optional safe payment reference or operator note. No card data.",
      },
    },
    {
      name: "commissionPaidBy",
      type: "relationship",
      relationTo: "users",
      admin: { readOnly: true },
    },
    {
      name: "payload",
      type: "json",
      required: true,
      label: "Normalized Payload",
      admin: {
        description:
          "Bounded attribution payload (may include contact fields). Studio operator read-only. Commission/sale authority fields are ingest-forced to not_due / null.",
        readOnly: true,
      },
    },
    {
      name: "ingestMeta",
      type: "json",
      label: "Ingest Metadata",
      admin: {
        description:
          "Safe processing metadata only — never stores untrusted raw authority values.",
        readOnly: true,
      },
    },
    {
      name: "activityTimelineEventId",
      type: "number",
      label: "Activity Timeline Event ID",
      admin: {
        description:
          "Linked executive-timeline-events id when Activity was published.",
        readOnly: true,
      },
    },
  ],
};
