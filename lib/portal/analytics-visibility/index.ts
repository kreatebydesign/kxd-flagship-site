/**
 * Phase 4 Batch E — Analytics, website performance, and lead visibility.
 *
 * Per-account portal surfaces reuse reporting facts and Work & Performance
 * honesty rules. Sales pipeline and operator CRM remain unavailable.
 */

export type {
  AnalyticsSourceState,
  AnalyticsSourceStatus,
  AnalyticsVisibilityLeads,
  AnalyticsVisibilityLoadState,
  AnalyticsVisibilityModel,
  AnalyticsVisibilityReportItem,
  AnalyticsVisibilityReports,
  PortalReportAccessDecision,
} from "./types";

export {
  composeAnalyticsVisibilityModel,
  EXPECTED_ANALYTICS_METRIC_KEYS,
  type ComposeAnalyticsVisibilityInput,
} from "./compose";

export {
  decidePortalReportAccess,
  portalReportAccessDenied,
  resolveReportClientId,
} from "./report-access";
