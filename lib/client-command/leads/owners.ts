/**
 * Client Command — assignable lead owners (Primal Phase 1, Build 1).
 * Sourced from portal-client-memberships for the tenant client. Never
 * hardcodes a founder/staff identity — owners are real, active portal members
 * filtered by policy manage rules and optional email allowlist.
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { MEMBERSHIP_COLLECTION } from "@/lib/portal/membership-schema";
import type { ManagedClientLeadPolicy } from "@/lib/acquisition-operations/policy";
import { isAssignableLeadOwnerCandidate } from "./owner-eligibility";
import { resolveLeadOwnerLabel } from "./presentation";
import type { LeadOwnerOption } from "./types";

export {
  isAssignableLeadOwnerCandidate,
  isQaOrTestOwnerIdentity,
  isStudioOrAgencyEmail,
} from "./owner-eligibility";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

/**
 * List active portal members for the tenant client who may be assigned a
 * lead (manage capability + policy owner filters).
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
      const role: string =
        doc.role === "client-owner" || doc.role === "client-admin"
          ? doc.role
          : "client-member";
      const canManageMembers = doc.canManageMembers === true;

      const portalUser = doc.portalUser;
      const portalUserId =
        typeof portalUser === "number"
          ? portalUser
          : typeof portalUser === "object" && portalUser !== null
            ? Number((portalUser as AnyDoc).id)
            : null;
      if (!portalUserId || !Number.isFinite(portalUserId)) continue;

      if (typeof portalUser !== "object" || portalUser === null) continue;
      const email = String((portalUser as AnyDoc).email ?? "").trim();
      const displayName = (portalUser as AnyDoc).displayName as string | null | undefined;
      const active = (portalUser as AnyDoc).active;

      if (
        !isAssignableLeadOwnerCandidate({
          email,
          displayName,
          active,
          role,
          canManageMembers,
          policy: input.policy,
        })
      ) {
        continue;
      }

      const label = resolveLeadOwnerLabel(displayName, email);
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
