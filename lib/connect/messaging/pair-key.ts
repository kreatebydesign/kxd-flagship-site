/**
 * Phase 6 Batch C1 — deterministic direct-conversation participant-pair keys.
 *
 * Server-computed only. Client-supplied pair keys must never authorize creation.
 * A→B and B→A resolve to the same key inside one organization.
 */

export type ConnectDirectPairSubject = {
  /** Active Connect organization membership id (staff-user in C1). */
  membershipId: number;
  staffUserId: number;
};

/**
 * Build a deterministic pair key from two staff memberships in one org.
 * Uses staff user ids so membership row churn does not fork direct threads.
 */
export function buildDirectConversationPairKey(input: {
  organizationId: number;
  participantA: ConnectDirectPairSubject;
  participantB: ConnectDirectPairSubject;
}): string | null {
  if (
    !Number.isFinite(input.organizationId) ||
    input.organizationId <= 0 ||
    !Number.isFinite(input.participantA.staffUserId) ||
    input.participantA.staffUserId <= 0 ||
    !Number.isFinite(input.participantB.staffUserId) ||
    input.participantB.staffUserId <= 0
  ) {
    return null;
  }

  if (input.participantA.staffUserId === input.participantB.staffUserId) {
    return null;
  }

  const low = Math.min(
    input.participantA.staffUserId,
    input.participantB.staffUserId,
  );
  const high = Math.max(
    input.participantA.staffUserId,
    input.participantB.staffUserId,
  );

  return `direct:${input.organizationId}:${low}:${high}`;
}

/** Reject client-controlled pair keys — only server-built keys are accepted. */
export function isClientSuppliedPairKeyAllowed(): boolean {
  return false;
}

export function parseDirectConversationPairKey(
  key: string | null | undefined,
): { organizationId: number; staffUserIdA: number; staffUserIdB: number } | null {
  if (!key || typeof key !== "string") return null;
  const match = /^direct:(\d+):(\d+):(\d+)$/.exec(key.trim());
  if (!match) return null;
  const organizationId = Number(match[1]);
  const staffUserIdA = Number(match[2]);
  const staffUserIdB = Number(match[3]);
  if (
    !Number.isFinite(organizationId) ||
    !Number.isFinite(staffUserIdA) ||
    !Number.isFinite(staffUserIdB) ||
    staffUserIdA >= staffUserIdB
  ) {
    return null;
  }
  return { organizationId, staffUserIdA, staffUserIdB };
}
