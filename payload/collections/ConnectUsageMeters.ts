import type { CollectionConfig } from "payload";
import { isAuthenticated, isPayloadAdminUser } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

/**
 * Phase 6 Batch C0 — organization-scoped usage meter aggregates.
 * Quantities only — never message bodies, filenames, or personal content.
 */
export const ConnectUsageMeters: CollectionConfig = {
  slug: "connect-usage-meters",
  labels: {
    singular: "Connect Usage Meter",
    plural: "Connect Usage Meters",
  },
  defaultSort: "-updatedAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "meterKey",
    defaultColumns: [
      "organization",
      "meterKey",
      "periodKey",
      "quantity",
      "updatedAt",
    ],
    group: PAYLOAD_GROUPS.system,
    description:
      "Daily organization-scoped Connect usage aggregates. " +
      "No customer dashboard, pricing, or quota enforcement in C0.",
  },
  access: {
    read: isAuthenticated,
    create: isPayloadAdminUser,
    update: isPayloadAdminUser,
    delete: isPayloadAdminUser,
  },
  fields: [
    {
      name: "organization",
      type: "relationship",
      relationTo: "connect-organizations",
      required: true,
      index: true,
      label: "Organization",
      admin: { position: "sidebar" },
    },
    {
      name: "meterKey",
      type: "select",
      required: true,
      index: true,
      label: "Meter",
      options: [
        { label: "Active internal members", value: "active_internal_members" },
        {
          label: "Active external participants",
          value: "active_external_participants",
        },
        { label: "Messages sent", value: "messages_sent" },
        { label: "Conversations created", value: "conversations_created" },
        { label: "Attachment bytes stored", value: "attachment_bytes_stored" },
        { label: "Upload transfer bytes", value: "transfer_bytes_upload" },
        { label: "Download transfer bytes", value: "transfer_bytes_download" },
        { label: "Notifications sent", value: "notifications_sent" },
        { label: "AI operations", value: "ai_operations" },
        { label: "AI tokens", value: "ai_tokens" },
        {
          label: "AI estimated provider cost (micros)",
          value: "ai_estimated_provider_cost_micros",
        },
      ],
    },
    {
      name: "periodKind",
      type: "select",
      required: true,
      defaultValue: "daily",
      label: "Period kind",
      options: [{ label: "Daily", value: "daily" }],
      admin: { position: "sidebar" },
    },
    {
      name: "periodKey",
      type: "text",
      required: true,
      index: true,
      label: "Period key",
      admin: {
        description: "UTC daily key YYYY-MM-DD.",
      },
    },
    {
      name: "quantity",
      type: "number",
      required: true,
      defaultValue: 0,
      label: "Quantity",
      admin: {
        description: "Aggregate quantity only. Never content payloads.",
      },
    },
  ],
};
