/**
 * Client policy interface boundary for Managed Client Lead Operations (Phase 2).
 *
 * Shared core must not hardcode Primal, OTP, Don, commission amounts, or GA4 IDs.
 * Phase 1 only defines the contract shape — no client policies are registered.
 */

export type ManagedClientLeadPolicy = {
  /** Client key / slug binding — never hardcoded product names in shared callers. */
  clientKey: string;
  context: "managed_client";
  /** Whether Ads/GA4 signals may be reconciled against received inquiries. */
  attributionReconciliationEnabled: boolean;
  /** Whether human-confirmed sale creates commission obligations (OTP-style). */
  commissionOnConfirmedSale: boolean;
  /** Commission amount in cents when policy enables it; null when N/A. */
  commissionAmountCents: number | null;
};

/** Empty Phase 1 registry — Phase 2 adds bindings by clientKey. */
export const MANAGED_CLIENT_LEAD_POLICY_REGISTRY: Record<
  string,
  ManagedClientLeadPolicy
> = {};

export function getManagedClientLeadPolicy(
  clientKey: string,
): ManagedClientLeadPolicy | null {
  const key = String(clientKey ?? "").trim();
  if (!key) return null;
  return MANAGED_CLIENT_LEAD_POLICY_REGISTRY[key] ?? null;
}
