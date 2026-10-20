import { sha256Hex } from "@/lib/proposal-lifecycle/hash";
import {
  STAFF_ACKNOWLEDGMENT_CONSENT_TEXT,
  STAFF_ACKNOWLEDGMENT_CONSENT_VERSION,
} from "./constants.ts";
import type { StaffAcknowledgmentEvidence } from "./types.ts";

function normalizeName(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

export function buildStaffAcknowledgment(input: {
  legalName: string;
  email: string;
  typedAcknowledgment: string;
  electronicRecordsConsent: boolean;
  reviewedConfirmed: boolean;
  documentContentHash: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): StaffAcknowledgmentEvidence {
  const legalName = input.legalName.trim();
  const typed = input.typedAcknowledgment.trim();
  if (!legalName || !typed) {
    throw new Error("Legal name and typed acknowledgment are required.");
  }
  if (normalizeName(typed) !== normalizeName(legalName)) {
    throw new Error("Typed acknowledgment must exactly match your legal name.");
  }
  if (!input.electronicRecordsConsent) {
    throw new Error("Electronic records consent is required.");
  }
  if (!input.reviewedConfirmed) {
    throw new Error("You must confirm you reviewed the full policy document.");
  }
  const email = input.email.trim().toLowerCase();
  if (!email) {
    throw new Error("Email is required.");
  }

  const acknowledgedAt = new Date().toISOString();
  const acknowledgmentHash = sha256Hex(
    [
      "staff-employee",
      legalName,
      email,
      input.documentContentHash,
      acknowledgedAt,
      STAFF_ACKNOWLEDGMENT_CONSENT_VERSION,
    ].join("|"),
  );

  return {
    legalName,
    email,
    typedAcknowledgment: typed,
    electronicRecordsConsent: true,
    reviewedConfirmed: true,
    consentDisclosureVersion: STAFF_ACKNOWLEDGMENT_CONSENT_VERSION,
    consentText: STAFF_ACKNOWLEDGMENT_CONSENT_TEXT,
    acknowledgedAt,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    documentContentHash: input.documentContentHash,
    acknowledgmentHash,
  };
}
