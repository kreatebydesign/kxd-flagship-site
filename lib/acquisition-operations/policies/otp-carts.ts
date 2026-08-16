/**
 * OTP Carts — Managed Client Lead Operations compatibility policy.
 *
 * Does not replace OTP website form → recordWebsiteLead → CSI.
 * Commission remains exclusively on CSI confirm-sale / mark-paid.
 * Inquiry create / qualify must never mint commission.
 */

import type { ManagedClientLeadPolicy } from "../policy";

export const OTP_CARTS_LEAD_POLICY: ManagedClientLeadPolicy = {
  clientKey: "otp-carts",
  context: "managed_client",
  displayName: "OTP Carts",
  enabled: true,
  allowedChannels: ["form", "call", "email", "other"],
  defaultOperationalStatus: "new",
  defaultVerificationState: "unverified",
  defaultQualificationState: "unreviewed",
  defaultOutcomeState: "open",
  attributionReconciliationEnabled: true,
  ga4PropertyIds: [],
  // Sale confirmation + $300 commission stay on CSI lifecycle — not inquiry create.
  supportsSaleConfirmation: false,
  commissionOnConfirmedSale: true,
  commissionAmountCents: 30_000,
  portalModuleEnabled: false,
  /** OTP keeps CSI sale/commission path; managed-client auto-ingest stays off. */
  autoIngestFromWebsiteForm: false,
};
