/**
 * Pure portal membership resolution helpers.
 * Safe to import from verifiers (no Payload / Next dependencies).
 */

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
  // deterministic lowest client ID.
  const first = active[0]!;
  return {
    clientId: first.clientId,
    clientName: first.clientName,
    clientSlug: first.clientSlug,
    membershipId: first.id,
    source: "sole-active",
  };
}

/** Deduplicate active memberships by clientId (keep lowest membership id). */
export function dedupeActiveMembershipsByClient(
  memberships: PortalMembershipRecord[],
): PortalMembershipRecord[] {
  const byClient = new Map<number, PortalMembershipRecord>();
  for (const row of memberships) {
    if (row.status !== "active") continue;
    if (!Number.isFinite(row.clientId) || row.clientId <= 0) continue;
    const existing = byClient.get(row.clientId);
    if (!existing || row.id < existing.id) {
      byClient.set(row.clientId, row);
    }
  }
  return [...byClient.values()].sort((a, b) => a.clientId - b.clientId);
}
