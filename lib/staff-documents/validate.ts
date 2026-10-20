import type {
  StaffDocumentKind,
  StaffDocumentSigningMode,
  StaffDocumentTemplateStatus,
} from "./types.ts";
import {
  STAFF_DOCUMENT_KINDS,
  STAFF_DOCUMENT_SIGNING_MODES,
} from "./types.ts";
import { documentExpiredAtSigningTime } from "./state-machine.ts";

const DUAL_SIGNATURE_KINDS = new Set<StaffDocumentKind>([
  "employment-agreement",
  "confidentiality-nda",
  "ip-assignment",
]);

const ACKNOWLEDGMENT_KINDS = new Set<StaffDocumentKind>([
  "policy-acknowledgment",
  "staff-policy",
]);

export function parseStaffDocumentKind(value: unknown): StaffDocumentKind {
  const normalized = String(value ?? "").trim();
  if (!(STAFF_DOCUMENT_KINDS as readonly string[]).includes(normalized)) {
    throw new Error(`Unsupported staff document kind: ${normalized || "(empty)"}`);
  }
  return normalized as StaffDocumentKind;
}

export function defaultSigningModeForKind(kind: StaffDocumentKind): StaffDocumentSigningMode {
  if (DUAL_SIGNATURE_KINDS.has(kind)) return "dual-signature";
  if (ACKNOWLEDGMENT_KINDS.has(kind)) return "acknowledgment";
  return "acknowledgment";
}

export function parseStaffDocumentSigningMode(value: unknown): StaffDocumentSigningMode {
  const normalized = String(value ?? "").trim();
  if (!(STAFF_DOCUMENT_SIGNING_MODES as readonly string[]).includes(normalized)) {
    throw new Error(`Unsupported signing mode: ${normalized || "(empty)"}`);
  }
  return normalized as StaffDocumentSigningMode;
}

export function resolveSigningModeForTemplate(input: {
  kind: StaffDocumentKind;
  signingMode?: string | null;
}): StaffDocumentSigningMode {
  const mode = input.signingMode
    ? parseStaffDocumentSigningMode(input.signingMode)
    : defaultSigningModeForKind(input.kind);
  if (DUAL_SIGNATURE_KINDS.has(input.kind) && mode !== "dual-signature") {
    throw new Error(`${input.kind} requires dual-signature mode.`);
  }
  if (input.kind === "policy-acknowledgment" && mode !== "acknowledgment") {
    throw new Error("Policy acknowledgment templates must use acknowledgment mode.");
  }
  return mode;
}

/** @deprecated Release A name — use parseStaffDocumentKind */
export function assertReleaseAStaffDocumentKind(kind: string): StaffDocumentKind {
  return parseStaffDocumentKind(kind);
}

export function assertTemplateApprovedForAssignment(status: string): void {
  if (status !== "approved-for-use") {
    throw new Error("Template must be approved-for-use before assignment.");
  }
}

export function staffDocumentStatusAllowsAcknowledgment(status: string): boolean {
  return status === "assigned";
}

export function assertStaffDocumentAcknowledgeable(status: string): void {
  if (status === "revoked") {
    throw new Error("This document assignment was revoked.");
  }
  if (status === "expired") {
    throw new Error("This document assignment has expired.");
  }
  if (status === "acknowledged") {
    return;
  }
  if (!staffDocumentStatusAllowsAcknowledgment(status)) {
    throw new Error("This document is not available for acknowledgment.");
  }
}

export function assertStaffDocumentEmployeeSignable(input: {
  status: string;
  signingMode: StaffDocumentSigningMode;
  expiresAt?: string | null;
}): void {
  if (input.signingMode !== "dual-signature") {
    throw new Error("This document does not require employee signature.");
  }
  if (input.status === "revoked") {
    throw new Error("This document assignment was revoked.");
  }
  if (input.status === "declined") {
    throw new Error("This document was declined.");
  }
  if (input.status === "awaiting-operator-signature") {
    return;
  }
  if (input.status === "executed" || input.status === "executing") {
    return;
  }
  if (documentExpiredAtSigningTime(input.expiresAt)) {
    throw new Error("This document assignment has expired.");
  }
  if (input.status !== "assigned") {
    throw new Error("This document is not available for signature.");
  }
}

export function assertStaffDocumentDeclinable(input: {
  status: string;
  signingMode: StaffDocumentSigningMode;
}): void {
  if (input.signingMode !== "dual-signature") {
    throw new Error("Only dual-signature agreements may be declined.");
  }
  if (input.status !== "assigned") {
    throw new Error("This document cannot be declined in its current state.");
  }
}

export function assertStaffDocumentRevocable(input: {
  status: string;
  signingMode: StaffDocumentSigningMode;
}): void {
  const revocable = new Set(["assigned", "awaiting-operator-signature", "executing"]);
  if (input.signingMode === "acknowledgment") {
    if (input.status !== "assigned") {
      throw new Error("Only assigned policy acknowledgments may be revoked.");
    }
    return;
  }
  if (!revocable.has(input.status)) {
    throw new Error("This agreement cannot be revoked in its current state.");
  }
}

export function parseTemplateStatus(value: unknown): StaffDocumentTemplateStatus {
  const s = String(value ?? "draft");
  if (
    s === "draft" ||
    s === "legal-review" ||
    s === "approved-for-use" ||
    s === "retired"
  ) {
    return s;
  }
  return "draft";
}
