// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ReportDoc = Record<string, any>;

export type ReportStatus = "draft" | "generating" | "ready" | "published";

export type ReportSectionKey =
  | "executiveSummary"
  | "workCompleted"
  | "deliverables"
  | "projects"
  | "meetings"
  | "websiteHealth"
  | "infrastructure"
  | "growth"
  | "recommendations"
  | "kpis"
  | "traffic"
  | "conversions"
  | "seo"
  | "timeline"
  | "notes"
  | "nextMonthPriorities";

export interface ReportTemplateDefinition {
  slug: string;
  title: string;
  category: string;
  edition: string;
  sections: ReportSectionKey[];
}

export interface ReportKpi {
  label: string;
  value: string;
  trend?: string;
  status?: "positive" | "neutral" | "attention";
}

export interface ReportTimelineEntry {
  date: string;
  title: string;
  summary?: string;
  category: string;
  importance?: string;
}

export interface ReportRecommendationSet {
  topPriorities: string[];
  quickWins: string[];
  infrastructureImprovements: string[];
  seoRecommendations: string[];
  growthOpportunities: string[];
  riskItems: string[];
  completedWins: string[];
}

export interface ConnectorPlaceholder {
  id: string;
  label: string;
  status: "not-configured" | "ready" | "connected";
  note: string;
}

export interface TrafficMetrics {
  sessions?: number;
  users?: number;
  pageviews?: number;
  source: string;
}

export interface SeoMetrics {
  score?: number;
  previousScore?: number;
  source: string;
}

export interface ConversionMetrics {
  conversions?: number;
  conversionRate?: number;
  source: string;
}

/** Future connector interface — no external APIs in Phase 6C */
export interface AnalyticsConnector {
  id: string;
  label: string;
  isConfigured(): boolean;
  fetchTraffic?(
    clientId: number,
    month: number,
    year: number,
  ): Promise<TrafficMetrics | null>;
  fetchSeo?(
    clientId: number,
    month: number,
    year: number,
  ): Promise<SeoMetrics | null>;
  fetchConversions?(
    clientId: number,
    month: number,
    year: number,
  ): Promise<ConversionMetrics | null>;
}

export interface ClientMonthlyMetrics {
  clientId: number;
  clientName: string;
  month: number;
  year: number;
  monthLabel: string;
  deliverablesCompleted: ReportDoc[];
  deliverablesInProgress: ReportDoc[];
  activeProjects: ReportDoc[];
  completedProjects: ReportDoc[];
  openRequests: ReportDoc[];
  completedRequests: ReportDoc[];
  meetings: ReportTimelineEntry[];
  timeline: ReportTimelineEntry[];
  healthScore: number | null;
  previousHealthScore: number | null;
  infrastructureStatus: string;
  infrastructureScore: number | null;
  websiteAuditScore: number | null;
  retainerMrr: number | null;
  creativeItems: ReportDoc[];
  salesEvents: ReportTimelineEntry[];
}

export interface GeneratedReportPayload {
  executiveSummary: string;
  workCompleted: string;
  deliverables: ReportDoc[];
  projects: ReportDoc[];
  meetings: ReportTimelineEntry[];
  websiteHealth: Record<string, unknown>;
  infrastructure: Record<string, unknown>;
  growth: Record<string, unknown>;
  recommendations: ReportRecommendationSet;
  kpis: ReportKpi[];
  traffic: TrafficMetrics | ConnectorPlaceholder;
  conversions: ConversionMetrics | ConnectorPlaceholder;
  seo: SeoMetrics | ConnectorPlaceholder;
  timeline: ReportTimelineEntry[];
  notes: string;
  nextMonthPriorities: string[];
  connectorStatus: ConnectorPlaceholder[];
}

export interface ReportingDashboardData {
  reportsDue: number;
  reportsGenerated: number;
  reportsApproved: number;
  reportsPublished: number;
  reportsViewed: number;
  lastGeneratedAt: string | null;
  recentReports: ReportDoc[];
  clientsWithoutReport: ReportDoc[];
}

export interface GenerateReportInput {
  clientId: number;
  month: number;
  year: number;
  templateSlug?: string;
  preparedBy?: string;
}

export interface GenerateReportResult {
  success: boolean;
  reportId?: number;
  error?: string;
}
