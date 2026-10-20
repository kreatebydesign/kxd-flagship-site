import { sha256Hex } from "@/lib/proposal-lifecycle/hash";
import {
  STAFF_AGREEMENT_ESIGN_CONSENT_TEXT,
  STAFF_AGREEMENT_ESIGN_CONSENT_VERSION,
} from "./constants.ts";
import type { StaffSignatureActorRole, StaffSignatureEvidence } from "./types.ts";

function normalizeName(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

export function buildStaffSignatureEvidence(input: {
  legalName: string;
  title: string;
  entityName: string;
  email: string;
  typedAcknowledgment: string;
  authorityConfirmed: boolean;
  electronicRecordsConsent: boolean;
  actorRole: StaffSignatureActorRole;
  documentContentHash: string;
  priorSignatureHash?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}): StaffSignatureEvidence {
  const legalName = input.legalName.trim();
  const typed = input.typedAcknowledgment.trim();
  if (!legalName || !typed) {
    throw new Error("Legal name and typed signature are required.");
  }
  if (normalizeName(typed) !== normalizeName(legalName)) {
    throw new Error("Typed signature must exactly match your legal name.");
  }
  if (!input.authorityConfirmed) {
    throw new Error("Authority confirmation is required.");
  }
  if (!input.electronicRecordsConsent) {
    throw new Error("Electronic records and signature consent is required.");
  }
  const email = input.email.trim().toLowerCase();
  if (!email || !input.entityName.trim()) {
    throw new Error("Entity name and email are required.");
  }

  if (
    input.actorRole === "kxd-employer-representative" &&
    !input.priorSignatureHash?.trim()
  ) {
    throw new Error("Employer countersignature requires employee signature binding.");
  }

  const signedAt = new Date().toISOString();
  const preimage = [
    input.actorRole,
    legalName,
    email,
    input.documentContentHash,
    input.priorSignatureHash ?? "",
    signedAt,
    STAFF_AGREEMENT_ESIGN_CONSENT_VERSION,
  ].join("|");

  const signatureHash = sha256Hex(preimage);

  return {
    legalName,
    title: input.title.trim(),
    entityName: input.entityName.trim(),
    email,
    typedAcknowledgment: typed,
    authorityConfirmed: true,
    electronicRecordsConsent: true,
    consentDisclosureVersion: STAFF_AGREEMENT_ESIGN_CONSENT_VERSION,
    consentText: STAFF_AGREEMENT_ESIGN_CONSENT_TEXT,
    signedAt,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    actorRole: input.actorRole,
    documentContentHash: input.documentContentHash,
    priorSignatureHash: input.priorSignatureHash ?? null,
    signatureHash,
  };
}
