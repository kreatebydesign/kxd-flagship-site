/**
 * Managed Client Lead Operations — public surface (Phase 2).
 */

export {
  ledgerScopeWhere,
  isCrossClientLeak,
  clientIdMatchesClientKey,
  evidenceOnlySideEffects,
  LIFECYCLE_DIMENSION_FIELDS,
} from "./isolation";

export { CLIENT_INQUIRIES_COLLECTION } from "./collection";

export type {
  ClientInquiryRecord,
  ClientLeadLedgerSnapshot,
  ReceiveClientInquiryInput,
  ReconciliationState,
  LeadQuality,
  Disposition,
} from "./types";

export {
  buildManagedClientInquiryKey,
  resolveInquiryKeyFromSource,
} from "./identity";

export {
  calculateResponseTimeSeconds,
  formatResponseTime,
} from "./response-time";

export {
  resolveReconciliationState,
  reconciliationLabel,
} from "./reconciliation";

export {
  draftInquiryFromCsiWebsiteLead,
  OTP_COMMISSION_BOUNDARY,
} from "./otp-compatibility";

export type { CsiWebsiteLeadEvidence } from "./otp-compatibility";

export {
  MCI_FORM_INGEST_CREDENTIAL_REGISTRY,
  MCI_FORM_SIGNATURE_HEADER,
  MCI_FORM_TIMESTAMP_HEADER,
  PRIMAL_MOTORSPORTS_FORM_INGEST_SECRET_ENV,
  PRIMAL_WEB_SUBMISSION_ID_PATTERN,
  computeMciFormSignatureBase64,
  normalizeMciFormIngestPayload,
  verifyMciFormIngestSignature,
} from "./form-ingest";
