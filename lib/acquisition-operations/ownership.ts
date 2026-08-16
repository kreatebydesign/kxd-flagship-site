/**
 * Canonical ownership — one owner per business fact.
 * Phase 1 documents KXD Acquisition + Phase 2 managed-client placeholders.
 */

export const CANONICAL_OWNERS = {
  kxd_researched_opportunity: "research-leads",
  kxd_sales_opportunity: "sales-leads",
  kxd_inbound_inquiry: "inquiries",
  kxd_inbound_project_inquiry: "project-inquiries",
  kxd_inbound_website_audit: "website-audits",
  managed_client_site_event: "client-site-events",
  /** Managed Client Lead Operations — received inquiries for a managed client. */
  managed_client_received_inquiry: "client-inquiries",
  attribution_reporting: "reporting",
  relationship_work_memory: "activity-engine",
} as const;

export type CanonicalOwnerKey = keyof typeof CANONICAL_OWNERS;

/** KXD sales opportunities always resolve to sales-leads — never a second pipeline. */
export const KXD_CANONICAL_SALES_COLLECTION = "sales-leads" as const;
