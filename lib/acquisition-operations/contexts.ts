/**
 * Acquisition & Lead Operations — business contexts.
 *
 * Two sibling contexts under one shared domain. Distinct canonical records;
 * shared contracts coordinate them. No universal lead object.
 */

export const ACQUISITION_CONTEXTS = {
  kxd_acquisition: "kxd_acquisition",
  managed_client: "managed_client",
} as const;

export type AcquisitionContext =
  (typeof ACQUISITION_CONTEXTS)[keyof typeof ACQUISITION_CONTEXTS];

export function isAcquisitionContext(value: unknown): value is AcquisitionContext {
  return value === "kxd_acquisition" || value === "managed_client";
}

/** KXD Acquisition source record types (intake / opportunity). */
export const KXD_SOURCE_RECORD_TYPES = {
  research_lead: "research_lead",
  inquiry: "inquiry",
  project_inquiry: "project_inquiry",
  website_audit: "website_audit",
  sales_lead: "sales_lead",
} as const;

export type KxdSourceRecordType =
  (typeof KXD_SOURCE_RECORD_TYPES)[keyof typeof KXD_SOURCE_RECORD_TYPES];

/**
 * Managed Client Lead Operations source types — Phase 2 contracts only.
 * Do not invent client-inquiries persistence in Phase 1.
 */
export const MANAGED_CLIENT_SOURCE_RECORD_TYPES = {
  client_site_event: "client_site_event",
  client_inquiry: "client_inquiry",
  reporting_fact: "reporting_fact",
} as const;

export type ManagedClientSourceRecordType =
  (typeof MANAGED_CLIENT_SOURCE_RECORD_TYPES)[keyof typeof MANAGED_CLIENT_SOURCE_RECORD_TYPES];

export type AcquisitionSourceRecordType =
  | KxdSourceRecordType
  | ManagedClientSourceRecordType;
