import {
  STAFF_DOCUMENT_KINDS_RELEASE_A,
  type StaffDocumentKind,
  type StaffDocumentTemplateStatus,
} from "./types.ts";

const BLOCKED_KINDS = new Set([
  "employment-agreement",
  "confidentiality-nda",
  "ip-assignment",
  "infosec-aup",
]);

export function assertReleaseAStaffDocumentKind(kind: string): StaffDocumentKind {
  const normalized = kind.trim();
  if (BLOCKED_KINDS.has(normalized)) {
    throw new Error(
      `${normalized} is not available in Release A. Use policy-acknowledgment only.`,
    );
  }
  if (!STAFF_DOCUMENT_KINDS_RELEASE_A.includes(normalized as StaffDocumentKind)) {
    throw new Error("Only policy-acknowledgment documents are supported in Release A.");
  }
  return normalized as StaffDocumentKind;
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
  if (status === "acknowledged") {
    return;
  }
  if (!staffDocumentStatusAllowsAcknowledgment(status)) {
    throw new Error("This document is not available for acknowledgment.");
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
