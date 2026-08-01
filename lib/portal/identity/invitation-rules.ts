/**
 * Phase 4 Batch I — pure invitation lifecycle rules (no database).
 */

import {
  hashInvitationToken,
  invitationExpiresAt,
  invitationTokensMatch,
  normalizePortalEmail,
} from "./crypto";
import {
  isPortalMembershipRole,
  type PortalMembershipRole,
} from "./roles";

export const INVITATION_STATUSES = [
  "draft",
  "sent",
  "opened",
  "accepted",
  "expired",
  "revoked",
] as const;

export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export type InvitationMembershipDraft = {
  clientId: number;
  role: PortalMembershipRole;
};

export type InvitationRecordLike = {
  status: InvitationStatus;
  tokenHash: string | null;
  tokenVersion: number;
  expiresAt: string | Date | null;
  email: string;
  allowExistingUserExpansion: boolean;
  memberships: InvitationMembershipDraft[];
};

export type PortalUserLike = {
  id: number;
  email: string;
  active: boolean;
};

export type ExistingMembershipLike = {
  clientId: number;
  role: PortalMembershipRole;
  status: "active" | "disabled";
};

export function dedupeInvitationMemberships(
  rows: InvitationMembershipDraft[],
): InvitationMembershipDraft[] {
  const byClient = new Map<number, InvitationMembershipDraft>();
  for (const row of rows) {
    if (!Number.isFinite(row.clientId) || row.clientId <= 0) continue;
    if (!isPortalMembershipRole(row.role)) continue;
    byClient.set(row.clientId, { clientId: row.clientId, role: row.role });
  }
  return [...byClient.values()].sort((a, b) => a.clientId - b.clientId);
}

export function isInvitationExpired(
  expiresAt: string | Date | null | undefined,
  nowMs = Date.now(),
): boolean {
  if (!expiresAt) return false;
  const t = new Date(expiresAt).getTime();
  return Number.isFinite(t) && t <= nowMs;
}

export type InvitationValidationResult =
  | { ok: true; status: InvitationStatus }
  | {
      ok: false;
      reason:
        | "invalid"
        | "expired"
        | "revoked"
        | "accepted"
        | "draft"
        | "token-mismatch";
    };

/**
 * Validate a raw token against a stored invitation.
 * Generic failure reasons for UI; never reveal sibling account existence.
 */
export function validateInvitationToken(input: {
  invitation: InvitationRecordLike | null;
  rawToken: string;
  nowMs?: number;
}): InvitationValidationResult {
  const inv = input.invitation;
  if (!inv || !inv.tokenHash || !input.rawToken) {
    return { ok: false, reason: "invalid" };
  }
  if (inv.status === "revoked") return { ok: false, reason: "revoked" };
  if (inv.status === "accepted") return { ok: false, reason: "accepted" };
  if (inv.status === "draft") return { ok: false, reason: "draft" };
  if (inv.status === "expired" || isInvitationExpired(inv.expiresAt, input.nowMs)) {
    return { ok: false, reason: "expired" };
  }
  if (!invitationTokensMatch(input.rawToken, inv.tokenHash)) {
    return { ok: false, reason: "token-mismatch" };
  }
  if (inv.status !== "sent" && inv.status !== "opened") {
    return { ok: false, reason: "invalid" };
  }
  return { ok: true, status: inv.status };
}

export type AcceptPlan =
  | {
      mode: "create-user";
      email: string;
      memberships: InvitationMembershipDraft[];
    }
  | {
      mode: "expand-memberships";
      portalUserId: number;
      membershipsToAdd: InvitationMembershipDraft[];
      blockedElevations: InvitationMembershipDraft[];
    }
  | {
      mode: "refuse";
      reason:
        | "inactive-user"
        | "expansion-not-allowed"
        | "no-memberships"
        | "nothing-to-add";
    };

/**
 * Plan acceptance given invitation + optional existing portal user.
 * Never silently elevates an existing membership role.
 */
export function planInvitationAcceptance(input: {
  invitation: InvitationRecordLike;
  existingUser: PortalUserLike | null;
  existingMemberships: ExistingMembershipLike[];
}): AcceptPlan {
  const email = normalizePortalEmail(input.invitation.email);
  const memberships = dedupeInvitationMemberships(input.invitation.memberships);
  if (memberships.length === 0) {
    return { mode: "refuse", reason: "no-memberships" };
  }

  if (!input.existingUser) {
    return { mode: "create-user", email, memberships };
  }

  if (!input.existingUser.active) {
    return { mode: "refuse", reason: "inactive-user" };
  }

  if (!input.invitation.allowExistingUserExpansion) {
    return { mode: "refuse", reason: "expansion-not-allowed" };
  }

  const existingByClient = new Map(
    input.existingMemberships.map((m) => [m.clientId, m]),
  );
  const membershipsToAdd: InvitationMembershipDraft[] = [];
  const blockedElevations: InvitationMembershipDraft[] = [];

  for (const row of memberships) {
    const existing = existingByClient.get(row.clientId);
    if (!existing) {
      membershipsToAdd.push(row);
      continue;
    }
    if (existing.role !== row.role) {
      // Elevation / role change requires separate operator workflow — not silent accept.
      blockedElevations.push(row);
    }
  }

  if (membershipsToAdd.length === 0) {
    return { mode: "refuse", reason: "nothing-to-add" };
  }

  return {
    mode: "expand-memberships",
    portalUserId: input.existingUser.id,
    membershipsToAdd,
    blockedElevations,
  };
}

export function nextTokenVersion(current: number): number {
  return (Number.isFinite(current) ? current : 0) + 1;
}

export function buildSentInvitationTokenState(rawToken: string): {
  tokenHash: string;
  expiresAt: Date;
} {
  return {
    tokenHash: hashInvitationToken(rawToken),
    expiresAt: invitationExpiresAt(),
  };
}

/** Public-safe error copy — never confirms account existence. */
export const INVITATION_PUBLIC_ERROR =
  "This invitation link is invalid or no longer available.";
