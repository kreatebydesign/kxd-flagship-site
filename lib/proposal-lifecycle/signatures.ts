/**
 * Typed electronic signature evidence — no decorative canvas.
 */

import {
  DEFAULT_ACCEPTANCE_DISCLOSURE,
  DEFAULT_CONTRACT_REQUIRED_DISCLOSURE,
} from "../proposal-builder/types.ts";
import { newLifecycleId, sha256Hex } from "./hash.ts";
import type { TypedSignatureEvidence } from "./types.ts";

export const ELECTRONIC_SIGNATURE_CONSENT_VERSION = "kxd-esign-consent-2026-07-30";

export const ELECTRONIC_SIGNATURE_CONSENT_TEXT =
  "I agree to use electronic records and electronic signatures for this agreement. I understand that applying my typed legal name as an electronic signature is intended to have the same legal effect as a handwritten signature on a paper document. I confirm I am authorized to sign on behalf of the named entity.";

export const ACCEPTANCE_DISCLOSURE_VERSION = "kxd-acceptance-disclosure-2026-07-30";

export { DEFAULT_ACCEPTANCE_DISCLOSURE, DEFAULT_CONTRACT_REQUIRED_DISCLOSURE };

export function buildTypedSignature(input: {
  legalName: string;
  title: string;
  entityName: string;
  email: string;
  typedAcknowledgment: string;
  authorityConfirmed: boolean;
  electronicRecordsConsent: boolean;
  actorRole: "kxd-operator" | "client";
  documentHash: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): TypedSignatureEvidence {
  const legalName = input.legalName.trim();
  const typed = input.typedAcknowledgment.trim();
  if (!legalName || !typed) {
    throw new Error("Legal name and typed acknowledgment are required.");
  }
  if (normalizeName(typed) !== normalizeName(legalName)) {
    throw new Error("Typed acknowledgment must exactly match the signer’s legal name.");
  }
  if (!input.authorityConfirmed) {
    throw new Error("Authority confirmation is required.");
  }
  if (!input.electronicRecordsConsent) {
    throw new Error("Electronic records and signature consent is required.");
  }
  if (!input.email.trim() || !input.entityName.trim()) {
    throw new Error("Entity name and email are required.");
  }

  const signedAt = new Date().toISOString();
  const signatureHash = sha256Hex(
    [
      input.actorRole,
      legalName,
      input.email.trim().toLowerCase(),
      input.documentHash,
      signedAt,
      ELECTRONIC_SIGNATURE_CONSENT_VERSION,
    ].join("|"),
  );

  return {
    legalName,
    title: input.title.trim(),
    entityName: input.entityName.trim(),
    email: input.email.trim().toLowerCase(),
    typedAcknowledgment: typed,
    authorityConfirmed: true,
    electronicRecordsConsent: true,
    consentDisclosureVersion: ELECTRONIC_SIGNATURE_CONSENT_VERSION,
    consentText: ELECTRONIC_SIGNATURE_CONSENT_TEXT,
    signedAt,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    actorRole: input.actorRole,
    documentHash: input.documentHash,
    signatureHash,
  };
}

function normalizeName(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

export function newEvidenceRecordId(): string {
  return newLifecycleId("evidence");
}
