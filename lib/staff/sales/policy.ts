/**
 * Staff Sales Development — server-side field and transition policy.
 * UI hiding is not sufficient; APIs enforce these rules.
 */

import type { NextAction } from "@/lib/sales/next-action";
import { isNextAction } from "@/lib/sales/next-action";
import type { LeadStatus } from "@/lib/sales/types";
import { LEAD_STATUSES } from "@/lib/sales/types";

/** Early pipeline only — no proposal, negotiation, won, or lost. */
export const STAFF_SALES_ALLOWED_STATUSES: ReadonlySet<LeadStatus> = new Set([
  "new",
  "discovery",
  "nurturing",
]);

export const STAFF_SALES_OPERATOR_ONLY_STATUSES: ReadonlySet<LeadStatus> = new Set([
  "proposal",
  "negotiation",
  "won",
  "lost",
]);

export const STAFF_SALES_ALLOWED_NEXT_ACTIONS: ReadonlySet<NextAction> = new Set([
  "respond-today",
  "follow-up-tomorrow",
  "waiting-on-prospect",
  "review-scope",
  "none",
]);

export const STAFF_SALES_FORBIDDEN_NEXT_ACTIONS: ReadonlySet<NextAction> = new Set([
  "send-proposal",
]);

export function isStaffAllowedLeadStatus(value: unknown): value is LeadStatus {
  return (
    typeof value === "string" &&
    STAFF_SALES_ALLOWED_STATUSES.has(value as LeadStatus)
  );
}

export function isStaffAllowedNextAction(value: unknown): value is NextAction {
  return (
    typeof value === "string" &&
    isNextAction(value) &&
    STAFF_SALES_ALLOWED_NEXT_ACTIONS.has(value)
  );
}

export function assertStaffLeadStatusTransition(
  currentStatus: string,
  nextStatus: string | undefined,
): void {
  if (nextStatus == null) return;
  if (!LEAD_STATUSES.includes(nextStatus as LeadStatus)) {
    throw new Error("Invalid pipeline status.");
  }
  if (STAFF_SALES_OPERATOR_ONLY_STATUSES.has(nextStatus as LeadStatus)) {
    throw new Error(
      "Staff permission denied: commercial stages require operator review.",
    );
  }
  if (!STAFF_SALES_ALLOWED_STATUSES.has(nextStatus as LeadStatus)) {
    throw new Error("Staff permission denied: status change not allowed.");
  }
  if (
    STAFF_SALES_OPERATOR_ONLY_STATUSES.has(currentStatus as LeadStatus) &&
    currentStatus !== nextStatus
  ) {
    throw new Error(
      "Staff permission denied: this opportunity is under operator commercial control.",
    );
  }
}

export const STAFF_SALES_CREATABLE_PATCH_KEYS = new Set([
  "companyName",
  "contactName",
  "email",
  "phone",
  "website",
  "industry",
  "opportunityUrl",
  "notes",
  "tags",
  "estimatedValue",
  "estimatedMRR",
  "probability",
  "status",
  "nextAction",
  "nextActionNote",
  "nextFollowUp",
]);

export const STAFF_SALES_IMMUTABLE_KEYS = new Set([
  "sourcedByStaffUser",
  "assignedStaffUser",
  "sourcedByJuniorCreator",
  "sourcedByPartner",
  "sourceResearchLead",
  "sourceInquiry",
  "sourceProjectInquiry",
  "sourceWebsiteAudit",
  "sourcePartnerReferral",
  "lostReason",
  "assignedTo",
]);

export function rejectForbiddenStaffLeadPatchKeys(body: Record<string, unknown>): string | null {
  for (const key of Object.keys(body)) {
    if (STAFF_SALES_IMMUTABLE_KEYS.has(key)) {
      return `Staff permission denied: field "${key}" cannot be changed.`;
    }
    if (!STAFF_SALES_CREATABLE_PATCH_KEYS.has(key) && key !== "id") {
      return `Staff permission denied: field "${key}" is not allowed.`;
    }
  }
  return null;
}
