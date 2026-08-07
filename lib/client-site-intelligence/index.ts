/**
 * Client Site Intelligence — Shared Core ingest (csi-v1-a).
 *
 * Authorized by decision:client-site-intelligence-v1.
 * Not a CRM. Not Product Intelligence. Not Continuous Intelligence.
 */

export {
  buildClientSiteIdempotencyKey,
  buildWebsiteLeadActivitySourceId,
  CSI_ACTIVITY_SOURCE_MODULE,
  CSI_ACTIVITY_SOURCE_TYPE,
  CSI_COLLECTION_SLUG,
  CSI_FRESHNESS_WINDOW_SECONDS,
  CSI_MAX_BODY_BYTES,
  CSI_SIGNATURE_HEADER,
  CSI_SOURCE_CREDENTIAL_REGISTRY,
  CSI_TIMESTAMP_HEADER,
  CSI_WEBSITE_LEAD_ACTIVITY_EVENT_TYPE,
  DEFAULT_OTP_COMMISSION_AMOUNT_CENTS,
  ON_TRACK_PERFORMANCE_CLIENT_KEY,
  OTP_CARTS_CLIENT_KEY,
  OTP_CARTS_INGEST_SECRET_ENV,
  OTP_CARTS_SOURCE_SYSTEM,
  OTP_WEBSITE_LEAD_ID_PATTERN,
} from "./constants";

export {
  CSI_REQUIRED_ENV_DOCS,
  getCsiCredentialBinding,
  resolveCsiIngestSecret,
} from "./credentials";

export {
  buildCsiSignedContent,
  computeCsiSignatureBase64,
  parseCsiTimestampSeconds,
  verifyCsiIngestSignature,
} from "./signature";

export {
  normalizeWebsiteLeadPayload,
  readEnvelopeClientKey,
  readEnvelopeSourceSystem,
  readEventClass,
} from "./normalize-website-lead";

export {
  bindClientSiteSource,
  resolveClientByExactSlug,
  resolveClientIdBySlug,
} from "./binding";

export {
  createMemoryClientSiteEventStore,
  createPayloadClientSiteEventStore,
  isUniqueViolation,
  persistClientSiteEventIdempotent,
} from "./persist";

export { publishWebsiteLeadActivity } from "./publish-activity";

export {
  ingestClientSiteWebhook,
  readCsiSignatureHeaders,
} from "./ingest";

export type {
  ClientSiteEventClass,
  ClientSiteEventRecord,
  ClientSiteIngestHttpResult,
  ClientSiteSensitivity,
  ClientSiteVisibility,
  PersistClientSiteEventInput,
  PersistClientSiteEventResult,
  WebsiteLeadNormalizedPayload,
} from "./types";

export { CLIENT_SITE_EVENT_CLASSES } from "./types";
