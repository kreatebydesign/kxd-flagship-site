import type {
  StaffDocumentSigningMode,
  StaffDocumentStatus,
} from "./types.ts";
import {
  STAFF_DOCUMENT_STATUSES_ACKNOWLEDGMENT,
  STAFF_DOCUMENT_STATUSES_DUAL_SIGNATURE,
} from "./types.ts";

export const STAFF_DOCUMENT_IMMUTABLE_SNAPSHOT_FIELDS = [
  "bodySnapshot",
  "templateContentHash",
  "templateVersion",
  "kind",
  "signingMode",
  "staffUser",
  "legalEntityName",
  "title",
] as const;

export type StaffDocumentImmutableField =
  (typeof STAFF_DOCUMENT_IMMUTABLE_SNAPSHOT_FIELDS)[number];

const ACKNOWLEDGMENT_TRANSITIONS: Record<
  StaffDocumentStatus,
  readonly StaffDocumentStatus[]
> = {
  assigned: ["acknowledged", "revoked", "expired"],
  acknowledged: [],
  "awaiting-operator-signature": [],
  executing: [],
  executed: [],
  declined: [],
  revoked: [],
  expired: [],
};

const DUAL_SIGNATURE_TRANSITIONS: Record<
  StaffDocumentStatus,
  readonly StaffDocumentStatus[]
> = {
  assigned: ["awaiting-operator-signature", "declined", "revoked", "expired"],
  "awaiting-operator-signature": ["executing", "revoked", "expired"],
  executing: ["executed", "revoked"],
  executed: [],
  acknowledged: [],
  declined: [],
  revoked: [],
  expired: [],
};

export function signingModeForStatusValidation(
  signingMode: StaffDocumentSigningMode,
): Record<StaffDocumentStatus, readonly StaffDocumentStatus[]> {
  return signingMode === "acknowledgment"
    ? ACKNOWLEDGMENT_TRANSITIONS
    : DUAL_SIGNATURE_TRANSITIONS;
}

export function assertStaffDocumentStatusTransition(input: {
  signingMode: StaffDocumentSigningMode;
  from: StaffDocumentStatus;
  to: StaffDocumentStatus;
}): void {
  const allowed = signingModeForStatusValidation(input.signingMode)[input.from];
  if (!allowed.includes(input.to)) {
    throw new Error(
      `Invalid staff document transition: ${input.from} → ${input.to} (${input.signingMode}).`,
    );
  }
}

export function isTerminalStaffDocumentStatus(input: {
  signingMode: StaffDocumentSigningMode;
  status: StaffDocumentStatus;
}): boolean {
  const allowed = signingModeForStatusValidation(input.signingMode)[input.status];
  return allowed.length === 0;
}

export function statusAllowedForSigningMode(
  signingMode: StaffDocumentSigningMode,
  status: StaffDocumentStatus,
): boolean {
  if (signingMode === "acknowledgment") {
    return (STAFF_DOCUMENT_STATUSES_ACKNOWLEDGMENT as readonly string[]).includes(
      status,
    );
  }
  return (STAFF_DOCUMENT_STATUSES_DUAL_SIGNATURE as readonly string[]).includes(
    status,
  );
}

const IMMUTABLE_EVIDENCE_FIELDS = [
  "acknowledgment",
  "employeeSignature",
  "operatorSignature",
] as const;

export function assertImmutableStaffDocumentPatch(
  existing: Record<string, unknown>,
  patch: Record<string, unknown>,
): void {
  for (const field of STAFF_DOCUMENT_IMMUTABLE_SNAPSHOT_FIELDS) {
    if (!(field in patch)) continue;
    const prior = existing[field];
    const next = patch[field];
    if (prior !== undefined && next !== undefined && prior !== next) {
      throw new Error(
        `Staff document field "${field}" is immutable after assignment.`,
      );
    }
  }

  for (const field of IMMUTABLE_EVIDENCE_FIELDS) {
    if (!(field in patch)) continue;
    const prior = existing[field];
    if (prior !== undefined && prior !== null) {
      throw new Error(
        `Staff document field "${field}" is immutable after it is recorded.`,
      );
    }
  }
}

export function documentExpiredAtSigningTime(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  const ms = Date.parse(expiresAt);
  if (!Number.isFinite(ms)) return false;
  return Date.now() > ms;
}
