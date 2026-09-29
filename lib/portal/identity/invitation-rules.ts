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
  PORTAL_MEMBERSHIP_ROLE_RANK,
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
      /** Inactive user whose invitation memberships are already safely provisioned. */
      mode: "claim-preprovisioned-user";
      portalUserId: number;
      preservedClientIds: number[];
    }
  | {
      mode: "refuse";
      reason:
        | "inactive-user"
        | "expansion-not-allowed"
        | "no-memberships"
        | "nothing-to-add"
        | "email-mismatch"
        | "claim-membership-missing"
        | "claim-membership-inactive"
        | "claim-role-elevation";
    };

/**
 * True when the existing membership already satisfies the invitation role
 * without requiring a silent elevation.
 */
export function membershipRoleSatisfiesInvitation(input: {
  existingRole: PortalMembershipRole;
  invitedRole: PortalMembershipRole;
}): boolean {
  return (
    PORTAL_MEMBERSHIP_ROLE_RANK[input.existingRole] >=
    PORTAL_MEMBERSHIP_ROLE_RANK[input.invitedRole]
  );
}

/**
 * Evaluate whether an inactive user may claim a matching invitation.
 * Pure helper — additional legitimate memberships are allowed and preserved.
 */
export function planPreprovisionedUserClaim(input: {
  invitationMemberships: InvitationMembershipDraft[];
  existingUser: PortalUserLike;
  existingMemberships: ExistingMembershipLike[];
  invitationEmail: string;
}): Extract<AcceptPlan, { mode: "claim-preprovisioned-user" | "refuse" }> {
  const invitationEmail = normalizePortalEmail(input.invitationEmail);
  const userEmail = normalizePortalEmail(input.existingUser.email);
  if (!invitationEmail || !userEmail || invitationEmail !== userEmail) {
    return { mode: "refuse", reason: "email-mismatch" };
  }

  const required = dedupeInvitationMemberships(input.invitationMemberships);
  if (required.length === 0) {
    return { mode: "refuse", reason: "no-memberships" };
  }

  const existingByClient = new Map(
    input.existingMemberships.map((m) => [m.clientId, m]),
  );

  for (const row of required) {
    const existing = existingByClient.get(row.clientId);
    if (!existing) {
      return { mode: "refuse", reason: "claim-membership-missing" };
    }
    if (existing.status !== "active") {
      return { mode: "refuse", reason: "claim-membership-inactive" };
    }
    if (
      !membershipRoleSatisfiesInvitation({
        existingRole: existing.role,
        invitedRole: row.role,
      })
    ) {
      return { mode: "refuse", reason: "claim-role-elevation" };
    }
  }

  const preservedClientIds = input.existingMemberships
    .filter((m) => m.status === "active")
    .map((m) => m.clientId)
    .sort((a, b) => a - b);

  return {
    mode: "claim-preprovisioned-user",
    portalUserId: input.existingUser.id,
    preservedClientIds,
  };
}

/**
 * Plan acceptance given invitation + optional existing portal user.
 * Never silently elevates an existing membership role.
 *
 * Supports:
 * - create-user (no existing account)
 * - expand-memberships (active user + allowExistingUserExpansion)
 * - claim-preprovisioned-user (inactive user whose required memberships already exist)
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

  if (normalizePortalEmail(input.existingUser.email) !== email) {
    return { mode: "refuse", reason: "email-mismatch" };
  }

  if (!input.existingUser.active) {
    const claim = planPreprovisionedUserClaim({
      invitationMemberships: memberships,
      existingUser: input.existingUser,
      existingMemberships: input.existingMemberships,
      invitationEmail: email,
    });
    if (claim.mode === "claim-preprovisioned-user") {
      return claim;
    }
    // Preserve prior refuse semantics for inactive users who cannot claim.
    if (claim.reason === "claim-membership-missing" || claim.reason === "no-memberships") {
      return { mode: "refuse", reason: "inactive-user" };
    }
    return claim;
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
