import type { ClientWorkSummary } from "@/lib/client-tasks/types";
import type { ClientHealthResult } from "@/lib/client-health/health-engine";
import type { ClientInfrastructureDetail } from "@/lib/infrastructure/types";
import type { ClientInsights, IntelligenceRecommendation } from "@/lib/intelligence/types";
import type { MergedExecutiveClientRow } from "@/lib/executive-client-profile";
import type { ClientStrategySummary } from "@/lib/executive-notes/types";
import type { ClientPlaybookSummary } from "@/lib/playbooks";
import type { ClientSuccessSummary } from "@/lib/client-success/types";
import type { ExecutiveTimelineClientData } from "@/lib/executive-timeline/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CommandDoc = Record<string, any>;

export interface CommandListItem {
  id: string;
  title: string;
  detail?: string;
  meta?: string;
  href?: string;
  status?: string;
}

export interface CommandHero {
  clientId: number;
  clientName: string;
  logoUrl: string | null;
  relationshipStatus: string;
  healthScore: number | null;
  monthlyInvestment: string;
  lifetimeRevenue: string;
  accountManager: string;
  currentPhase: string;
  nextMilestone: string;
  tier: string | null;
}

export interface CommandQuickAction {
  label: string;
  sub: string;
  href: string;
}

export interface CommandRecommendation extends IntelligenceRecommendation {
  estimatedImpact: string;
}

export interface RelationshipSection {
  yearsTogether: string;
  meetingCount: number;
  lastContact: string;
  nextFollowUp: string;
  timelineHighlights: CommandListItem[];
  executiveNotes: string | null;
}

export interface RevenueSection {
  mrr: string;
  lifetimeRevenue: string;
  outstandingInvoices: string;
  proposalPipeline: string;
  averageMonthlyValue: string;
  growthOpportunities: CommandListItem[];
}

export interface ProjectsSection {
  active: CommandListItem[];
  blocked: CommandListItem[];
  upcoming: CommandListItem[];
  recentlyCompleted: CommandListItem[];
  deliverables: CommandListItem[];
  requests: CommandListItem[];
}

export interface WebsiteSection {
  healthScore: number | null;
  healthStatus: string;
  infrastructureScore: number | null;
  infrastructureStatus: string;
  primaryDomain: string | null;
  hosting: string | null;
  sslStatus: string | null;
  analytics: string | null;
  searchConsole: string | null;
  recentDeployments: CommandListItem[];
  audits: CommandListItem[];
  signals: CommandListItem[];
}

export interface CreativeSection {
  campaigns: CommandListItem[];
  videos: CommandListItem[];
  flyers: CommandListItem[];
  social: CommandListItem[];
  assets: CommandListItem[];
  brandKits: CommandListItem[];
}

export interface ReportingSection {
  latestReport: CommandListItem | null;
  historicalReports: CommandListItem[];
  totalViews: number;
  engagementLabel: string;
}

export interface SalesSection {
  proposalHistory: CommandListItem[];
  conversionRate: string;
  opportunities: CommandListItem[];
  pipelineValue: string;
  pastProposals: CommandListItem[];
}

export interface AutomationSection {
  recentEvents: CommandListItem[];
  notifications: CommandListItem[];
  healthRecalculations: number;
  timelineEvents: CommandListItem[];
  failures: CommandListItem[];
}

export interface StrategySection {
  latestNotes: CommandListItem[];
  pinnedStrategy: CommandListItem[];
  upcomingReminders: CommandListItem[];
  recentDecisions: CommandListItem[];
  relationshipInsights: import("@/lib/executive-notes/types").RelationshipIntelligence;
  quickCreateHref: string;
}

export interface GenesisSection {
  discoveryProgress: number;
  blueprintStatus: string;
  launchReadiness: number;
  missingInformation: string[];
  recommendedNextStep: string;
  href: string | null;
  status: string;
}

export interface LaunchQaSection {
  qaId: number | null;
  href: string | null;
  status: string;
  readinessScore: number;
  recommendation: string;
  criticalBlockers: number;
  openItems: number;
  launchDate: string | null;
}

export interface CommandSections {
  relationship: RelationshipSection;
  revenue: RevenueSection;
  projects: ProjectsSection;
  website: WebsiteSection;
  creative: CreativeSection;
  reporting: ReportingSection;
  sales: SalesSection;
  automation: AutomationSection;
  strategy: StrategySection;
}

export interface ClientCommandCenterData {
  clientId: number;
  hero: CommandHero;
  executiveBrief: string[];
  sections: CommandSections;
  recommendations: CommandRecommendation[];
  quickActions: CommandQuickAction[];
  playbooks: ClientPlaybookSummary;
  currentWork: ClientWorkSummary;
  clientSuccess: ClientSuccessSummary;
  genesis: GenesisSection;
  launchQa: LaunchQaSection;
  insights: ClientInsights | null;
  health: ClientHealthResult;
  row: MergedExecutiveClientRow | null;
  generatedAt: string;
}

export interface CommandWidgetInput {
  clientId: number;
  clientName: string;
  row: MergedExecutiveClientRow | null;
  insights: ClientInsights | null;
  health: ClientHealthResult;
  timeline: ExecutiveTimelineClientData | null;
  infrastructure: ClientInfrastructureDetail | null;
  brandKits: CommandDoc[];
  creativeAssets: CommandDoc[];
  automation: {
    events: CommandDoc[];
    notifications: CommandDoc[];
    failures: CommandDoc[];
    healthRecalculations: number;
  };
  projects: CommandDoc[];
  deliverables: CommandDoc[];
  requests: CommandDoc[];
  proposals: CommandDoc[];
  reports: CommandDoc[];
  audits: CommandDoc[];
  campaigns: CommandDoc[];
  flyers: CommandDoc[];
  videos: CommandDoc[];
  socialPosts: CommandDoc[];
  onboardings: CommandDoc[];
  profile: CommandDoc | null;
  strategy: ClientStrategySummary | null;
}
