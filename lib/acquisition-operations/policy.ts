/**
 * Client policy interface for Managed Client Lead Operations (Phase 2).
 *
 * Shared core must not hardcode Primal, OTP, Don, commission amounts, or GA4 IDs
 * inside domain services. Client-specific values live only in registered policies.
 */

import type {
  OperationalState,
  OutcomeState,
  QualificationState,
  VerificationState,
} from "./lifecycle";

export type ManagedClientLeadChannel =
  | "form"
  | "call"
  | "email"
  | "chat"
  | "walk_in"
  | "other";

export type ManagedClientLeadPolicy = {
  /** Client key / slug binding — equals clients.slug / CSI clientKey. */
  clientKey: string;
  context: "managed_client";
  /** Operator display label (policy config only). */
  displayName: string;
  /** Whether Lead Operations is active for this client. */
  enabled: boolean;
  /** Allowed intake channels for this client. */
  allowedChannels: readonly ManagedClientLeadChannel[];
  /** Default operational status on receipt. */
  defaultOperationalStatus: OperationalState;
  defaultVerificationState: VerificationState;
  defaultQualificationState: QualificationState;
  defaultOutcomeState: OutcomeState;
  /** Whether Ads/GA4 signals may be reconciled against received inquiries. */
  attributionReconciliationEnabled: boolean;
  /**
   * GA4 property IDs for operator context / reconciliation tooling.
   * Evidence only — never proof of inquiry receipt or sale.
   */
  ga4PropertyIds: readonly string[];
  /**
   * Whether inquiry outcome may record a confirmed-sale reference.
   * Does not create commission by itself.
   */
  supportsSaleConfirmation: boolean;
  /**
   * Whether a confirmed sale on the existing CSI path creates commission.
   * Commission remains on CSI sale-commission infrastructure — never from inquiry create.
   */
  commissionOnConfirmedSale: boolean;
  /** Commission amount in cents when CSI commission applies; null when N/A. */
  commissionAmountCents: number | null;
  /** Client portal module — deferred off for V1. */
  portalModuleEnabled: boolean;
  /**
   * Whether signed website form-success may auto-create client-inquiries.
   * GA4 / Ads / CSI evidence must never flip this on by themselves.
   */
  autoIngestFromWebsiteForm: boolean;
};

/** Populated by policy registration modules — empty until policies load. */
export const MANAGED_CLIENT_LEAD_POLICY_REGISTRY: Record<
  string,
  ManagedClientLeadPolicy
> = {};

export function registerManagedClientLeadPolicy(
  policy: ManagedClientLeadPolicy,
): void {
  const key = String(policy.clientKey ?? "").trim();
  if (!key) {
    throw new Error("ManagedClientLeadPolicy.clientKey is required.");
  }
  if (policy.context !== "managed_client") {
    throw new Error("ManagedClientLeadPolicy.context must be managed_client.");
  }
  MANAGED_CLIENT_LEAD_POLICY_REGISTRY[key] = policy;
}

export function getManagedClientLeadPolicy(
  clientKey: string,
): ManagedClientLeadPolicy | null {
  const key = String(clientKey ?? "").trim();
  if (!key) return null;
  return MANAGED_CLIENT_LEAD_POLICY_REGISTRY[key] ?? null;
}

export function listManagedClientLeadPolicies(): ManagedClientLeadPolicy[] {
  return Object.values(MANAGED_CLIENT_LEAD_POLICY_REGISTRY);
}

export function isChannelAllowedForPolicy(
  policy: ManagedClientLeadPolicy,
  channel: string,
): boolean {
  return policy.allowedChannels.includes(channel as ManagedClientLeadChannel);
}
