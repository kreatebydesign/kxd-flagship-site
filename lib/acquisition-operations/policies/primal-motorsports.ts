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
  portalModuleEnabled: false,
};
