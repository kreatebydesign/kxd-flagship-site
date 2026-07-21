/**
 * Phase 35B — Client Upgrade Requests.
 * Workflow requests only — never mutate entitlements or billing.
 */

export type UpgradeRequestStatus =
  | "submitted"
  | "reviewing"
  | "approved"
  | "declined"
  | "canceled";

/** Statuses that block a new request for the same module. */
export const ACTIVE_UPGRADE_REQUEST_STATUSES: readonly UpgradeRequestStatus[] = [
  "submitted",
  "reviewing",
] as const;

export const UPGRADE_REQUEST_STATUSES: readonly UpgradeRequestStatus[] = [
  "submitted",
  "reviewing",
  "approved",
  "declined",
  "canceled",
] as const;

export type UpgradeEligibilityReason =
  | "eligible"
  | "already_entitled"
  | "unknown_module"
  | "internal_only"
  | "not_upgrade_eligible"
  | "plan_paused"
  | "active_duplicate"
  /** Approved while entitlement is still ineffective — suppress new CTA/create. */
  | "approved_awaiting_access"
  | "invalid_session";

export type EntitlementSnapshot = {
  planKey: string | null;
  planStatus: string;
  isLegacy: boolean;
  isPaused: boolean;
  effectiveModules: string[];
  resolvedAt: string;
};

export type ClientUpgradeRequestRecord = {
  id: number;
  clientId: number;
  clientName: string | null;
  portalUserId: number | null;
  requesterEmail: string | null;
  requesterName: string | null;
  moduleKey: string;
  moduleLabel: string;
  status: UpgradeRequestStatus;
  clientMessage: string | null;
  /** Operator-only — never serialize to portal responses. */
  operatorNote: string | null;
  sourceSurface: string | null;
  entitlementSnapshot: EntitlementSnapshot | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Portal-safe projection — excludes operatorNote and raw diagnostics. */
export type PortalUpgradeRequestView = {
  id: number;
  moduleKey: string;
  moduleLabel: string;
  status: UpgradeRequestStatus;
  clientMessage: string | null;
  sourceSurface: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  /** True when the client now has the entitlement (Plans & Access). */
  accessGranted: boolean;
};

export type UpgradeCapabilityCard = {
  moduleKey: string;
  label: string;
  summary: string;
  valueLine: string;
  /** Active request if any — portal-safe. */
  activeRequest: PortalUpgradeRequestView | null;
  canRequest: boolean;
  reason: UpgradeEligibilityReason;
  accessGranted: boolean;
};

export type CreateUpgradeRequestInput = {
  clientId: number;
  portalUserId?: number | null;
  requesterEmail?: string | null;
  requesterName?: string | null;
  moduleKey: string;
  clientMessage?: string | null;
  sourceSurface?: string | null;
};

export type UpdateUpgradeRequestStatusInput = {
  status: UpgradeRequestStatus;
  operatorNote?: string | null;
  actor?: string | null;
};
