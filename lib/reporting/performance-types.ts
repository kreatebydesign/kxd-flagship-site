/** Phase 10A — client-safe performance report types (no server-only imports) */

export type PerformanceReportType =
  | "google_ads"
  | "seo"
  | "website"
  | "monthly_marketing"
  | "analytics"
  | "custom";

export type PerformanceReportStatus =
  | "draft"
  | "generating"
  | "ready"
  | "published"
  | "sent"
  | "archived";

export type StrategyPriority = "low" | "medium" | "high";

export interface CampaignPerformanceRow {
  campaignName: string;
  impressions?: number | null;
  clicks?: number | null;
  ctr?: number | null;
  avgCpc?: number | null;
  cost?: number | null;
  conversions?: number | null;
  notes?: string | null;
}

export interface GeographicPerformanceRow {
  location: string;
  impressions?: number | null;
  clicks?: number | null;
  ctr?: number | null;
  avgCpc?: number | null;
  cost?: number | null;
  conversions?: number | null;
  notes?: string | null;
}

export interface TopSearchTermRow {
  searchTerm: string;
  insight?: string | null;
  recommendation?: string | null;
}

export interface OptimizationWorkRow {
  title: string;
  description?: string | null;
}

export interface NextMonthStrategyRow {
  title: string;
  priority?: StrategyPriority | null;
  description?: string | null;
}

export interface PerformanceReportViewModel {
  id: number;
  clientName: string;
  title: string;
  reportType: PerformanceReportType | string;
  reportTypeLabel: string;
  periodLabel: string;
  preparedBy: string;
  status: string;
  executiveSummary: string;
  campaignPerformance: CampaignPerformanceRow[];
  geographicPerformance: GeographicPerformanceRow[];
  topSearchTerms: TopSearchTermRow[];
  optimizationWorkCompleted: OptimizationWorkRow[];
  nextMonthStrategy: NextMonthStrategyRow[];
  accountHealthScore: number | null;
  clientFacingNotes: string | null;
  isPerformanceReport: boolean;
}

export const REPORT_TYPE_LABELS: Record<PerformanceReportType, string> = {
  google_ads: "Google Ads",
  seo: "SEO",
  website: "Website",
  monthly_marketing: "Monthly Marketing",
  analytics: "Analytics",
  custom: "Custom",
};

export const STRATEGY_PRIORITY_LABELS: Record<StrategyPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};
