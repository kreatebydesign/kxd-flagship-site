import type { StaffActor } from "../types";
import { isFounderOrAdmin } from "../permissions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SalesLeadDoc = Record<string, any>;

export function relUserId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = Number((value as { id: unknown }).id);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

export function staffLeadOwnerUserId(lead: SalesLeadDoc): number | null {
  return (
    relUserId(lead.sourcedByStaffUser) ??
    relUserId(lead.assignedStaffUser) ??
    null
  );
}

export function staffLeadSourcedByUserId(lead: SalesLeadDoc): number | null {
  return relUserId(lead.sourcedByStaffUser);
}

export function staffLeadAssignedUserId(lead: SalesLeadDoc): number | null {
  return relUserId(lead.assignedStaffUser);
}

/**
 * Studio operators bypass staff sales scope (they use /admin/sales).
 * Restricted staff may only access leads they originated or were assigned.
 */
export function staffMayAccessSalesLead(
  actor: StaffActor,
  lead: SalesLeadDoc,
): boolean {
  if (isFounderOrAdmin(actor) || actor.role === "admin") return true;
  const sourced = staffLeadSourcedByUserId(lead);
  const assigned = staffLeadAssignedUserId(lead);
  if (sourced === actor.userId || assigned === actor.userId) return true;
  return false;
}

export function assertStaffMayAccessSalesLead(
  actor: StaffActor,
  lead: SalesLeadDoc,
): void {
  if (!staffMayAccessSalesLead(actor, lead)) {
    throw new Error("Staff permission denied: prospect not in your scope.");
  }
}
