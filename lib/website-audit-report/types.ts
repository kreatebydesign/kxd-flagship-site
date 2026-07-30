/**
 * Website Audit Report Generator — curated report types.
 * Raw auditor evidence remains on website-audits score/insight fields.
 */

export const REPORT_STATUSES = [
  "none",
  "draft",
  "ready-for-review",
  "approved",
  "archived",
] as const;

export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  none: "Not generated",
  draft: "Draft",
  "ready-for-review": "Ready for review",
  approved: "Approved",
  archived: "Archived",
};

export const AUDIT_FINDING_CATEGORIES = [
  "performance",
  "seo",
  "mobile",
  "conversion",
  "brand",
  "general",
] as const;

export type AuditFindingCategory = (typeof AUDIT_FINDING_CATEGORIES)[number];

export const CATEGORY_LABEL: Record<AuditFindingCategory, string> = {
  performance: "Performance",
  seo: "SEO & search visibility",
  mobile: "Mobile experience",
  conversion: "Conversion experience",
  brand: "Brand & credibility",
  general: "General",
};

export const FINDING_SEVERITIES = ["strength", "info", "attention", "priority"] as const;
export type FindingSeverity = (typeof FINDING_SEVERITIES)[number];

export const ACTION_PLAN_GROUPS = [
  "fix-first",
  "improve-next",
  "growth",
  "monitor",
] as const;

export type ActionPlanGroup = (typeof ACTION_PLAN_GROUPS)[number];

export const ACTION_PLAN_GROUP_LABEL: Record<ActionPlanGroup, string> = {
  "fix-first": "Fix first",
  "improve-next": "Improve next",
  growth: "Growth opportunities",
  monitor: "Continue monitoring",
};

export type FindingProvenance = "automated" | "manual";

/** Operator override for a derived automated finding. */
export type FindingOverride = {
  id: string;
  hidden?: boolean;
  title?: string;
  explanation?: string;
  whyItMatters?: string;
  recommendedAction?: string;
  severity?: FindingSeverity;
  category?: AuditFindingCategory;
};

export type ManualFinding = {
  id: string;
  title: string;
  category: AuditFindingCategory;
  severity: FindingSeverity;
  observed: string;
  whyItMatters: string;
  recommendation: string;
  hidden?: boolean;
  createdAt: string;
};

export type ActionPlanItem = {
  id: string;
  sourceId: string;
  sourceKind: "recommendation" | "opportunity" | "manual";
  group: ActionPlanGroup;
  text: string;
  hidden?: boolean;
  order: number;
};

export type SectionKey =
  | "executiveSummary"
  | "overallScore"
  | "findings"
  | "priorityActionPlan"
  | "professionalAssessment"
  | "appendix";

export type SectionVisibility = Partial<Record<SectionKey, boolean>>;

export type DerivedFinding = {
  id: string;
  provenance: FindingProvenance;
  category: AuditFindingCategory;
  severity: FindingSeverity;
  title: string;
  detected: string;
  whyItMatters: string;
  evidence?: string;
  recommendedAction?: string;
  sourceKind: "strength" | "opportunity" | "manual";
  sourceIndex?: number;
};

export type CanonicalFinding = DerivedFinding & {
  included: boolean;
};

export type CanonicalActionItem = ActionPlanItem & {
  included: boolean;
};

export type CanonicalScores = {
  overallScore: number | null;
  grade: string | null;
  performanceScore: number | null;
  seoScore: number | null;
  mobileScore: number | null;
  conversionScore: number | null;
  brandScore: number | null;
  measuredAt: string | null;
};

