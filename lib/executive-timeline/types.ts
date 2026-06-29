// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ExecutiveTimelineDoc = Record<string, any>;

export type ExecutiveTimelineCategory =
  | "relationship"
  | "project"
  | "creative"
  | "infrastructure"
  | "website"
  | "seo"
  | "analytics"
  | "marketing"
  | "finance"
  | "onboarding"
  | "meeting"
  | "communication"
  | "support"
  | "launch"
  | "growth"
  | "system";

export type ExecutiveTimelineImportance = "low" | "normal" | "high" | "critical";

export type ExecutiveTimelineSourceModule =
  | "Launch"
  | "Client HQ"
  | "Client Command"
  | "Client Intelligence"
  | "Infrastructure"
  | "Founder Intelligence"
  | "Audits"
  | "Creative"
  | "Reels"
  | "Accounts"
  | "Growth"
  | "Portal"
  | "Website Auditor"
  | "Executive Notes"
  | "Projects"
  | "Requests"
  | "Sales"
  | "Retainers"
  | "Client Success"
  | "Emails"
  | "Communications"
  | "Manual";

export interface CreateExecutiveEventInput {
  client: number;
  project?: number;
  infrastructure?: number;
  request?: number;
  deliverable?: number;
  eventType: string;
  title: string;
  summary?: string;
  description?: string;
  category: ExecutiveTimelineCategory;
  status?: string;
  importance?: ExecutiveTimelineImportance;
  sourceModule: ExecutiveTimelineSourceModule;
  createdBy?: string;
  occurredAt?: string;
  metadata?: Record<string, unknown>;
  internalOnly?: boolean;
  pinned?: boolean;
}

export interface ExecutiveTimelineFilters {
  clientId?: number;
  category?: ExecutiveTimelineCategory | "all";
  importance?: ExecutiveTimelineImportance | "all";
  search?: string;
  pinnedOnly?: boolean;
}

export interface ExecutiveTimelineMonthGroup {
  monthKey: string;
  monthLabel: string;
  events: ExecutiveTimelineDoc[];
}

export interface RelationshipSummary {
  clientId: number;
  clientName: string;
  totalEvents: number;
  pinnedCount: number;
  milestoneCount: number;
  firstEventAt: string | null;
  lastEventAt: string | null;
  topCategories: Array<{ category: string; count: number }>;
  relationshipStart: string | null;
}

export interface ExecutiveTimelineDashboardData {
  recentEvents: ExecutiveTimelineDoc[];
  pinnedEvents: ExecutiveTimelineDoc[];
  clients: ExecutiveTimelineDoc[];
  filters: ExecutiveTimelineFilters;
}

export interface ExecutiveTimelineClientData {
  client: ExecutiveTimelineDoc;
  summary: RelationshipSummary;
  pinnedEvents: ExecutiveTimelineDoc[];
  milestones: ExecutiveTimelineDoc[];
  monthGroups: ExecutiveTimelineMonthGroup[];
  upcomingRelated: ExecutiveTimelineDoc[];
}
