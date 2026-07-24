import { normalizeStaffRole, staffRoleTitle } from "./permissions";
import type { StaffActor, StaffRoleId } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyUser = Record<string, any> | null | undefined;

export function staffActorFromUser(user: AnyUser): StaffActor | null {
  if (!user) return null;
  const id = typeof user.id === "number" ? user.id : Number(user.id);
  if (!Number.isFinite(id) || id <= 0) return null;

  const email =
    typeof user.email === "string" ? user.email.trim().toLowerCase() : "";
  const displayName =
    typeof user.displayName === "string" && user.displayName.trim()
      ? user.displayName.trim()
      : email || "Teammate";
  const role = typeof user.role === "string" ? user.role : "editor";
  const staffRole = normalizeStaffRole(user.staffRole) as StaffRoleId;
  const onboardingCompletedAt =
    typeof user.staffOnboardingCompletedAt === "string"
      ? user.staffOnboardingCompletedAt
      : user.staffOnboardingCompletedAt instanceof Date
        ? user.staffOnboardingCompletedAt.toISOString()
        : null;

  return {
    userId: id,
    email,
    displayName,
    role,
    staffRole,
    onboardingCompletedAt,
  };
}

export function describeStaffActor(actor: StaffActor): {
  name: string;
  roleTitle: string;
} {
  return {
    name: actor.displayName,
    roleTitle: staffRoleTitle(actor.staffRole),
  };
}
