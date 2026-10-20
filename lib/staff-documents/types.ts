/**
 * Staff documents — Release A (policy acknowledgment only).
 * Separate from client contracts / commercial-documents.
 */

export const STAFF_DOCUMENT_KINDS_RELEASE_A = ["policy-acknowledgment"] as const;
export type StaffDocumentKind = (typeof STAFF_DOCUMENT_KINDS_RELEASE_A)[number];

export const STAFF_DOCUMENT_TEMPLATE_STATUSES = [
  "draft",
  "legal-review",
  "approved-for-use",
  "retired",
] as const;
export type StaffDocumentTemplateStatus = (typeof STAFF_DOCUMENT_TEMPLATE_STATUSES)[number];

export const STAFF_DOCUMENT_STATUSES = [
  "assigned",
  "acknowledged",
  "revoked",
] as const;
export type StaffDocumentStatus = (typeof STAFF_DOCUMENT_STATUSES)[number];

export const STAFF_DOCUMENT_FILE_KINDS = [
  "policy-pdf",
  "acknowledgment-record",
] as const;
export type StaffDocumentFileKind = (typeof STAFF_DOCUMENT_FILE_KINDS)[number];

export const STAFF_DOCUMENT_DEFAULT_LEGAL_ENTITY = "Kreate by Design LLC";

export const STAFF_DOCUMENT_EMPLOYER_REPRESENTATIVE = "Matt Lunger";

export interface StaffDocumentAuditEvent {
  id: string;
  at: string;
  actor?: string | null;
  action: string;
  reason?: string | null;
}

export interface StaffAcknowledgmentEvidence {
  legalName: string;
  email: string;
  typedAcknowledgment: string;
  electronicRecordsConsent: boolean;
  reviewedConfirmed: boolean;
  consentDisclosureVersion: string;
  consentText: string;
  acknowledgedAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  documentContentHash: string;
  acknowledgmentHash: string;
}

export interface StaffDocumentListItem {
  id: number;
  title: string;
  kind: StaffDocumentKind;
  status: StaffDocumentStatus;
  templateVersion: number;
  templateContentHash: string;
  assignedAt: string;
  acknowledgedAt: string | null;
  href: string;
}

export interface StaffDocumentAttentionItem {
  id: number;
  title: string;
  href: string;
  assignedAt: string;
}

export interface StaffDocumentDetail {
  id: number;
  title: string;
  kind: StaffDocumentKind;
  status: StaffDocumentStatus;
  bodySnapshot: string;
  templateVersion: number;
  templateContentHash: string;
  legalEntityName: string;
  assignedAt: string;
  acknowledgedAt: string | null;
  acknowledgment: StaffAcknowledgmentEvidence | null;
  policyFileId: number | null;
  acknowledgmentFileId: number | null;
  canAcknowledge: boolean;
}
