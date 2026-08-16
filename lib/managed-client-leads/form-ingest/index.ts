/**
 * Managed-client website form ingest — Phase 3 public surface (pure helpers).
 * Server orchestrator: `./ingest` (server-only) — import from route handlers only.
 */

export {
  MCI_FORM_INGEST_CREDENTIAL_REGISTRY,
  MCI_FORM_INGEST_FRESHNESS_WINDOW_SECONDS,
  MCI_FORM_INGEST_MAX_BODY_BYTES,
  MCI_FORM_SIGNATURE_HEADER,
  MCI_FORM_TIMESTAMP_HEADER,
  PRIMAL_MOTORSPORTS_CLIENT_KEY,
  PRIMAL_MOTORSPORTS_FORM_INGEST_SECRET_ENV,
  PRIMAL_MOTORSPORTS_SOURCE_SYSTEM,
  PRIMAL_WEB_SUBMISSION_ID_PATTERN,
} from "./constants";
export {
  resolveMciFormIngestCredential,
  resolveMciFormIngestSecret,
} from "./credentials";
export {
  normalizeMciFormIngestPayload,
  type NormalizedMciFormIngest,
  type NormalizeMciFormIngestResult,
} from "./normalize";
export {
  buildMciFormSignedContent,
  computeMciFormSignatureBase64,
  readMciFormSignatureHeaders,
  verifyMciFormIngestSignature,
} from "./signature";
