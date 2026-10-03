/**
 * Primal Motorsports — first Managed Client Lead Operations activation policy.
 * Configuration only. Shared domain services must not import this by name for branching.
 */

import type { ManagedClientLeadPolicy } from "../policy";

export const PRIMAL_MOTORSPORTS_LEAD_POLICY: ManagedClientLeadPolicy = {
  clientKey: "primal-motorsports",
  context: "managed_client",
  displayName: "Primal Motorsports",
  enabled: true,
  allowedChannels: ["form", "call", "email", "chat", "walk_in", "other"],
  defaultOperationalStatus: "new",
  defaultVerificationState: "unverified",
  defaultQualificationState: "unreviewed",
  defaultOutcomeState: "open",
  attributionReconciliationEnabled: true,
  // Current GA4 549908814; legacy 530873364 — evidence context only.
  ga4PropertyIds: ["549908814", "530873364"],
  supportsSaleConfirmation: true,
  commissionOnConfirmedSale: false,
  commissionAmountCents: null,
  /** Primal Phase 1 Lead Command (Build 1) — Client Command portal lead inbox active. */
  portalModuleEnabled: true,
  /** Phase 3 — racing-school form success may signed-ingest into client-inquiries. */
  autoIngestFromWebsiteForm: true,
  /**
   * Primal sales owners for Lead Command assignment.
   * Add authorized Primal emails here to enable without rewriting Lead Command.
   * Excludes KXD/studio/QA identities by allowlist — not by deleting accounts.
   */
  assignablePortalOwnerEmails: [
    "tyler.edwards@primalmotorsports.com",
    "jb.layman@primalmotorsports.com",
  ],
};
