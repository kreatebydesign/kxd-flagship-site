/**
 * Pure policy for acquisition promote API access (testable without Payload).
 */
import type { StaffActor } from "@/lib/staff/types";
import {
  actorHasStaffCapability,
  isRestrictedStaff,
} from "@/lib/staff/permissions";

export function acquisitionPromoteAllowedForActor(
  actor: StaffActor | null,
): boolean {
  if (!actor) return false;
  if (!isRestrictedStaff(actor)) return true;
  return actorHasStaffCapability(actor, "admin.full-operations");
}
