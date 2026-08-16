/**
 * Client isolation helpers for Managed Client Lead Operations.
 * Pure — safe for verifiers without DB.
 */

import type { Where } from "payload";

export function ledgerScopeWhere(clientId: number, clientKey: string): Where {
  return {
    and: [
      { client: { equals: clientId } },
      { clientKey: { equals: clientKey } },
    ],
  };
}

/** True when an inquiry belonging to A would wrongly appear in B's ledger. */
export function isCrossClientLeak(params: {
  inquiryClientId: number;
  inquiryClientKey: string;
  requestedClientId: number;
  requestedClientKey: string;
}): boolean {
  return (
    params.inquiryClientId !== params.requestedClientId ||
    params.inquiryClientKey !== params.requestedClientKey
  );
}

export function clientIdMatchesClientKey(params: {
  clientSlug: string | null | undefined;
  clientKey: string;
}): boolean {
  return String(params.clientSlug ?? "").trim() === String(params.clientKey ?? "").trim();
}

/**
 * Google / GA4 evidence must never auto-verify or auto-qualify.
 * Returns which lifecycle fields would illegally change if evidence alone were applied.
 */
export function evidenceOnlySideEffects(input: {
  googleConversionObserved: boolean;
  verificationState: string;
  qualificationState: string;
}): { wouldAutoVerify: boolean; wouldAutoQualify: boolean } {
  // Evidence is a flag only — never maps into verification/qualification.
  void input.googleConversionObserved;
  return {
    wouldAutoVerify: false,
    wouldAutoQualify: false,
  };
}

/** Independent lifecycle dimensions — must remain separate fields. */
export const LIFECYCLE_DIMENSION_FIELDS = [
  "operationalStatus",
  "verificationState",
  "qualificationState",
  "outcomeState",
  "reconciliationState",
] as const;