export type CanonicalAuditReport = {
  auditId: number;
  reportTitle: string;
  companyName: string;
  contactName: string | null;
  contactEmail: string | null;
  preparedFor: string | null;
  auditedUrl: string;
  canonicalClientUrl: string | null;
  auditDate: string;
  reportGeneratedAt: string | null;
  reportApprovedAt: string | null;
  reportStatus: ReportStatus;
  executiveSummary: string;
  workingWell: string;
  losingOpportunity: string;
  recommendedNextSteps: string;
  closingNote: string;
  scores: CanonicalScores;
  findings: CanonicalFinding[];
  actionPlan: CanonicalActionItem[];
  sectionVisibility: Required<SectionVisibility>;
  methodologyNotes: string[];
  limitations: string[];
  checksPerformed: string[];
  partialDataNotes: string[];
  clientId: number | null;
  /** Internal only — never render in preview/PDF */
  internalNotes: string | null;
};

export type GeneratedNarrative = {
  reportTitle: string;
  executiveSummary: string;
  workingWell: string;
  losingOpportunity: string;
  recommendedNextSteps: string;
  closingNote: string;
};

export type ReportCuratedState = {
  reportStatus: ReportStatus;
  reportTitle: string | null;
  executiveSummary: string | null;
  workingWell: string | null;
  losingOpportunity: string | null;
  recommendedNextSteps: string | null;
  closingNote: string | null;
  sectionVisibility: SectionVisibility | null;
  findingOverrides: FindingOverride[] | null;
  manualFindings: ManualFinding[] | null;
  recommendationPlan: ActionPlanItem[] | null;
  internalNotes: string | null;
  reportGeneratedAt: string | null;
  reportUpdatedAt: string | null;
  reportApprovedAt: string | null;
  reportApprovedBy: string | null;
  reportDownloadedAt: string | null;
  reportDownloadedBy: string | null;
  approvedSnapshot: CanonicalAuditReport | null;
  clientId: number | null;
  canonicalWebsiteUrl: string | null;
};

/** Minimal raw audit fields required to build a report. */
export type AuditReportSource = {
  id: number;
  name?: string | null;
  email?: string | null;
  company?: string | null;
  website: string;
  overallScore?: number | null;
  grade?: string | null;
  performanceScore?: number | null;
  seoScore?: number | null;
  mobileScore?: number | null;
  conversionScore?: number | null;
  brandScore?: number | null;
  strengths?: string | null;
  opportunities?: string | null;
  recommendations?: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
  client?: number | { id: number; companyWebsite?: string | null; name?: string | null } | null;
  /** Resolved client id for operator UI / APIs */
  clientId?: number | null;
  canonicalWebsiteUrl?: string | null;
  internalNotes?: string | null;
  reportStatus?: ReportStatus | null;
  reportTitle?: string | null;
  executiveSummary?: string | null;
  workingWell?: string | null;
  losingOpportunity?: string | null;
  recommendedNextSteps?: string | null;
  closingNote?: string | null;
  sectionVisibility?: SectionVisibility | null;
  findingOverrides?: FindingOverride[] | null;
  manualFindings?: ManualFinding[] | null;
  recommendationPlan?: ActionPlanItem[] | null;
  reportGeneratedAt?: string | null;
  reportUpdatedAt?: string | null;
  reportApprovedAt?: string | null;
  reportApprovedBy?: string | null;
  reportDownloadedAt?: string | null;
  reportDownloadedBy?: string | null;
  approvedSnapshot?: CanonicalAuditReport | null;
};

export type ReportSaveInput = {
  reportTitle?: string;
  executiveSummary?: string;
  workingWell?: string;
  losingOpportunity?: string;
  recommendedNextSteps?: string;
  closingNote?: string;
  sectionVisibility?: SectionVisibility;
  findingOverrides?: FindingOverride[];
  manualFindings?: ManualFinding[];
  recommendationPlan?: ActionPlanItem[];
  internalNotes?: string | null;
  markReadyForReview?: boolean;
  clientId?: number | null;
  canonicalWebsiteUrl?: string | null;
};

export const DEFAULT_SECTION_VISIBILITY: Required<SectionVisibility> = {
  executiveSummary: true,
  overallScore: true,
  findings: true,
  priorityActionPlan: true,
  professionalAssessment: true,
  appendix: true,
};
