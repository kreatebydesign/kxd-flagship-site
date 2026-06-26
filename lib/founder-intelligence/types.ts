// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FounderDoc = Record<string, any>;

export type PriorityUrgency = "low" | "medium" | "high" | "critical";

export type PriorityType =
  | "critical-infrastructure"
  | "overdue-request"
  | "project-at-risk"
  | "upcoming-renewal"
  | "missing-retainer"
  | "client-health"
  | "onboarding-incomplete"
  | "audit-follow-up"
  | "growth-opportunity"
  | "meeting-prep";

export interface FounderPriority {
  id: string;
  type: PriorityType;
  title: string;
  client: string;
  clientId: number | null;
  whyItMatters: string;
  recommendedAction: string;
  urgency: PriorityUrgency;
  sourceModule: string;
  href?: string;
}

export interface FounderMorningBrief {
  summary: string;
  priorityCount: number;
  clientRiskCount: number;
  projectBlockerCount: number;
  expansionOpportunityMonthly: number;
}

export interface FounderRevenueIntelligence {
  activeMrr: number;
  upcomingMrr: number;
  infrastructureMarginOpportunity: number | null;
  potentialExpansionRevenue: number;
  clientsWithoutRetainers: FounderDoc[];
  zeroStackCostClients: FounderDoc[];
  topOpportunityClients: Array<{ clientId: number; name: string; reason: string; value: number }>;
  missingRetainerOpportunities: Array<{ clientId: number; name: string; reason: string }>;
}

export interface FounderClientRiskSignal {
  clientId: number;
  clientName: string;
  signals: string[];
  urgency: PriorityUrgency;
  href: string;
}

export interface FounderProjectMomentum {
  activeProjects: FounderDoc[];
  recentlyCompleted: FounderDoc[];
  stalledProjects: FounderDoc[];
  deliverablesDueSoon: FounderDoc[];
  requestsWaiting: FounderDoc[];
  creativeInMotion: Array<{ id: string; title: string; type: string; client: string; href: string }>;
}

export interface FounderInfrastructureAlert {
  id: string;
  title: string;
  client: string;
  clientId: number | null;
  detail: string;
  urgency: PriorityUrgency;
  href?: string;
}

export interface FounderMeetingItem {
  id: number;
  title: string;
  client: string;
  clientId: number | null;
  eventDate: string;
  daysUntil: number;
  href?: string;
}

export interface FounderOpportunitySignal {
  id: string;
  title: string;
  client: string;
  clientId: number | null;
  category: string;
  detail: string;
  estimatedValue: number | null;
  href?: string;
}

export interface FounderRecommendedFocus {
  action: string;
  reason: string;
  href?: string;
}

export interface FounderBriefingData {
  dateDisplay: string;
  timeDisplay: string;
  morningBrief: FounderMorningBrief;
  priorities: FounderPriority[];
  revenue: FounderRevenueIntelligence;
  clientRisks: FounderClientRiskSignal[];
  projectMomentum: FounderProjectMomentum;
  infrastructureAlerts: FounderInfrastructureAlert[];
  upcomingMeetings: FounderMeetingItem[];
  opportunities: FounderOpportunitySignal[];
  recommendedFocus: FounderRecommendedFocus[];
}
