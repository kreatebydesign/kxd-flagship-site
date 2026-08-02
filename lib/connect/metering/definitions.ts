/**
 * Phase 6 Batch C0 — Connect meter definitions.
 * Quantities only — never message bodies, filenames, or personal content.
 */

import type { ConnectMeterKey } from "../types";

export type ConnectMeterDefinition = {
  key: ConnectMeterKey;
  label: string;
  unit: string;
  description: string;
};

export const CONNECT_METER_DEFINITIONS: readonly ConnectMeterDefinition[] = [
  {
    key: "active_internal_members",
    label: "Active internal members",
    unit: "count",
    description: "Gauge of active internal organization members.",
  },
  {
    key: "active_external_participants",
    label: "Active external participants",
    unit: "count",
    description: "Gauge of active external participants (future).",
  },
  {
    key: "messages_sent",
    label: "Messages sent",
    unit: "count",
    description: "Messages sent counter (future capability).",
  },
  {
    key: "conversations_created",
    label: "Conversations created",
    unit: "count",
    description: "Conversations created counter (future capability).",
  },
  {
    key: "attachment_bytes_stored",
    label: "Attachment bytes stored",
    unit: "bytes",
    description: "Stored attachment bytes (future capability).",
  },
  {
    key: "transfer_bytes_upload",
    label: "Upload transfer bytes",
    unit: "bytes",
    description: "Upload transfer volume (future capability).",
  },
  {
    key: "transfer_bytes_download",
    label: "Download transfer bytes",
    unit: "bytes",
    description: "Download transfer volume (future capability).",
  },
  {
    key: "notifications_sent",
    label: "Notifications sent",
    unit: "count",
    description: "Notification volume (future capability).",
  },
  {
    key: "ai_operations",
    label: "AI operations",
    unit: "count",
    description: "AI operation count (future capability).",
  },
  {
    key: "ai_tokens",
    label: "AI tokens",
    unit: "tokens",
    description: "AI token usage (future capability).",
  },
  {
    key: "ai_estimated_provider_cost_micros",
    label: "AI estimated provider cost",
    unit: "micros",
    description: "Estimated provider cost in micros (future capability).",
  },
] as const;

const KEY_SET = new Set(CONNECT_METER_DEFINITIONS.map((d) => d.key));

export function isConnectMeterKey(value: string): value is ConnectMeterKey {
  return KEY_SET.has(value as ConnectMeterKey);
}

export function getConnectMeterDefinition(
  key: ConnectMeterKey,
): ConnectMeterDefinition {
  const found = CONNECT_METER_DEFINITIONS.find((d) => d.key === key);
  if (!found) {
    throw new Error(`Unknown Connect meter key: ${key}`);
  }
  return found;
}
