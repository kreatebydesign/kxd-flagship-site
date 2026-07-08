/** Phase 14B — Work Engine domain types */

export type WorkStatus =
  | "new"
  | "planned"
  | "in-progress"
  | "waiting-on-client"
  | "blocked"
  | "review"
  | "completed"
  | "archived";

export type WorkPriority = "low" | "normal" | "high" | "critical";

export type WorkSource =
  | "website-review"
  | "client-request"
  | "communication"
  | "manual"
  | "future-ai"
  | "future-automation"
  | "future-onboarding"
  | "future-brand-center"
  | "future-marketing";

export type WorkCategory =
  | "website"
  | "creative"
  | "content"
  | "strategy"
  | "communication"
  | "onboarding"
  | "reporting"
  | "operations"
  | "general";

export interface WorkListItem {
  id: number;
  clientId: number;
  clientName: string;
  title: string;
  summary: string | null;
  source: WorkSource;
  sourceId: string | null;
  category: WorkCategory;
  status: WorkStatus;
  priority: WorkPriority;
  clientVisible: boolean;
  timelineEnabled: boolean;
  createdBy: string | null;
  assignedTo: string | null;
  assignedToId: number | null;
  dueDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  href: string;
  adminHref: string;
}

export interface WorkWorkspaceStats {
  openCount: number;
  waitingOnClientCount: number;
  inProgressCount: number;
  reviewCount: number;
  blockedCount: number;
  completedTodayCount: number;
  queueCount: number;
}

export interface WorkWorkspaceData {
  currentWork: WorkListItem[];
  waitingOnClient: WorkListItem[];
  inProgress: WorkListItem[];
  review: WorkListItem[];
  completedToday: WorkListItem[];
  queue: WorkListItem[];
  recentWork: WorkListItem[];
  stats: WorkWorkspaceStats;
  generatedAt: string;
}

export interface CreateWorkInput {
  clientId: number;
  title: string;
  summary?: string;
  source?: WorkSource;
  sourceId?: string;
  category?: WorkCategory;
  status?: WorkStatus;
  priority?: WorkPriority;
  clientVisible?: boolean;
  timelineEnabled?: boolean;
  createdBy?: string;
  assignedToId?: number;
  dueDate?: string;
  startedAt?: string;
}

export interface UpdateWorkStatusInput {
  workId: number;
  status: WorkStatus;
  actorEmail?: string;
}

export interface SpawnWorkFromSourceInput {
  clientId: number;
  title: string;
  summary?: string;
  source: WorkSource;
  sourceId: string;
  category?: WorkCategory;
  priority?: WorkPriority;
  clientVisible?: boolean;
  timelineEnabled?: boolean;
  createdBy?: string;
}
