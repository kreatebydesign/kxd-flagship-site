/**
 * Phase 6 Batch C1 — resolve trusted Connect session context for staff actors.
 *
 * Organization identity is never accepted solely from client input.
 * Portal identities are denied.
 */

import "server-only";

import { getPayload } from "payload";
import config from "@/payload.config";
import { evaluateConnectAccess } from "../access";
import type {
  ConnectMembershipRecord,
  ConnectMembershipRole,
  ConnectOrganizationRecord,
} from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export type ConnectStaffSession = {
  staffUserId: number;
  staffEmail: string;
  organization: ConnectOrganizationRecord;
  membership: ConnectMembershipRecord;
  role: ConnectMembershipRole;
};

function relId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    const id = Number((value as AnyDoc).id);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

/**
 * Resolve the actor's Connect context from an authenticated staff user.
 * Optional organizationKey selects among multi-org memberships; when omitted,
 * uses the sole active membership or fails closed if ambiguous/none.
 */
export async function resolveConnectStaffSession(input: {
  staffUserId: number;
  staffEmail: string | null | undefined;
  organizationKey?: string | null;
  editionFeatureActive?: boolean;
  env?: NodeJS.ProcessEnv;
}): Promise<
  | { ok: true; session: ConnectStaffSession }
  | { ok: false; reason: string }
> {
  if (
    !Number.isFinite(input.staffUserId) ||
    input.staffUserId <= 0 ||
    !input.staffEmail
  ) {
    return { ok: false, reason: "invalid_identity" };
  }

  const payload = await getPayload({ config });
  const memberships = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "connect-organization-memberships" as any,
    where: {
      and: [
        { subjectKind: { equals: "staff-user" } },
        { staffUser: { equals: input.staffUserId } },
        { status: { equals: "active" } },
      ],
    },
    limit: 50,
    depth: 1,
    overrideAccess: true,
  });

  const candidates: ConnectStaffSession[] = [];

  for (const doc of memberships.docs as AnyDoc[]) {
    const orgRaw = doc.organization;
    const orgDoc =
      typeof orgRaw === "object" && orgRaw !== null
        ? (orgRaw as AnyDoc)
        : null;
    if (!orgDoc) continue;

    const organization: ConnectOrganizationRecord = {
      id: Number(orgDoc.id),
      key: String(orgDoc.key ?? ""),
      name: String(orgDoc.name ?? ""),
      status: orgDoc.status === "active" ? "active" : "inactive",
      config:
        orgDoc.config && typeof orgDoc.config === "object"
          ? (orgDoc.config as Record<string, unknown>)
          : null,
    };

    const membership: ConnectMembershipRecord = {
      id: Number(doc.id),
      organizationId: organization.id,
      subjectKind: "staff-user",
      staffUserId: input.staffUserId,
      portalUserId: null,
      role: doc.role as ConnectMembershipRole,
      status: doc.status === "active" ? "active" : "disabled",
    };

    const access = evaluateConnectAccess({
      subjectKind: "staff-user",
      staffEmail: input.staffEmail,
      organization,
      membership,
      editionFeatureActive: input.editionFeatureActive,
      env: input.env,
    });
    if (!access.allowed) continue;

    candidates.push({
      staffUserId: input.staffUserId,
      staffEmail: input.staffEmail,
      organization,
      membership,
      role: access.role,
    });
  }

  if (candidates.length === 0) {
    return { ok: false, reason: "no_membership" };
  }

  if (input.organizationKey) {
    const key = input.organizationKey.trim().toLowerCase();
    const match = candidates.find((c) => c.organization.key === key);
    if (!match) return { ok: false, reason: "org_not_allowlisted" };
    return { ok: true, session: match };
  }

  if (candidates.length === 1) {
    return { ok: true, session: candidates[0] };
  }

  // Multi-org without explicit selection — fail closed (no switcher UI in C1).
  return { ok: false, reason: "operation_denied" };
}

export async function loadConnectMembershipById(input: {
  membershipId: number;
  organizationId: number;
}): Promise<ConnectMembershipRecord | null> {
  const payload = await getPayload({ config });
  try {
    const doc = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "connect-organization-memberships" as any,
      id: input.membershipId,
      depth: 0,
      overrideAccess: true,
    })) as AnyDoc;
    const organizationId = relId(doc.organization);
    if (organizationId !== input.organizationId) return null;
    if (doc.subjectKind !== "staff-user") return null;
    return {
      id: Number(doc.id),
      organizationId,
      subjectKind: "staff-user",
      staffUserId: relId(doc.staffUser),
      portalUserId: null,
      role: doc.role as ConnectMembershipRole,
      status: doc.status === "active" ? "active" : "disabled",
    };
  } catch {
    return null;
  }
}
