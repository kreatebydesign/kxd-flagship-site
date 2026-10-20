/**
 * Staff documents — Release A (policy acknowledgment) + Release B foundation (agreements).
 * Separate from client contracts / commercial-documents.
 */

export const STAFF_DOCUMENT_KINDS_RELEASE_A = ["policy-acknowledgment"] as const;

export const STAFF_DOCUMENT_KINDS_RELEASE_B = [
  "employment-agreement",
  "confidentiality-nda",
  "ip-assignment",
  "staff-policy",
] as const;

export const STAFF_DOCUMENT_KINDS = [
  ...STAFF_DOCUMENT_KINDS_RELEASE_A,
  ...STAFF_DOCUMENT_KINDS_RELEASE_B,
] as const;

export type StaffDocumentKind = (typeof STAFF_DOCUMENT_KINDS)[number];

export const STAFF_DOCUMENT_SIGNING_MODES = [
  "acknowledgment",
  "dual-signature",
] as const;
export type StaffDocumentSigningMode = (typeof STAFF_DOCUMENT_SIGNING_MODES)[number];

export const STAFF_DOCUMENT_TEMPLATE_STATUSES = [
  "draft",
  "legal-review",
  "approved-for-use",
  "retired",
] as const;
export type StaffDocumentTemplateStatus = (typeof STAFF_DOCUMENT_TEMPLATE_STATUSES)[number];

/** Policy acknowledgment terminal status remains `acknowledged`. */
export const STAFF_DOCUMENT_STATUSES_ACKNOWLEDGMENT = [
  "assigned",
  "acknowledged",
  "revoked",
] as const;

export const STAFF_DOCUMENT_STATUSES_DUAL_SIGNATURE = [
  "assigned",
  "awaiting-operator-signature",
  "executing",
  "executed",
  "declined",
  "revoked",
  "expired",
] as const;

export const STAFF_DOCUMENT_STATUSES = [
  "assigned",
  "acknowledged",
  "awaiting-operator-signature",
  "executing",
  "executed",
  "declined",
  "revoked",
  "expired",
] as const;

export type StaffDocumentStatus = (typeof STAFF_DOCUMENT_STATUSES)[number];

export const STAFF_DOCUMENT_FILE_KINDS = [
  "policy-pdf",
  "acknowledgment-record",
  "executed-agreement",
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

export type StaffSignatureActorRole = "staff-employee" | "kxd-employer-representative";

export interface StaffSignatureEvidence {
  legalName: string;
  email: string;
  title: string;
  entityName: string;
  typedAcknowledgment: string;
  authorityConfirmed: boolean;
  electronicRecordsConsent: boolean;
  consentDisclosureVersion: string;
  consentText: string;
  signedAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  actorRole: StaffSignatureActorRole;
  documentContentHash: string;
  /** Present on employer countersignature — binds to employee execution. */
  priorSignatureHash?: string | null;
  signatureHash: string;
}

export interface StaffDocumentListItem {
  id: number;
  title: string;
  kind: StaffDocumentKind;
  status: StaffDocumentStatus;
  signingMode: StaffDocumentSigningMode;
  templateVersion: number;
  templateContentHash: string;
  assignedAt: string;
  acknowledgedAt: string | null;
  executedAt: string | null;
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
  signingMode: StaffDocumentSigningMode;
  status: StaffDocumentStatus;
  bodySnapshot: string;
  templateVersion: number;
  templateContentHash: string;
  legalEntityName: string;
  assignedAt: string;
  acknowledgedAt: string | null;
  executedAt: string | null;
  expiresAt: string | null;
  acknowledgment: StaffAcknowledgmentEvidence | null;
  employeeSignature: StaffSignatureEvidence | null;
  operatorSignature: StaffSignatureEvidence | null;
  policyFileId: number | null;
  acknowledgmentFileId: number | null;
  executedAgreementFileId: number | null;
  canAcknowledge: boolean;
}
