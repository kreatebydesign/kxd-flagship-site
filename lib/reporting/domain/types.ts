/**
 * Phase 29B — Canonical reporting domain models.
 * Provider brands disappear above normalization.
 * No AI. No UI. Facts only.
 */

export type ReportingConfidence = "high" | "medium" | "low" | "unknown";

export type ReportingFreshness = "fresh" | "stale" | "missing";

export type TrendDirection = "up" | "down" | "flat" | "unknown";

export type BusinessDomain =
  | "website"
  | "marketing"
  | "search"
  | "experience"
  | "financial"
  | "sales"
  | "overall";

export type PeriodGrain = "day" | "week" | "month";

export type BusinessHealthState =
  | "healthy"
  | "improving"
  | "attention"
  | "critical"
  | "unknown";

export type MomentumState =
  | "accelerating"
  | "improving"
  | "stable"
  | "slowing"
  | "declining"
  | "unknown";

export type ReportingObservationSeverity = "info" | "attention" | "opportunity";

export type ReportingObservationKind =
  | "traffic_increasing"
  | "traffic_declining"
  | "seo_improving"
  | "seo_declining"
  | "leads_slowing"
  | "leads_improving"
  | "review_velocity_increasing"
  | "review_velocity_slowing"
  | "budget_efficiency_improving"
  | "budget_efficiency_declining"
  | "landing_page_declining"
  | "website_health_stable"
  | "website_health_attention"
  | "marketing_health_attention"
  | "search_health_improving"
  | "financial_health_attention"
  | "overall_health_stable"
  | "overall_momentum_accelerating"
  | "overall_momentum_declining"
  | "domain_unknown";

/** Canonical metric vocabulary — provider-agnostic. */
export type CanonicalMetricKey =
  | "visitors"
  | "sessions"
  | "pageviews"
  | "qualified_leads"
  | "form_submissions"
  | "phone_calls"
  | "conversions"
  | "conversion_rate"
  | "cost_per_lead"
  | "ad_spend"
  | "revenue"
  | "mrr"
  | "impressions"
  | "clicks"
  | "ctr"
  | "average_position"
  | "seo_visibility"
  | "website_health"
  | "campaign_health"
  | "top_landing_page_score"
  | "review_count"
  | "review_rating"
  | "review_velocity"
  | "payment_success_rate";

export interface PeriodWindow {
  start: string;
  end: string;
  grain: PeriodGrain;
  /** Human label e.g. "June 2026" — optional presentation aid, not prose. */
  label?: string;
}

export interface ReportingSource {
  /** Internal provider id for provenance only — never shown as authority. */
  providerId: string;
  clientId: number;
  fetchedAt: string;
  freshness: ReportingFreshness;
  confidence: ReportingConfidence;
}

export interface ReportingFact {
  id: string;
  clientId: number;
  period: PeriodWindow;
  domain: BusinessDomain;
  metricKey: CanonicalMetricKey;
  value: number;
  unit: string;
  previousValue?: number | null;
  delta?: number | null;
  trend?: TrendDirection;
  source: ReportingSource;
  evidenceRefs: string[];
}

export interface MetricSnapshot {
  clientId: number;
  period: PeriodWindow;
  facts: ReportingFact[];
  enabledDomains: BusinessDomain[];
  overallConfidence: ReportingConfidence;
  composedAt: string;
}

export interface DomainHealth {
  domain: BusinessDomain;
  state: BusinessHealthState;
  confidence: ReportingConfidence;
  factIds: string[];
  drivers: CanonicalMetricKey[];
}

export interface BusinessHealthReport {
  clientId: number;
  period: PeriodWindow;
  domains: DomainHealth[];
  overall: DomainHealth;
  composedAt: string;
}

export interface DomainMomentum {
  domain: BusinessDomain;
  state: MomentumState;
  confidence: ReportingConfidence;
  periodsObserved: number;
  metricKeys: CanonicalMetricKey[];
}

export interface MomentumReport {
  clientId: number;
  period: PeriodWindow;
  domains: DomainMomentum[];
  overall: DomainMomentum;
  composedAt: string;
}

export interface TrendMemoryRecord {
  id: string;
  clientId: number;
  domain: BusinessDomain;
  metricKey: CanonicalMetricKey | "health" | "momentum";
  direction: TrendDirection;
  periods: number;
  startedAt: string;
  endedAt: string;
  confidence: ReportingConfidence;
  /** Structured code, never prose. */
  patternCode: string;
}

export interface TrendMemory {
  clientId: number;
  asOf: string;
  records: TrendMemoryRecord[];
}

export interface ReportingObservation {
  id: string;
  clientId: number;
  period: PeriodWindow;
  kind: ReportingObservationKind;
  severity: ReportingObservationSeverity;
  domain: BusinessDomain;
  /** Short factual statement — deterministic template, not AI. */
  statement: string;
  factIds: string[];
  confidence: ReportingConfidence;
}

export interface BusinessTimelineEvent {
  id: string;
  clientId: number;
  period: PeriodWindow;
  domain: BusinessDomain;
  change: string;
  health: BusinessHealthState;
  momentum: MomentumState;
  confidence: ReportingConfidence;
  observationIds: string[];
}

export interface BusinessTimeline {
  clientId: number;
  events: BusinessTimelineEvent[];
  composedAt: string;
}

/** Composition-ready Partnership Reporting brief — no UI. */
export interface PartnershipReportingBrief {
  clientId: number;
  period: PeriodWindow;
  snapshot: MetricSnapshot;
  health: BusinessHealthReport;
  momentum: MomentumReport;
  observations: ReportingObservation[];
  trends: TrendMemory;
  timeline: BusinessTimeline;
  recommendationHint: string | null;
  composedAt: string;
}

/** Composition inputs for Monthly Reports — no generation rewrite. */
export interface MonthlyReportCompositionInputs {
  clientId: number;
  period: PeriodWindow;
  snapshot: MetricSnapshot;
  health: BusinessHealthReport;
  momentum: MomentumReport;
  trends: TrendMemory;
  observations: ReportingObservation[];
  timeline: BusinessTimeline;
  composedAt: string;
}

/**
 * Evidence bundle for Executive Intelligence — adapter output only.
 * EI core is not modified; this is the consumption contract.
 */
export interface ExecutiveReportingEvidence {
  clientId: number;
  period: PeriodWindow;
  snapshot: MetricSnapshot;
  health: BusinessHealthReport;
  momentum: MomentumReport;
  observations: ReportingObservation[];
  trends: TrendMemory;
  composedAt: string;
}
