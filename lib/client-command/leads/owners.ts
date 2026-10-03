/**
 * Client Command — assignable lead owners (Primal Phase 1, Build 1).
 * Sourced from portal-client-memberships for the tenant client. Never
 * hardcodes a founder/staff identity — owners are real, active portal members.
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { MEMBERSHIP_COLLECTION } from "@/lib/portal/membership-schema";
import type { ManagedClientLeadPolicy } from "@/lib/acquisition-operations/policy";
import { resolveLeadOwnerLabel } from "./presentation";
import type { LeadOwnerOption } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function hasManageCapability(
  role: string | undefined,
  canManageMembers: boolean | undefined,
  policy: ManagedClientLeadPolicy,
): boolean {
  if (policy.portalModuleEnabled) return true;
  return role === "client-owner" || role === "client-admin" || canManageMembers === true;
}

/**
 * List active portal members for the tenant client who may be assigned a
 * lead (manage capability, per the same policy used for write access).
 */
export async function listAssignableLeadOwners(input: {
  clientId: number;
  policy: ManagedClientLeadPolicy;
}): Promise<LeadOwnerOption[]> {
  try {
    const payload = await getPayload({ config });
    const result = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: MEMBERSHIP_COLLECTION as any,
      where: {
        and: [
          { client: { equals: input.clientId } },
          { status: { equals: "active" } },
        ],
      },
      depth: 1,
      limit: 100,
      sort: "id",
      overrideAccess: true,
    });

    const options: LeadOwnerOption[] = [];
    for (const doc of result.docs as AnyDoc[]) {
      const role: string = doc.role === "client-owner" || doc.role === "client-admin"
        ? doc.role
        : "client-member";
      const canManageMembers = doc.canManageMembers === true;
      if (!hasManageCapability(role, canManageMembers, input.policy)) continue;

      const portalUser = doc.portalUser;
      const portalUserId =
        typeof portalUser === "number"
          ? portalUser
          : typeof portalUser === "object" && portalUser !== null
            ? Number((portalUser as AnyDoc).id)
            : null;
      if (!portalUserId || !Number.isFinite(portalUserId)) continue;

      const label =
        typeof portalUser === "object" && portalUser !== null
          ? resolveLeadOwnerLabel(
              (portalUser as AnyDoc).displayName,
              (portalUser as AnyDoc).email,
            )
          : null;
      if (!label) continue;

      options.push({
        portalUserId,
        label,
        role: role as LeadOwnerOption["role"],
        canManageMembers,
      });
    }

    return options;
  } catch {
    // Membership schema unavailable or query failed — no assignable owners
    // rather than a fabricated list.
    return [];
  }
}

export function findOwnerLabel(
  owners: readonly LeadOwnerOption[],
  portalUserId: number | null,
): string | null {
  if (portalUserId == null) return null;
  return owners.find((o) => o.portalUserId === portalUserId)?.label ?? null;
}
