import type { CollectionConfig } from "payload";
import { isAuthenticated, isPayloadAdminUser } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

/**
 * Phase 6 Batch C0 — meter increment idempotency keys.
 * Prevents double-count when an event is replayed.
 */
export const ConnectUsageIdempotency: CollectionConfig = {
  slug: "connect-usage-idempotency",
  labels: {
    singular: "Connect Usage Idempotency",
    plural: "Connect Usage Idempotency",
  },
  defaultSort: "-createdAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "idempotencyKey",
    defaultColumns: ["organization", "idempotencyKey", "meterKey", "createdAt"],
    group: PAYLOAD_GROUPS.system,
    description:
      "Idempotency ledger for Connect meter increments. Unique per organization + key.",
  },
  access: {
    read: isAuthenticated,
    create: isPayloadAdminUser,
    update: () => false,
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
      name: "idempotencyKey",
      type: "text",
      required: true,
      index: true,
      label: "Idempotency key",
    },
    {
      name: "meterKey",
      type: "text",
      required: true,
      label: "Meter key",
    },
    {
      name: "periodKind",
      type: "text",
      required: true,
      defaultValue: "daily",
      label: "Period kind",
    },
    {
      name: "periodKey",
      type: "text",
      required: true,
      label: "Period key",
    },
    {
      name: "delta",
      type: "number",
      required: true,
      label: "Delta applied",
    },
  ],
};
