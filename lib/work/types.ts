/** Phase 14B + 20A — Work Engine domain types */

export type WorkStatus =
  | "new"
  | "planned"
  | "in-progress"
  | "waiting-on-client"
  | "waiting-on-kxd"
  | "blocked"
  | "review"
  | "completed"
  | "archived";

export type WorkPriority = "critical" | "high" | "normal" | "low";

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

export interface WorkActivityEntry {
  at: string;
  actor: string | null;
  action: string;
  detail: string | null;
}

export interface WorkListItem {
  id: number;
  clientId: number | null;
  clientName: string;
  title: string;
  summary: string | null;
  description: string | null;
  notes: string | null;
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
  internalProject: string | null;
  tags: string[];
  estimatedEffort: number | null;
  dueDate: string | null;
  startDate: string | null;
  /**
   * Daily execution plan date (YYYY-MM-DD).
   * Independent of dueDate — intentional placement for Today / planning.
   */
  plannedForDate: string | null;
  /** Projection — managed only by lib/scheduling services. */
  schedulingStatus: "none" | "proposed" | "approved" | "pending_calendar_write" | "scheduled" | "conflict" | "sync_error";
  scheduledStart: string | null;
  scheduledEnd: string | null;
  activeScheduleLinkId: number | null;
  startedAt: string | null;
  completedAt: string | null;
  parentWorkId: number | null;
  createdAt: string;
  updatedAt: string;
  href: string;
  adminHref: string;
  /** Internal Client Success workspace — null when work has no client. */
  clientSuccessHref: string | null;
  /** Append-only internal activity — populated on detail loads. */
  activityHistory: WorkActivityEntry[];
}

export interface ClientWorkData {
  clientId: number;
  active: WorkListItem[];
  waitingOnClient: WorkListItem[];
  waitingOnKxd: WorkListItem[];
  upcoming: WorkListItem[];
  completed: WorkListItem[];
  openCount: number;
  generatedAt: string;
}

export interface WorkWorkspaceStats {
  openCount: number;
  waitingOnClientCount: number;
  waitingOnKxdCount: number;
  inProgressCount: number;
  reviewCount: number;
  blockedCount: number;
  overdueCount: number;
  completedTodayCount: number;
  queueCount: number;
}

export interface WorkWorkspaceData {
  currentWork: WorkListItem[];
  todayWork: WorkListItem[];
  waitingOnClient: WorkListItem[];
  waitingOnKxd: WorkListItem[];
  upcoming: WorkListItem[];
  overdue: WorkListItem[];
  inProgress: WorkListItem[];
  review: WorkListItem[];
  completedToday: WorkListItem[];
  queue: WorkListItem[];
  recentWork: WorkListItem[];
  stats: WorkWorkspaceStats;
  generatedAt: string;
}

export interface CreateWorkInput {
  clientId?: number | null;
  title: string;
  summary?: string;
  description?: string;
  notes?: string;
  source?: WorkSource;
  sourceId?: string;
  category?: WorkCategory;
  status?: WorkStatus;
  priority?: WorkPriority;
  clientVisible?: boolean;
  timelineEnabled?: boolean;
  createdBy?: string;
  assignedToId?: number;
  internalProject?: string;
  tags?: string[];
  estimatedEffort?: number;
  dueDate?: string;
  startDate?: string;
  plannedForDate?: string;
  startedAt?: string;
  parentWorkId?: number;
}

export interface UpdateWorkItemInput {
  workId: number;
  title?: string;
  summary?: string | null;
  description?: string | null;
  notes?: string | null;
  status?: WorkStatus;
  priority?: WorkPriority;
  category?: WorkCategory;
  clientId?: number | null;
  assignedToId?: number | null;
  internalProject?: string | null;
  tags?: string[];
  estimatedEffort?: number | null;
  dueDate?: string | null;
  startDate?: string | null;
  plannedForDate?: string | null;
  actorEmail?: string;
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
