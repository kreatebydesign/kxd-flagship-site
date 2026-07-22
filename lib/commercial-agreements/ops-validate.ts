/**
 * Pure validation for commercial-agreement operator saves.
 * Free of server-only so verification scripts can import it.
 */

import {
  assertCommercialBaselineMatches,
  getCommercialAgreement,
  isCommercialAgreementId,
  sanitizeApprovedAddOnIds,
} from "./definitions";
import type {
  CommercialAgreementFieldErrors,
  CommercialAgreementSaveInput,
} from "./ops-types";
import type { CommercialAgreementId } from "./types";

export function parseOptionalNumber(
  value: unknown,
): { ok: true; value: number | null } | { ok: false; message: string } {
  if (value === null || value === undefined || value === "") {
    return { ok: true, value: null };
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return { ok: false, message: "Must be a finite number." };
    }
    return { ok: true, value: value };
  }
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.trim());
    if (!Number.isFinite(n)) {
      return { ok: false, message: "Must be a valid number." };
    }
    return { ok: true, value: n };
  }
  return { ok: false, message: "Must be a number or empty." };
}

export function normalizeCurrencyAmount(
  value: number | null,
  fieldLabel: string,
): { ok: true; value: number | null } | { ok: false; message: string } {
  if (value === null) return { ok: true, value: null };
  if (value < 0) {
    return { ok: false, message: `${fieldLabel} cannot be negative.` };
  }
  // Store cents-safe dollars with at most 2 decimal places
  const rounded = Math.round(value * 100) / 100;
  if (!Number.isFinite(rounded)) {
    return { ok: false, message: `${fieldLabel} is not a valid amount.` };
  }
  return { ok: true, value: rounded };
}

export function normalizeCredits(
  value: number | null,
): { ok: true; value: number | null } | { ok: false; message: string } {
  if (value === null) return { ok: true, value: null };
  if (value < 0) {
    return { ok: false, message: "Monthly service credits cannot be negative." };
  }
  if (!Number.isInteger(value)) {
    return { ok: false, message: "Monthly service credits must be a whole number." };
  }
  return { ok: true, value };
}

export function parseCommercialSaveBody(
  body: unknown,
):
  | { ok: true; input: CommercialAgreementSaveInput }
  | { ok: false; message: string; fieldErrors: CommercialAgreementFieldErrors } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      message: "Invalid request body.",
      fieldErrors: {},
    };
  }
  const row = body as Record<string, unknown>;
  const fieldErrors: CommercialAgreementFieldErrors = {};

  const agreementRaw = row.commercialAgreementId;
  if (!isCommercialAgreementId(typeof agreementRaw === "string" ? agreementRaw : null)) {
    fieldErrors.commercialAgreementId = "Select a commercial agreement.";
  }

  const monthlyParsed = parseOptionalNumber(row.monthlyRetainerAmount);
  if (!monthlyParsed.ok) fieldErrors.monthlyRetainerAmount = monthlyParsed.message;
  const setupParsed = parseOptionalNumber(row.setupFee);
  if (!setupParsed.ok) fieldErrors.setupFee = setupParsed.message;
  const creditsParsed = parseOptionalNumber(row.monthlyServiceCredits);
  if (!creditsParsed.ok) fieldErrors.monthlyServiceCredits = creditsParsed.message;

  let addOnsRaw: string[] = [];
  if (row.commercialAddOns == null) {
    addOnsRaw = [];
  } else if (Array.isArray(row.commercialAddOns)) {
    addOnsRaw = row.commercialAddOns.filter((v): v is string => typeof v === "string");
  } else {
    fieldErrors.commercialAddOns = "Add-ons must be a list of ids.";
  }

  let notes: string | null = null;
  if (row.commercialNotes == null || row.commercialNotes === "") {
    notes = null;
  } else if (typeof row.commercialNotes === "string") {
    notes = row.commercialNotes.trim() || null;
    if (notes && notes.length > 4000) {
      fieldErrors.commercialNotes = "Notes must be 4000 characters or fewer.";
    }
  } else {
    fieldErrors.commercialNotes = "Notes must be text.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      message: "Fix the highlighted fields and try again.",
      fieldErrors,
    };
  }

  const agreementId = agreementRaw as CommercialAgreementId;
  const monthlyNorm = normalizeCurrencyAmount(
    monthlyParsed.ok ? monthlyParsed.value : null,
    "Monthly amount",
  );
  if (!monthlyNorm.ok) {
    return {
      ok: false,
      message: monthlyNorm.message,
      fieldErrors: { monthlyRetainerAmount: monthlyNorm.message },
    };
  }
  const setupNorm = normalizeCurrencyAmount(
    setupParsed.ok ? setupParsed.value : null,
    "Setup fee",
  );
  if (!setupNorm.ok) {
    return {
      ok: false,
      message: setupNorm.message,
      fieldErrors: { setupFee: setupNorm.message },
    };
  }
  const creditsNorm = normalizeCredits(creditsParsed.ok ? creditsParsed.value : null);
  if (!creditsNorm.ok) {
    return {
      ok: false,
      message: creditsNorm.message,
      fieldErrors: { monthlyServiceCredits: creditsNorm.message },
    };
  }

  const baseline = assertCommercialBaselineMatches(agreementId, {
    monthlyStarting: monthlyNorm.value,
    setupFee: setupNorm.value,
    monthlyServiceCredits: creditsNorm.value,
  });
  if (!baseline.ok) {
    return {
      ok: false,
      message: baseline.message,
      fieldErrors: {
        monthlyRetainerAmount: baseline.message,
      },
    };
  }

  const sanitizedAddOns = sanitizeApprovedAddOnIds(agreementId, addOnsRaw);

  return {
    ok: true,
    input: {
      commercialAgreementId: agreementId,
      monthlyRetainerAmount: monthlyNorm.value,
      setupFee: setupNorm.value,
      monthlyServiceCredits: creditsNorm.value,
      commercialAddOns: sanitizedAddOns,
      commercialNotes: notes,
    },
  };
}

export function applyCatalogDefaults(
  agreementId: CommercialAgreementId,
): Pick<
  CommercialAgreementSaveInput,
  "monthlyRetainerAmount" | "setupFee" | "monthlyServiceCredits"
> {
  const agreement = getCommercialAgreement(agreementId);
  return {
    monthlyRetainerAmount: agreement?.monthlyStarting ?? null,
    setupFee: agreement?.setupFee ?? null,
    monthlyServiceCredits: agreement?.monthlyServiceCredits ?? null,
  };
}

export function commercialRecordStatusLabel(
  status: "unset" | "recorded",
): string {
  return status === "recorded" ? "Recorded" : "Unset";
}

export function commercialProvisioningLabel(
  state: "not_provisioned" | "plan_assigned",
): string {
  return state === "plan_assigned" ? "Plan assigned" : "Not provisioned";
}
