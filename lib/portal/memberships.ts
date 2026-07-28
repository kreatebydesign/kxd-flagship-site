/**
 * Phase 4 — server-only portal membership resolution.
 * Authorization truth for multi-client portal access.
 * Never import from client components.
 */
import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import {
  MEMBERSHIP_COLLECTION,
  MembershipSchemaUnavailableError,
  isMembershipSchemaUnavailableError,
  withMembershipSchema,
} from "./membership-schema";
import {
  dedupeActiveMembershipsByClient,
  isClientInActiveMemberships,
  resolveAuthorizedActiveClient,
  type PortalMembershipRecord,
  type PortalMembershipStatus,
  type ResolvedPortalActiveClient,
} from "./membership-resolve";

export type {
  PortalMembershipRecord,
  PortalMembershipStatus,
  ResolvedPortalActiveClient,
} from "./membership-resolve";

export {
  dedupeActiveMembershipsByClient,
  isClientInActiveMemberships,
  resolveAuthorizedActiveClient,
} from "./membership-resolve";

export {
  MembershipSchemaUnavailableError,
  isMembershipSchemaUnavailableError,
  MEMBERSHIP_SCHEMA_UNAVAILABLE_MESSAGE,
} from "./membership-schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;
type PayloadClient = Awaited<ReturnType<typeof getPayload>>;

function resolveRelId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    const id = Number((value as AnyDoc).id);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

function mapMembershipDoc(doc: AnyDoc): PortalMembershipRecord | null {
  const id = Number(doc.id);
  const portalUserId = resolveRelId(doc.portalUser);
  const clientRaw = doc.client;
  const clientId = resolveRelId(clientRaw);
  if (!Number.isFinite(id) || portalUserId == null || clientId == null) return null;

  const status: PortalMembershipStatus =
    doc.status === "disabled" ? "disabled" : "active";

  const clientName =
    typeof clientRaw === "object" && clientRaw !== null && "name" in clientRaw
      ? String((clientRaw as AnyDoc).name ?? "Your Company")
      : "Your Company";
  const clientSlug =
    typeof clientRaw === "object" && clientRaw !== null && "slug" in clientRaw
      ? String((clientRaw as AnyDoc).slug ?? "") || null
      : null;

  return {
    id,
    portalUserId,
    clientId,
    clientName,
    clientSlug,
    status,
    isDefault: doc.isDefault === true,
  };
}

/**
 * List memberships for a portal user.
 * Missing membership schema → empty array (legacy fallback path).
 * Unrelated failures propagate.
 */
export async function listPortalMembershipsForUser(
  portalUserId: number,
  options?: { status?: PortalMembershipStatus | "any"; payload?: PayloadClient },
): Promise<PortalMembershipRecord[]> {
  if (!Number.isFinite(portalUserId) || portalUserId <= 0) return [];

  const payload = options?.payload ?? (await getPayload({ config }));
  const status = options?.status ?? "any";

  try {
    const result = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: MEMBERSHIP_COLLECTION as any,
      where:
        status === "any"
          ? { portalUser: { equals: portalUserId } }
          : {
              and: [
                { portalUser: { equals: portalUserId } },
                { status: { equals: status } },
              ],
            },
      sort: "id",
      limit: 100,
      depth: 1,
      overrideAccess: true,
    });

    return (result.docs as AnyDoc[])
      .map(mapMembershipDoc)
      .filter((row): row is PortalMembershipRecord => row != null);
  } catch (err) {
    if (isMembershipSchemaUnavailableError(err)) {
      // Table missing / not migrated — caller handles legacy fallback.
      return [];
    }
    throw err;
  }
}

export async function listActivePortalMembershipsForUser(
  portalUserId: number,
  payload?: PayloadClient,
): Promise<PortalMembershipRecord[]> {
  return listPortalMembershipsForUser(portalUserId, { status: "active", payload });
}

