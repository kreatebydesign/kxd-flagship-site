/**
 * Which restricted staff roles must be scoped to explicit client assignments.
 * Operations coordinators retain legacy portfolio visibility on allowlisted surfaces
 * until assignments are used for all roles in a future phase.
 */
import type { StaffActor, StaffRoleId } from "./types";
import { isRestrictedStaff } from "./permissions";

export function staffRoleRequiresAssignedClientScope(
  staffRole: StaffRoleId,
): boolean {
  return staffRole === "business_development_specialist";
}

export function actorUsesAssignedClientScope(actor: StaffActor): boolean {
  if (!isRestrictedStaff(actor)) return false;
  return staffRoleRequiresAssignedClientScope(actor.staffRole);
}
