/**
 * Courtesy branded restatement — presentation only.
 * Does not mutate acceptance, e-sign, payment, service status, or contractual terms.
 */

import type { DirectAgreementPaymentReferences } from "./types.ts";

export type CourtesyRestatementEligibilityInput = {
  agreementSource?: string | null;
  commercialStatus?: string | null;
  hasExternalAcceptance?: boolean;
  hasExecutedCertificate?: boolean;
};

export type CourtesyPaymentPresentation = {
  collected: boolean;
  collectedAmountCents: number;
  balanceDueCents: number;
  paidAt: string | null;
};

export function canGenerateCourtesyBrandedRestatement(
  input: CourtesyRestatementEligibilityInput,
): boolean {
  if (input.agreementSource !== "direct-agreement") return false;
  if (!input.hasExternalAcceptance && !input.hasExecutedCertificate) return false;
  return input.commercialStatus === "paid" || input.commercialStatus === "active";
}

/** Payment status for restatement PDFs — derived from commercial state, never from rewriting paymentTerms. */
export function deriveCourtesyRestatementPaymentPresentation(input: {
  commercialStatus?: string | null;
  paymentReferences?: DirectAgreementPaymentReferences | null;
  oneTimeAmountCents: number;
}): CourtesyPaymentPresentation {
  const refs = input.paymentReferences;
  const status = String(input.commercialStatus ?? "");
  const refStatus = String(refs?.paymentStatus ?? "").toLowerCase();
  const collected =
    status === "paid" ||
    status === "active" ||
    refStatus === "paid" ||
    refStatus === "succeeded";
  const obligation = Math.max(0, Math.trunc(input.oneTimeAmountCents || 0));
  const recorded = Math.max(0, Math.trunc(Number(refs?.amountCents ?? 0) || 0));
  const collectedAmountCents = collected ? recorded || obligation : 0;
  return {
    collected,
    collectedAmountCents,
    balanceDueCents: collected ? 0 : obligation,
    paidAt: collected ? String(refs?.paidAt ?? "").trim() || null : null,
  };
}

export function formatExternalAcceptanceMethodLabel(method: string | null | undefined): string {
  const value = String(method ?? "").trim().toLowerCase();
  if (value === "email") return "email";
  if (value === "in-person") return "in person";
  if (value === "existing-signed-document") return "existing signed document";
  if (value === "phone") return "phone";
  if (value === "other") return "other";
  return value.replace(/-/g, " ") || "external acceptance";
}
