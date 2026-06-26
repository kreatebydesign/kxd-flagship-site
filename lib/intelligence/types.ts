// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IntelligenceDoc = Record<string, any>;

export type IntelligenceUrgency = "low" | "medium" | "high" | "critical";
export type IntelligenceConfidence = "low" | "medium" | "high";

export interface IntelligenceRecommendation {
  id: string;
  clientId?: number | null;
  clientName?: string;
  title: string;
  reason: string;
  estimatedBusinessValue: number | null;
  urgency: IntelligenceUrgency;
  confidence: IntelligenceConfidence;
  recommendedAction: string;
  relatedModules: string[];
  category: string;
  href?: string;
}

export interface IntelligenceInsight {
  id: string;
  message: string;
  category: string;
  urgency: IntelligenceUrgency;
  relatedModules: string[];
  metric?: number;
  metricLabel?: string;
}

export interface GrowthOpportunity {
  id: string;
  clientId?: number | null;
  clientName: string;
  title: string;
  reason: string;
  estimatedBusinessValue: number | null;
  urgency: IntelligenceUrgency;
  confidence: IntelligenceConfidence;
  recommendedAction: string;
  relatedModules: string[];
  category: string;
  href?: string;
}

export interface InsightSummarySection {
  score?: number | null;
  status: string;
  highlights: string[];
  concerns: string[];
}

export interface ClientInsights {
  clientId: number;
  clientName: string;
  relationship: InsightSummarySection;
  revenue: InsightSummarySection;
  risk: InsightSummarySection;
  growth: InsightSummarySection;
  infrastructure: InsightSummarySection;
  activity: InsightSummarySection;
  health: InsightSummarySection;
  timeline: InsightSummarySection;
  recommendations: IntelligenceRecommendation[];
}

export interface RevenueSummary {
  activeMrr: number;
  upcomingMrr: number;
  infrastructureMarginOpportunity: number | null;
  potentialExpansionRevenue: number;
  clientsWithoutRetainers: IntelligenceDoc[];
  missingRetainerCount: number;
  pipelineValue: number;
  expectedProposalMrr: number;
  revenueWonThisMonth: number;
  revenuePending: number;
  proposalApprovalRate: number;
  proposalViewRate: number;
}

export interface ClientRiskSummary {
  clientId: number;
  clientName: string;
  signals: string[];
  urgency: IntelligenceUrgency;
  overallHealthScore: number;
  href: string;
}

export interface InfrastructureInsight {
  id: string;
  title: string;
  clientId?: number | null;
  clientName: string;
  detail: string;
  urgency: IntelligenceUrgency;
  href?: string;
}

export interface ProjectInsights {
  activeCount: number;
  stalledCount: number;
  recentlyCompletedCount: number;
  deliverablesDueSoonCount: number;
  openRequestsCount: number;
  creativeInMotionCount: number;
  activeProjects: IntelligenceDoc[];
  recentlyCompleted: IntelligenceDoc[];
  stalledProjects: IntelligenceDoc[];
  deliverablesDueSoon: IntelligenceDoc[];
  requestsWaiting: IntelligenceDoc[];
  creativeInMotion: Array<{ id: string; title: string; type: string; client: string; href: string }>;
}

export interface RelationshipInsights {
  atRiskCount: number;
  needsAttentionCount: number;
  inactiveCount: number;
  staleTimelineCount: number;
  risks: ClientRiskSummary[];
}

export interface MeetingInsight {
  id: number;
  title: string;
  clientId?: number | null;
  clientName: string;
  eventDate: string;
  daysUntil: number;
  href?: string;
}

export interface ExecutiveSummary {
  summary: string;
  priorityCount: number;
  clientRiskCount: number;
  projectBlockerCount: number;
  expansionOpportunityMonthly: number;
  insights: IntelligenceInsight[];
  topRecommendations: IntelligenceRecommendation[];
  generatedAt: string;
}

export interface FounderInsightsBundle {
  executiveSummary: ExecutiveSummary;
  revenue: RevenueSummary;
  relationship: RelationshipInsights;
  infrastructure: InfrastructureInsight[];
  projects: ProjectInsights;
  opportunities: GrowthOpportunity[];
  recommendations: IntelligenceRecommendation[];
  meetings: MeetingInsight[];
}

export interface IntelligenceContext {
  clients: IntelligenceDoc[];
  retainers: IntelligenceDoc[];
  projects: IntelligenceDoc[];
  deliverables: IntelligenceDoc[];
  requests: IntelligenceDoc[];
  onboardings: IntelligenceDoc[];
  audits: IntelligenceDoc[];
  infrastructure: IntelligenceDoc[];
  infraEvents: IntelligenceDoc[];
  infraCosts: IntelligenceDoc[];
  timeline: IntelligenceDoc[];
  executiveTimeline: IntelligenceDoc[];
  portalUsers: IntelligenceDoc[];
  executiveProfiles: IntelligenceDoc[];
  salesLeads: IntelligenceDoc[];
  proposals: IntelligenceDoc[];
  campaigns: IntelligenceDoc[];
  flyers: IntelligenceDoc[];
  videos: IntelligenceDoc[];
  socialPosts: IntelligenceDoc[];
  clientsById: Map<number, IntelligenceDoc>;
  healthCtx: import("@/lib/client-health/health-engine").HealthContext;
}
