/**
 * Phase 4 Batch A — server-only portal membership resolution.
 * Authorization truth for multi-client portal access.
 * Never import from client components.
 */
import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";

export type PortalMembershipStatus = "active" | "disabled";

export type PortalMembershipRecord = {
  id: number;
  portalUserId: number;
  clientId: number;
  clientName: string;
  clientSlug: string | null;
  status: PortalMembershipStatus;
  isDefault: boolean;
};

export type ResolvedPortalActiveClient = {
  clientId: number;
  clientName: string;
  clientSlug: string | null;
  membershipId: number | null;
  source:
    | "last-active"
    | "default"
    | "legacy"
    | "sole-active"
    | "legacy-fallback";
};

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
      collection: "portal-client-memberships" as any,
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
  } catch {
    // Table missing / not migrated — caller handles legacy fallback.
    return [];
  }
}

export async function listActivePortalMembershipsForUser(
  portalUserId: number,
  payload?: PayloadClient,
): Promise<PortalMembershipRecord[]> {
  return listPortalMembershipsForUser(portalUserId, { status: "active", payload });
}

export function isClientInActiveMemberships(
  memberships: PortalMembershipRecord[],
  clientId: number,
): boolean {
  if (!Number.isFinite(clientId) || clientId <= 0) return false;
  return memberships.some((m) => m.status === "active" && m.clientId === clientId);
}

/**
 * Resolve authorized active client from memberships + optional preference + legacy client.
 * Does not trust browser-supplied client IDs.
 */
export function resolveAuthorizedActiveClient(input: {
  memberships: PortalMembershipRecord[];
  lastActiveClientId: number | null;
  legacyClientId: number | null;
  legacyClientName?: string | null;
  legacyClientSlug?: string | null;
}): ResolvedPortalActiveClient | null {
  const active = input.memberships
    .filter((m) => m.status === "active")
    .slice()
    .sort((a, b) => a.clientId - b.clientId);

  if (active.length === 0) return null;

  if (
    input.lastActiveClientId != null &&
    Number.isFinite(input.lastActiveClientId) &&
    input.lastActiveClientId > 0
  ) {
    const match = active.find((m) => m.clientId === input.lastActiveClientId);
    if (match) {
      return {
        clientId: match.clientId,
        clientName: match.clientName,
        clientSlug: match.clientSlug,
        membershipId: match.id,
        source: "last-active",
      };
    }
  }

  const defaultMembership = active.find((m) => m.isDefault);
  if (defaultMembership) {
    return {
      clientId: defaultMembership.clientId,
      clientName: defaultMembership.clientName,
      clientSlug: defaultMembership.clientSlug,
      membershipId: defaultMembership.id,
      source: "default",
    };
  }

  if (
    input.legacyClientId != null &&
    Number.isFinite(input.legacyClientId) &&
    input.legacyClientId > 0
  ) {
    const legacyMatch = active.find((m) => m.clientId === input.legacyClientId);
    if (legacyMatch) {
      return {
        clientId: legacyMatch.clientId,
        clientName: legacyMatch.clientName,
        clientSlug: legacyMatch.clientSlug,
        membershipId: legacyMatch.id,
        source: "legacy",
      };
    }
  }

  if (active.length === 1) {
    const sole = active[0]!;
    return {
      clientId: sole.clientId,
      clientName: sole.clientName,
      clientSlug: sole.clientSlug,
      membershipId: sole.id,
      source: "sole-active",
    };
  }

  // Multiple active memberships without default/last-active/legacy match:
  // deterministic lowest client ID (Batch A compatibility; Batch B documents switcher).
  const first = active[0]!;
  return {
    clientId: first.clientId,
    clientName: first.clientName,
    clientSlug: first.clientSlug,
    membershipId: first.id,
    source: "sole-active",
  };
}

export async function ensurePortalMembership(input: {
  portalUserId: number;
  clientId: number;
  isDefault?: boolean;
  notes?: string | null;
  payload?: PayloadClient;
}): Promise<PortalMembershipRecord> {
  const payload = input.payload ?? (await getPayload({ config }));
  const existing = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-client-memberships" as any,
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
        collection: "portal-client-memberships" as any,
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
    collection: "portal-client-memberships" as any,
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
