/**
 * Status transitions and eligibility rules for upgrade requests.
 */

import {
  canonicalizeEntitlementModule,
  isInternalOnlyEntitlement,
  isKnownEntitlementModule,
} from "@/lib/client-plans/modules";
import { clientHasModule } from "@/lib/client-plans/resolve";
import type { ResolvedClientEntitlements } from "@/lib/client-plans/types";
import { isClientUpgradeEligibleModule } from "./catalog";
import {
  ACTIVE_UPGRADE_REQUEST_STATUSES,
  type UpgradeEligibilityReason,
  type UpgradeRequestStatus,
  UPGRADE_REQUEST_STATUSES,
} from "./types";

const TRANSITIONS: Record<UpgradeRequestStatus, readonly UpgradeRequestStatus[]> = {
  submitted: ["reviewing", "canceled", "declined", "approved"],
  reviewing: ["submitted", "canceled", "declined", "approved"],
  approved: ["reviewing"],
  declined: ["reviewing"],
  canceled: ["submitted", "reviewing"],
};

/** Client may cancel only while the request is still open. */
const CLIENT_CANCELABLE: readonly UpgradeRequestStatus[] = [
  "submitted",
  "reviewing",
] as const;

/** Statuses an operator may move to from the current status (excludes no-op). */
export function allowedNextUpgradeStatuses(
  from: UpgradeRequestStatus,
): readonly UpgradeRequestStatus[] {
  return TRANSITIONS[from];
}

export function isUpgradeRequestStatus(
  value: unknown,
): value is UpgradeRequestStatus {
  return (
    typeof value === "string" &&
    (UPGRADE_REQUEST_STATUSES as readonly string[]).includes(value)
  );
}

export function isActiveUpgradeStatus(status: UpgradeRequestStatus): boolean {
  return (ACTIVE_UPGRADE_REQUEST_STATUSES as readonly string[]).includes(status);
}

export function canTransitionUpgradeStatus(
  from: UpgradeRequestStatus,
  to: UpgradeRequestStatus,
): boolean {
  if (from === to) return false;
  return TRANSITIONS[from].includes(to);
}

export function canClientCancelUpgradeStatus(
  status: UpgradeRequestStatus,
): boolean {
  return (CLIENT_CANCELABLE as readonly string[]).includes(status);
}

export function evaluateUpgradeEligibility(input: {
  moduleKeyRaw: string;
  entitlements: ResolvedClientEntitlements;
  hasActiveDuplicate: boolean;
}): {
  reason: UpgradeEligibilityReason;
  moduleKey: string | null;
  canRequest: boolean;
  accessGranted: boolean;
} {
  const canonical = canonicalizeEntitlementModule(input.moduleKeyRaw);
  if (!canonical || !isKnownEntitlementModule(input.moduleKeyRaw)) {
    return {
      reason: "unknown_module",
      moduleKey: null,
      canRequest: false,
      accessGranted: false,
    };
  }
  if (isInternalOnlyEntitlement(canonical)) {
    return {
      reason: "internal_only",
      moduleKey: canonical,
      canRequest: false,
      accessGranted: false,
    };
  }
  if (!isClientUpgradeEligibleModule(canonical)) {
    return {
      reason: "not_upgrade_eligible",
      moduleKey: canonical,
      canRequest: false,
      accessGranted: false,
    };
  }

  const accessGranted = clientHasModule(input.entitlements, canonical);
  if (accessGranted) {
    return {
      reason: "already_entitled",
      moduleKey: canonical,
      canRequest: false,
      accessGranted: true,
    };
  }

  if (input.entitlements.isPaused) {
    return {
      reason: "plan_paused",
      moduleKey: canonical,
      canRequest: false,
      accessGranted: false,
    };
  }

  if (input.hasActiveDuplicate) {
    return {
      reason: "active_duplicate",
      moduleKey: canonical,
      canRequest: false,
      accessGranted: false,
    };
  }

  return {
    reason: "eligible",
    moduleKey: canonical,
    canRequest: true,
    accessGranted: false,
  };
}

export function upgradeStatusLabel(status: UpgradeRequestStatus): string {
  switch (status) {
    case "submitted":
      return "Submitted";
    case "reviewing":
      return "Under review";
    case "approved":
      return "Approved";
    case "declined":
      return "Declined";
    case "canceled":
      return "Canceled";
    default:
      return status;
  }
}
