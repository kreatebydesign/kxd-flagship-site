/**
 * Phase 4 Batch I — membership-scoped roles.
 * KXD operator authority is never inferred from these roles.
 * Early access: clients cannot manage invitations or access.
 */

export const PORTAL_MEMBERSHIP_ROLES = [
  "client-owner",
  "client-admin",
  "client-member",
] as const;

export type PortalMembershipRole = (typeof PORTAL_MEMBERSHIP_ROLES)[number];

/** Safe default for legacy memberships — never elevates authority. */
export const LEGACY_MEMBERSHIP_ROLE_DEFAULT: PortalMembershipRole = "client-member";

export const PORTAL_MEMBERSHIP_ROLE_LABELS: Record<PortalMembershipRole, string> = {
  "client-owner": "Client Owner",
  "client-admin": "Client Admin",
  "client-member": "Client Member",
};

/** Early-access policy: delegated client access management is disabled. */
export const EARLY_ACCESS_CLIENT_CANNOT_MANAGE_ACCESS = true;

/** Role rank for future delegated ceilings (higher = more authority). */
export const PORTAL_MEMBERSHIP_ROLE_RANK: Record<PortalMembershipRole, number> = {
  "client-member": 1,
  "client-admin": 2,
  "client-owner": 3,
};

export function isPortalMembershipRole(value: unknown): value is PortalMembershipRole {
  return (
    typeof value === "string" &&
    (PORTAL_MEMBERSHIP_ROLES as readonly string[]).includes(value)
  );
}

export function normalizePortalMembershipRole(
  value: unknown,
): PortalMembershipRole {
  return isPortalMembershipRole(value) ? value : LEGACY_MEMBERSHIP_ROLE_DEFAULT;
}

/**
 * Future delegated Access Manager may only assign roles at or below their ceiling.
 * Early access: always returns false (clients cannot manage access).
 */
export function canAssignMembershipRole(input: {
  actorIsKxdOperator: boolean;
  actorMembershipRole: PortalMembershipRole | null;
  actorCanManageMembers: boolean;
  targetRole: PortalMembershipRole;
}): boolean {
  if (input.actorIsKxdOperator) return true;
  if (EARLY_ACCESS_CLIENT_CANNOT_MANAGE_ACCESS) return false;
  if (!input.actorCanManageMembers || !input.actorMembershipRole) return false;
  return (
    PORTAL_MEMBERSHIP_ROLE_RANK[input.targetRole] <=
    PORTAL_MEMBERSHIP_ROLE_RANK[input.actorMembershipRole]
  );
}

/** Email domains never grant Client access or roles. */
export function emailDomainCannotGrantAccess(): true {
  return true;
}
