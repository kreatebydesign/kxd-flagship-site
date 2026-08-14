/**
 * Approval-first branded monthly client reports (July 2026 release).
 * Extends MonthlyReports — does not replace the existing reporting engine.
 */

import type { ReportingCapabilityId } from "@/lib/reporting/domain";

/** Controlled approval lifecycle for branded client PDFs. */
export const BRANDED_REPORT_APPROVAL_STATUSES = [
  "draft",
  "in-review",
  "approved",
  "ready-for-manual-delivery",
  "archived",
] as const;

export type BrandedReportApprovalStatus =
  (typeof BRANDED_REPORT_APPROVAL_STATUSES)[number];

export const BRANDED_REPORT_APPROVAL_LABEL: Record<
  BrandedReportApprovalStatus,
  string
> = {
  draft: "Draft",
  "in-review": "In review",
  approved: "Approved",
  "ready-for-manual-delivery": "Ready for manual delivery",
  archived: "Archived",
};

/** Logical report capability tiers (retainer-aware). */
export const REPORT_SCOPE_CAPABILITIES = [
  "base-website",
  "seo",
  "google-ads",
  "premium-partnership",
] as const;

export type ReportScopeCapability = (typeof REPORT_SCOPE_CAPABILITIES)[number];

export const REPORT_SCOPE_LABEL: Record<ReportScopeCapability, string> = {
  "base-website": "Website management",
  seo: "SEO management",
  "google-ads": "Google Ads management",
  "premium-partnership": "Premium / partnership reporting",
};

export type MetricCompleteness =
  | "complete"
  | "partial"
  | "delayed"
  | "unavailable"
  | "not-applicable";

export type MetricProvenanceKind =
  | "verified"
  | "derived"
  | "operator-authored"
  | "system-generated"
  | "missing";

export type BrandedMetric = {
  key: string;
  label: string;
  value: number | null;
  displayValue: string;
  unit: string;
  /** ISO period start/end for the metric window. */
  periodStart: string;
  periodEnd: string;
  comparisonStart?: string | null;
  comparisonEnd?: string | null;
  previousValue?: number | null;
  delta?: number | null;
  /** Null when percentage change is undefined (e.g. prior period zero). */
  percentChange?: number | null;
  percentChangeLabel: string;
  source: string;
  lastSuccessfulSyncAt?: string | null;
  freshness: "fresh" | "stale" | "missing" | "unknown";
  completeness: MetricCompleteness;
  provenance: MetricProvenanceKind;
  note?: string | null;
};

export type DataSourcePresence = {
  providerId: "ga4" | "search-console" | "google-ads" | "activity" | "operator";
  label: string;
  connected: boolean;
  entitled: boolean;
  includedInReport: boolean;
  lastSuccessfulSyncAt: string | null;
  freshness: "fresh" | "stale" | "missing" | "unknown";
  statusNote: string;
};

export type CompletedWorkItem = {
  id: string;
  title: string;
  summary: string;
  completedAt: string | null;
  source: string;
  clientVisible: boolean;
  included: boolean;
};

export type ReportNarrativeSection = {
  key: string;
  title: string;
  body: string;
  provenance: MetricProvenanceKind;
  editable: boolean;
};

export type OutOfScopeOpportunity = {
  capability: ReportScopeCapability;
  title: string;
  summary: string;
  /** Always upgrade language — never presented as included work. */
  upgradeFraming: string;
};

export type BrandedReportPeriod = {
  start: string;
  end: string;
  label: string;
  year: number;
  month: number;
  timezone: string;
  /** True when this is the July 1–30 controlled release window. */
  isControlledJuly2026: boolean;
  excludesFinalDayNote: string | null;
};

export type BrandedReportScopeDecision = {
  includedCapabilities: ReportScopeCapability[];
  source: "experience-profile" | "operator-confirmed" | "fail-closed";
  confirmedBy: string | null;
  confirmedAt: string | null;
  notes: string | null;
};

export type BrandedReportPresentation = {
  kind: string;
  documentTitle: string;
  coverTitle: string;
  coverEyebrow?: string;
  performanceSnapshotLead?: string;
  hideDataFreshnessPanel?: boolean;
  hideOutOfScope?: boolean;
  hideWorkCompletedList?: boolean;
  hideNarrativeProvenance?: boolean;
  useAuditTheme?: boolean;
  /** Client CES accent for audit deliverable portal + PDF presentation. */
  auditBrandAccent?: string;
  hiddenNarrativeKeys?: string[];
  sectionTitles?: Partial<{
    executiveSummary: string;
    websitePerformance: string;
    organicSearch: string;
    googleAds: string;
    workCompleted: string;
    improvementsAndWins: string;
    issuesOrRisks: string;
    recommendations: string;
    augustPriorities: string;
    closing: string;
  }>;
};

export type BrandedReportSnapshot = {
  schemaVersion: 1;
  reportId: number;
  clientId: number;
  clientName: string;
  version: number;
  period: BrandedReportPeriod;
  generatedAt: string;
  presentation?: BrandedReportPresentation;
  scope: BrandedReportScopeDecision;
  dataSources: DataSourcePresence[];
  metrics: BrandedMetric[];
  workCompleted: CompletedWorkItem[];
  narratives: {
    executiveSummary: ReportNarrativeSection;
    websitePerformance: ReportNarrativeSection;
    organicSearch: ReportNarrativeSection;
    googleAds: ReportNarrativeSection;
    workCompleted: ReportNarrativeSection;
    improvementsAndWins: ReportNarrativeSection;
    issuesOrRisks: ReportNarrativeSection;
    recommendations: ReportNarrativeSection;
    augustPriorities: ReportNarrativeSection;
    closing: ReportNarrativeSection;
  };
  outOfScopeOpportunities: OutOfScopeOpportunity[];
  /** Internal only — stripped before client PDF. */
  internalNotes: string;
  fingerprint: string;
};

export type BrandedReportOverviewRow = {
  clientId: number;
  clientName: string;
  reportingEnabled: boolean;
  periodLabel: string;
  approvalStatus: BrandedReportApprovalStatus | "none";
  reportId: number | null;
  version: number | null;
  includedCapabilities: ReportScopeCapability[];
  availableSources: string[];
  missingSources: string[];
  lastSuccessfulSyncAt: string | null;
  freshness: "fresh" | "stale" | "missing" | "unknown";
  blockers: string[];
  warnings: string[];
  deliveryStatus: "not-applicable" | "not-ready" | "ready-for-manual-delivery";
  action: "generate" | "open" | "blocked";
};

export type BrandedReportArchiveEntry = {
  reportId: number;
  periodLabel: string;
  version: number;
  approvalStatus: BrandedReportApprovalStatus;
  generatedAt: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  pdfAvailable: boolean;
  fingerprint: string | null;
  superseded: boolean;
};

/** Maps experience-profile / CES capability IDs → report scope tiers. */
export function reportingCapabilityToScope(
  id: ReportingCapabilityId,
): ReportScopeCapability | null {
  switch (id) {
    case "website-analytics":
      return "base-website";
    case "seo":
      return "seo";
    case "google-ads":
      return "google-ads";
    case "executive-reporting":
      return "premium-partnership";
    default:
      return null;
  }
}
