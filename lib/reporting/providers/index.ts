/**
 * Phase 29C — Reporting providers public surface.
 */

export type {
  IngestClientReportingInput,
  IngestClientReportingProviderInput,
  IngestClientReportingResult,
  ReportingPeriodCompleteness,
  ReportingProviderError,
  ReportingProviderId,
  ReportingProviderResult,
  ReportingProviderStatus,
  ReportingProviderWarning,
} from "./types";

export {
  REPORTING_PROVIDER_CAPABILITY,
  REPORTING_PROVIDER_METRIC_SET_VERSION,
  REPORTING_PROVIDER_SOURCE_ID,
} from "./types";

export { providerError, sanitizeProviderMessage, mapHttpStatusToProviderStatus } from "./errors";
export {
  ingestClientReporting,
  ingestClientReportingProvider,
} from "./ingest";
export { composeReportingFromProviderResults } from "./compose-from-providers";
export {
  loadClientReportingConnection,
  type ClientReportingConnection,
} from "./connection";
export { isCapabilityEnabled } from "./capability-gate";
export {
  connectionHasCapability,
  normalizeGa4PropertyId,
  normalizeSearchConsoleSiteUrl,
  resolveInfrastructureForClient,
  isClientEligibleForReportingIngest,
  encodeConnectionIdentity,
} from "./connection-resolve";
export {
  getGoogleReportingAuthConfig,
  getGoogleReportingAccessToken,
  clearGoogleReportingAccessTokenCache,
  parseServiceAccountJson,
  resolveGoogleReportingCredentials,
  GOOGLE_REPORTING_SCOPES,
  GOOGLE_REPORTING_ANALYTICS_SCOPE,
  GOOGLE_REPORTING_WEBMASTERS_SCOPE,
  GOOGLE_REPORTING_CREDENTIAL_PRECEDENCE,
} from "./google/auth";
export { normalizeGa4Metrics, ga4FactsToSnapshot } from "./google/ga4/normalize";
export { GA4_CORE_METRICS } from "./google/ga4/client";
export { normalizeSearchConsoleAggregate, searchConsoleFactsToSnapshot } from "./google/search-console/normalize";
export {
  clearReportingProviderCache,
  reportingProviderCacheKey,
  getReportingProviderCache,
  getReportingProviderSuccessCache,
  setReportingProviderCache,
  reportingProviderCacheSize,
  reportingProviderSuccessCacheSize,
  REPORTING_PROVIDER_CACHE_MAX_ENTRIES,
} from "./cache";
export {
  toProviderDate,
  periodIncludesToday,
  searchConsoleSettledEndDate,
  clampPeriodToSettled,
  previousPeriodWindow,
} from "./period";