export async function ensurePortalMembership(input: {
  portalUserId: number;
  clientId: number;
  isDefault?: boolean;
  notes?: string | null;
  payload?: PayloadClient;
}): Promise<PortalMembershipRecord> {
  const payload = input.payload ?? (await getPayload({ config }));

  return withMembershipSchema(async () => {
    const existing = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: MEMBERSHIP_COLLECTION as any,
      where: {
        and: [
          { portalUser: { equals: input.portalUserId } },
          { client: { equals: input.clientId } },
        ],
      },
      limit: 1,
      depth: 1,
      overrideAccess: true,
    });

    if (existing.docs.length > 0) {
      const doc = existing.docs[0] as AnyDoc;
      const mapped = mapMembershipDoc(doc);
      if (!mapped) throw new Error("Invalid existing membership.");

      if (mapped.status !== "active" || (input.isDefault === true && !mapped.isDefault)) {
        const updated = await payload.update({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          collection: MEMBERSHIP_COLLECTION as any,
          id: mapped.id,
          data: {
            status: "active",
            ...(input.isDefault === true ? { isDefault: true } : {}),
          },
          overrideAccess: true,
        });
        const remapped = mapMembershipDoc(updated as AnyDoc);
        if (!remapped) throw new Error("Invalid updated membership.");
        return remapped;
      }

      return mapped;
    }

    const created = await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: MEMBERSHIP_COLLECTION as any,
      data: {
        portalUser: input.portalUserId,
        client: input.clientId,
        status: "active",
        isDefault: input.isDefault === true,
        ...(input.notes ? { notes: input.notes } : {}),
      },
      overrideAccess: true,
    });

    const mapped = mapMembershipDoc(created as AnyDoc);
    if (!mapped) throw new Error("Invalid created membership.");
    return mapped;
  });
}

export async function syncPortalUserLegacyClientAndPreference(input: {
  portalUserId: number;
  clientId: number;
  payload?: PayloadClient;
}): Promise<void> {
  const payload = input.payload ?? (await getPayload({ config }));
  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-users" as any,
    id: input.portalUserId,
    data: {
      client: input.clientId,
      lastActiveClientId: input.clientId,
    },
    overrideAccess: true,
  });
}

/**
 * Switch active account preference after membership authorization.
 * Does not trust browser identity — caller must supply session portalUserId.
 */
export async function switchPortalActiveClient(input: {
  portalUserId: number;
  targetClientId: number;
  payload?: PayloadClient;
}): Promise<ResolvedPortalActiveClient> {
  if (!Number.isFinite(input.targetClientId) || input.targetClientId <= 0) {
    throw new Error("PORTAL_ACCOUNT_SWITCH_DENIED");
  }

  const payload = input.payload ?? (await getPayload({ config }));

  let memberships: PortalMembershipRecord[];
  try {
    memberships = await listActivePortalMembershipsForUser(
      input.portalUserId,
      payload,
    );
  } catch (err) {
    if (isMembershipSchemaUnavailableError(err)) {
      throw new MembershipSchemaUnavailableError();
    }
    throw err;
  }

  const active = dedupeActiveMembershipsByClient(memberships);

  if (!isClientInActiveMemberships(active, input.targetClientId)) {
    // Empty list with schema missing → unavailable; otherwise generic denial.
    if (active.length === 0) {
      try {
        await withMembershipSchema(async () => {
          await payload.find({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            collection: MEMBERSHIP_COLLECTION as any,
            limit: 1,
            depth: 0,
            overrideAccess: true,
          });
        });
      } catch (err) {
        if (err instanceof MembershipSchemaUnavailableError) throw err;
        if (isMembershipSchemaUnavailableError(err)) {
          throw new MembershipSchemaUnavailableError();
        }
      }
    }
    throw new Error("PORTAL_ACCOUNT_SWITCH_DENIED");
  }

  const match = active.find((m) => m.clientId === input.targetClientId)!;
  await syncPortalUserLegacyClientAndPreference({
    portalUserId: input.portalUserId,
    clientId: match.clientId,
    payload,
  });

  return {
    clientId: match.clientId,
    clientName: match.clientName,
    clientSlug: match.clientSlug,
    membershipId: match.id,
    source: "last-active",
  };
}
