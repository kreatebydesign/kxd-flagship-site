/**
 * KXD OS integration boundary.
 * Website writes to Payload; KXD OS reads/writes via shared collections and future API layer.
 * Do not build OS features here — only prepare contracts and extension points.
 */

export type KxdOsEntityType =
  | "lead"
  | "client"
  | "workspace"
  | "project"
  | "support-request";

export type KxdOsSyncStatus = "pending" | "synced" | "error";

export type KxdOsReference = {
  entityType: KxdOsEntityType;
  entityId: string;
  syncedAt?: string;
  status: KxdOsSyncStatus;
};

export const KXD_OS_CONFIG = {
  apiBaseUrl: process.env.KXD_OS_API_BASE_URL || "",
  isEnabled: Boolean(process.env.KXD_OS_API_BASE_URL),
} as const;

export const KXD_OS_COLLECTION_MAP = {
  inquiries: "lead",
  "platform-applications": "lead",
  projects: "project",
} as const satisfies Record<string, KxdOsEntityType>;

// Future: syncInquiryToKxdOs, syncPlatformApplication, webhook handlers
