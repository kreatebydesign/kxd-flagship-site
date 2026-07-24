import { normalizeStaffRole, staffRoleTitle } from "./permissions";
import type { StaffActor, StaffRoleId } from "./types";

/** Read a property from a Payload document without unsafe structural casts. */
function readProp(doc: object, key: string): unknown {
  return Reflect.get(doc, key);
}

/**
 * Build a StaffActor from a Payload users document (or plain object).
 * Uses Reflect property access — safe against Payload JsonObject / TypeWithID.
 */
export function staffActorFromUser(
  user: object | null | undefined,
): StaffActor | null {
  if (!user) return null;

  const rawId = readProp(user, "id");
  const id = typeof rawId === "number" ? rawId : Number(rawId);
  if (!Number.isFinite(id) || id <= 0) return null;

  const rawEmail = readProp(user, "email");
  const email =
    typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

  const rawDisplayName = readProp(user, "displayName");
  const displayName =
    typeof rawDisplayName === "string" && rawDisplayName.trim()
      ? rawDisplayName.trim()
      : email || "Teammate";

  const rawRole = readProp(user, "role");
  const role = typeof rawRole === "string" ? rawRole : "editor";

  const staffRole = normalizeStaffRole(readProp(user, "staffRole")) as StaffRoleId;

  const rawOnboarding = readProp(user, "staffOnboardingCompletedAt");
  const onboardingCompletedAt =
    typeof rawOnboarding === "string"
      ? rawOnboarding
      : rawOnboarding instanceof Date
        ? rawOnboarding.toISOString()
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
