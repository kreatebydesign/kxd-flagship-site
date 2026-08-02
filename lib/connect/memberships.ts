/**
 * Phase 6 Batch C0 — Connect membership validation primitives.
 */

import type {
  ConnectMembershipRole,
  ConnectMembershipStatus,
  ConnectSubjectKind,
} from "./types";

export type ConnectMembershipDraft = {
  organizationId: number | null;
  subjectKind: ConnectSubjectKind | null;
  staffUserId: number | null;
  portalUserId: number | null;
  role: ConnectMembershipRole | null;
  status: ConnectMembershipStatus | null;
};

export type ConnectMembershipValidationFailure =
  | "invalid_organization"
  | "invalid_identity"
  | "subject_mismatch"
  | "invalid_role"
  | "duplicate_membership";

export type ConnectMembershipValidationResult =
  | { ok: true }
  | { ok: false; reason: ConnectMembershipValidationFailure; message: string };

const ROLES = new Set<ConnectMembershipRole>([
  "platform-operator",
  "organization-admin",
  "organization-member",
]);

export function validateConnectMembershipDraft(
  draft: ConnectMembershipDraft,
): ConnectMembershipValidationResult {
  if (
    draft.organizationId == null ||
    !Number.isFinite(draft.organizationId) ||
    draft.organizationId <= 0
  ) {
    return {
      ok: false,
      reason: "invalid_organization",
      message: "Connect membership requires a valid organization.",
    };
  }

  if (!draft.subjectKind) {
    return {
      ok: false,
      reason: "invalid_identity",
      message: "Connect membership requires a subject kind.",
    };
  }

  if (draft.subjectKind === "staff-user") {
    if (
      draft.staffUserId == null ||
      !Number.isFinite(draft.staffUserId) ||
      draft.staffUserId <= 0
    ) {
      return {
        ok: false,
        reason: "invalid_identity",
        message: "Staff Connect membership requires a valid staff user.",
      };
    }
    if (draft.portalUserId != null) {
      return {
        ok: false,
        reason: "subject_mismatch",
        message: "Staff Connect membership cannot reference a portal user.",
      };
    }
  }

  if (draft.subjectKind === "portal-user") {
    if (
      draft.portalUserId == null ||
      !Number.isFinite(draft.portalUserId) ||
      draft.portalUserId <= 0
    ) {
      return {
        ok: false,
        reason: "invalid_identity",
        message: "Portal Connect membership requires a valid portal user.",
      };
    }
    if (draft.staffUserId != null) {
      return {
        ok: false,
        reason: "subject_mismatch",
        message: "Portal Connect membership cannot reference a staff user.",
      };
    }
  }

  if (!draft.role || !ROLES.has(draft.role)) {
    return {
      ok: false,
      reason: "invalid_role",
      message: "Connect membership role is invalid.",
    };
  }

  return { ok: true };
}

/** Membership identity key used for uniqueness checks. */
export function connectMembershipIdentityKey(input: {
  organizationId: number;
  subjectKind: ConnectSubjectKind;
  staffUserId: number | null;
  portalUserId: number | null;
}): string {
  const subjectId =
    input.subjectKind === "staff-user"
      ? input.staffUserId
      : input.portalUserId;
  return `${input.organizationId}:${input.subjectKind}:${subjectId ?? "none"}`;
}

export function detectDuplicateConnectMembership(input: {
  candidateKey: string;
  existingKeys: readonly string[];
  selfKey?: string | null;
}): boolean {
  return input.existingKeys.some(
    (key) => key === input.candidateKey && key !== input.selfKey,
  );
}
