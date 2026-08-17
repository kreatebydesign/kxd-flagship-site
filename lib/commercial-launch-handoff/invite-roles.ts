/**
 * Pure role mapping — safe for Node verifiers (no server-only).
 */

import type { LaunchPortalRole } from "@/lib/client-launch-wizard/types";
import type { PortalMembershipRole } from "@/lib/portal/identity/roles";

export function mapLaunchRoleToMembershipRole(
  role: LaunchPortalRole,
): PortalMembershipRole {
  if (role === "owner") return "client-owner";
  if (role === "collaborator") return "client-admin";
  return "client-member";
}
