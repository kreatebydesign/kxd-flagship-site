/**
 * KXD Network Phase 3 — pure partner invitation rules (no database).
 */

import {
  generateInvitationToken,
  hashInvitationToken,
  invitationTokensMatch,
  normalizePortalEmail,
} from "@/lib/portal/identity/crypto";

export const PARTNER_INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const PARTNER_INVITATION_STATUSES = [
  "sent",
  "opened",
  "accepted",
  "expired",
  "revoked",
] as const;

export type PartnerInvitationStatus = (typeof PARTNER_INVITATION_STATUSES)[number];

/** Roster / owner desk presentation state. */
export const PARTNER_ROSTER_STATES = [
  "active",
  "invited",
  "expired",
  "revoked",
  "inactive",
] as const;

export type PartnerRosterState = (typeof PARTNER_ROSTER_STATES)[number];

export const PARTNER_INVITATION_PUBLIC_ERROR =
  "This invitation link is invalid or no longer available.";

export function partnerInvitationExpiresAt(fromMs = Date.now()): Date {
  return new Date(fromMs + PARTNER_INVITATION_TTL_MS);
}

export function isPartnerInvitationExpired(
  expiresAt: string | Date | null | undefined,
  nowMs = Date.now(),
): boolean {
  if (!expiresAt) return false;
  const t = new Date(expiresAt).getTime();
  return Number.isFinite(t) && t <= nowMs;
}

export function buildPartnerInvitationTokenState(rawToken?: string): {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
} {
  const token = rawToken ?? generateInvitationToken();
  return {
    rawToken: token,
    tokenHash: hashInvitationToken(token),
    expiresAt: partnerInvitationExpiresAt(),
  };
}

export function partnerInvitationTokensMatch(
  rawToken: string,
  storedHash: string | null | undefined,
): boolean {
  if (!rawToken || !storedHash) return false;
  return invitationTokensMatch(rawToken, storedHash);
}

export function nextPartnerTokenVersion(current: number): number {
  return (Number.isFinite(current) ? current : 0) + 1;
}

export function normalizePartnerInviteEmail(email: string): string {
  return normalizePortalEmail(email);
}

export function isAcceptablePartnerInvitationStatus(
  status: string,
  expiresAt: string | Date | null | undefined,
  nowMs = Date.now(),
): boolean {
  if (status !== "sent" && status !== "opened") return false;
  if (isPartnerInvitationExpired(expiresAt, nowMs)) return false;
  return true;
}

/**
 * Derive owner-facing roster state from profile + portal user + invitation.
 * Active roster requires an active partner profile AND an active portal user.
 * Invitation history alone cannot place a deactivated partner in Active.
 */
export function derivePartnerRosterState(input: {
  profileStatus: string;
  /** Required true for Active roster. Missing/false never counts as active. */
  portalUserActive?: boolean | null;
  invitationStatus?: string | null;
  invitationExpiresAt?: string | Date | null;
  nowMs?: number;
}): PartnerRosterState {
  const now = input.nowMs ?? Date.now();
  const portalUserActive = input.portalUserActive === true;

  if (input.profileStatus === "active" && portalUserActive) {
    return "active";
  }

  if (input.profileStatus === "invited") {
    if (input.invitationStatus === "revoked") return "revoked";
    if (
      input.invitationStatus === "expired" ||
      isPartnerInvitationExpired(input.invitationExpiresAt, now)
    ) {
      return "expired";
    }
    // Accepted + still "invited" profile is inconsistent; never treat as Active.
    if (input.invitationStatus === "accepted") return "inactive";
    return "invited";
  }

  if (input.invitationStatus === "revoked") return "revoked";
  return "inactive";
}

export function canResendPartnerInvitation(input: {
  profileStatus: string;
  invitationStatus: string;
  invitationExpiresAt?: string | Date | null;
  nowMs?: number;
}): boolean {
  if (input.profileStatus === "active") return false;
  if (input.invitationStatus === "accepted" || input.invitationStatus === "revoked") {
    return false;
  }
  const roster = derivePartnerRosterState({
    profileStatus: input.profileStatus,
    invitationStatus: input.invitationStatus,
    invitationExpiresAt: input.invitationExpiresAt,
    nowMs: input.nowMs,
  });
  return roster === "invited" || roster === "expired";
}

export function canRevokePartnerInvitation(input: {
  profileStatus: string;
  invitationStatus: string;
}): boolean {
  if (input.invitationStatus === "accepted" || input.invitationStatus === "revoked") {
    return false;
  }
  return input.profileStatus === "invited" || input.profileStatus === "inactive";
}

export function maskPartnerInviteEmail(email: string): string {
  const normalized = normalizePartnerInviteEmail(email);
  const [local, domain] = normalized.split("@");
  if (!local || !domain) return "•••";
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}•••@${domain}`;
}
