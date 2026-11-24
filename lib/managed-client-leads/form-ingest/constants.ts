/**
 * Managed-client website form ingest (Phase 3).
 * Receipt truth — not CSI, not GA4, not Ads.
 */

export const MCI_FORM_INGEST_FRESHNESS_WINDOW_SECONDS = 5 * 60;
export const MCI_FORM_INGEST_MAX_BODY_BYTES = 64 * 1024;

export const MCI_FORM_SIGNATURE_HEADER = "x-kxd-mci-signature";
export const MCI_FORM_TIMESTAMP_HEADER = "x-kxd-mci-timestamp";

export const PRIMAL_MOTORSPORTS_CLIENT_KEY = "primal-motorsports" as const;
export const PRIMAL_MOTORSPORTS_SOURCE_SYSTEM =
  "primal-motorsports-website" as const;
export const PRIMAL_MOTORSPORTS_FORM_INGEST_SECRET_ENV =
  "KXD_MCI_PRIMAL_MOTORSPORTS_INGEST_SECRET" as const;

/** Stable Primal racing-school submission IDs. */
export const PRIMAL_WEB_SUBMISSION_ID_PATTERN =
  /^PRIMAL-WEB-\d{8}-[A-Za-z0-9]{6,24}$/;

/** Primal native event registration ids (Stripe checkout on primalmotorsports.com). */
export const PRIMAL_REGISTRATION_ID_PATTERN =
  /^evtreg_[a-z0-9]+_[a-z0-9]+$/i;

export function isAllowedPrimalSourceExternalId(id: string): boolean {
  const trimmed = String(id ?? "").trim();
  if (!trimmed) return false;
  return (
    PRIMAL_WEB_SUBMISSION_ID_PATTERN.test(trimmed) ||
    PRIMAL_REGISTRATION_ID_PATTERN.test(trimmed)
  );
}

export type ManagedClientFormIngestCredential = {
  clientKey: string;
  sourceSystem: string;
  envVar: string;
  /** When set, sourceExternalId must match before receipt (single-pattern clients). */
  sourceExternalIdPattern?: RegExp;
  /** Primal: web submissions and evtreg registration ids. */
  validateSourceExternalId?: (id: string) => boolean;
};

/**
 * Per-client form-ingest credentials.
 * OTP is intentionally absent — auto-ingest stays policy-blocked.
 */
export const MCI_FORM_INGEST_CREDENTIAL_REGISTRY: Record<
  string,
  ManagedClientFormIngestCredential
> = {
  [PRIMAL_MOTORSPORTS_CLIENT_KEY]: {
    clientKey: PRIMAL_MOTORSPORTS_CLIENT_KEY,
    sourceSystem: PRIMAL_MOTORSPORTS_SOURCE_SYSTEM,
    envVar: PRIMAL_MOTORSPORTS_FORM_INGEST_SECRET_ENV,
    validateSourceExternalId: isAllowedPrimalSourceExternalId,
  },
};
