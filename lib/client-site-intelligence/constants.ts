/**
 * Client Site Intelligence constants — csi-v1-a.
 */

import type { ClientSiteEventClass } from "./types";

export const CSI_COLLECTION_SLUG = "client-site-events" as const;

export const CSI_FRESHNESS_WINDOW_SECONDS = 5 * 60;

/** Reject oversized webhook bodies before JSON parse / HMAC work amplification. */
export const CSI_MAX_BODY_BYTES = 64 * 1024;

export const CSI_SIGNATURE_HEADER = "x-kxd-csi-signature";
export const CSI_TIMESTAMP_HEADER = "x-kxd-csi-timestamp";

/** Activity Engine event type for website leads. */
export const CSI_WEBSITE_LEAD_ACTIVITY_EVENT_TYPE =
  "client-site.website_lead.received" as const;

/**
 * Use existing timeline sourceModule enum value to avoid enum migration.
 * Capability identity is carried in sourceType / metadata.
 */
export const CSI_ACTIVITY_SOURCE_MODULE = "Client Intelligence" as const;
export const CSI_ACTIVITY_SOURCE_TYPE = "client-site-intelligence" as const;

export const OTP_CARTS_CLIENT_KEY = "otp-carts" as const;
export const OTP_CARTS_SOURCE_SYSTEM = "otp-carts-website" as const;
export const OTP_CARTS_INGEST_SECRET_ENV = "KXD_CSI_OTP_CARTS_INGEST_SECRET" as const;

/** Must never receive OTP Carts website ingest. */
export const ON_TRACK_PERFORMANCE_CLIENT_KEY = "otp" as const;

export const OTP_WEBSITE_LEAD_ID_PATTERN =
  /^OTP-WEB-\d{8}-[A-Za-z0-9]{6,16}$/;

export const DEFAULT_OTP_COMMISSION_AMOUNT_CENTS = 30000;

export const TEXT_BOUND_SHORT = 200;
export const TEXT_BOUND_MEDIUM = 500;
export const TEXT_BOUND_LONG = 2000;

export interface CsiSourceCredentialBinding {
  clientKey: string;
  sourceSystem: string;
  envVar: string;
  /** Event classes this credential may ingest in V1. */
  allowedEventClasses: readonly ClientSiteEventClass[];
  /** Forbidden clientKeys that must never bind to this credential. */
  forbiddenClientKeys: readonly string[];
}

/**
 * Per-site credential registry. Future managed sites add entries —
 * do not share one open secret across clients.
 */
export const CSI_SOURCE_CREDENTIAL_REGISTRY: Record<
  string,
  CsiSourceCredentialBinding
> = {
  [OTP_CARTS_CLIENT_KEY]: {
    clientKey: OTP_CARTS_CLIENT_KEY,
    sourceSystem: OTP_CARTS_SOURCE_SYSTEM,
    envVar: OTP_CARTS_INGEST_SECRET_ENV,
    allowedEventClasses: ["website_lead"],
    forbiddenClientKeys: [ON_TRACK_PERFORMANCE_CLIENT_KEY],
  },
};

export function buildClientSiteIdempotencyKey(input: {
  sourceSystem: string;
  externalEventId: string;
  eventClass: string;
}): string {
  return `${input.sourceSystem}:${input.externalEventId}:${input.eventClass}`;
}

export function buildWebsiteLeadActivitySourceId(input: {
  sourceSystem: string;
  externalEventId: string;
  eventClass: string;
  eventRecordId: number;
}): string {
  return `csi:${input.sourceSystem}:${input.externalEventId}:${input.eventClass}:${input.eventRecordId}`;
}
