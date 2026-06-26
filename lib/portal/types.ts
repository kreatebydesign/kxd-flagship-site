// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PortalDoc = Record<string, any>;

export type HealthSignalStatus = "ok" | "warning" | "unknown" | "pending";

export interface PortalHealthSignal {
  id: string;
  label: string;
  value: string;
  status: HealthSignalStatus;
  detail?: string;
}

export interface PortalWebsiteAuditSummary {
  id: number;
  website: string;
  overallScore: number | null;
  grade: string | null;
  performanceScore: number | null;
  seoScore: number | null;
  mobileScore: number | null;
  conversionScore: number | null;
  brandScore: number | null;
  completedAt: string | null;
  strengths: string[];
  opportunities: string[];
  recommendations: string[];
}

export interface PortalWebsiteHealthData {
  domain: string | null;
  signals: PortalHealthSignal[];
  latestAudit: PortalWebsiteAuditSummary | null;
  knownIssues: string[];
}

export interface PortalMeetingItem {
  id: number;
  title: string;
  summary: string | null;
  eventDate: string;
  isUpcoming: boolean;
}

export interface PortalTeamMember {
  id: string;
  name: string;
  role: string;
  email?: string | null;
  kind: "client" | "kxd";
  portraitUrl?: string | null;
}

export interface PortalResourceCategory {
  id: string;
  title: string;
  description: string;
  items: Array<{ title: string; description?: string; href?: string }>;
}

export interface PortalQuickAction {
  label: string;
  href: string;
  description?: string;
}

export interface PortalOverviewData {
  companyName: string;
  logoUrl: string | null;
  relationshipStart: string | null;
  plan: string | null;
  monthlyInvestment: number | null;
  healthScore: number | null;
  healthLabel: string | null;
  accountManager: string;
  accountManagerEmail: string;
  nextMeeting: { title: string; date: string } | null;
  currentPhase: string | null;
  primaryGoals: string | null;
  openRequests: number;
  deliverablesDue: number;
  activeProjects: number;
  pendingDeliverables: number;
  completedDeliverables: number;
  onboardingStatus: string;
  readinessScore: number;
  recentProjects: PortalDoc[];
  recentRequests: PortalDoc[];
  recentDeliverables: PortalDoc[];
  recentCompleted: PortalDoc[];
  timelineActivity: PortalDoc[];
  quickActions: PortalQuickAction[];
}
