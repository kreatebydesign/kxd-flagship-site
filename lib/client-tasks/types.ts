/** Phase 7H — Client Work Manager types */

export type TaskCategory =
  | "website"
  | "seo"
  | "branding"
  | "design"
  | "marketing"
  | "crm"
  | "automation"
  | "hosting"
  | "infrastructure"
  | "content"
  | "reporting"
  | "general";

export type TaskPriority = "critical" | "high" | "medium" | "low";

export type TaskStatus =
  | "backlog"
  | "to-do"
  | "in-progress"
  | "review"
  | "waiting-on-client"
  | "waiting-on-kxd"
  | "blocked"
  | "completed"
  | "cancelled";

export const KANBAN_STATUSES: TaskStatus[] = [
  "backlog",
  "to-do",
  "in-progress",
  "review",
  "waiting-on-client",
  "waiting-on-kxd",
  "blocked",
  "completed",
];

export const OPEN_STATUSES: TaskStatus[] = [
  "backlog",
  "to-do",
  "in-progress",
  "review",
  "waiting-on-client",
  "waiting-on-kxd",
  "blocked",
];

export interface TaskListItem {
  id: number;
  clientId: number;
  clientName: string;
  projectId?: number | null;
  title: string;
  description?: string | null;
  category: TaskCategory;
  sourceType?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  assignedTo?: string | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  dueDate?: string | null;
  daysUntilDue?: number | null;
  blockedReason?: string | null;
  labels: string[];
  clientVisible: boolean;
  href: string;
  updatedAt: string;
}

export interface WorkPortfolioData {
  tasks: TaskListItem[];
  byStatus: Record<TaskStatus, TaskListItem[]>;
  byClient: Array<{ clientId: number; clientName: string; count: number; blocked: number; href: string }>;
  dueToday: TaskListItem[];
  dueThisWeek: TaskListItem[];
  overdue: TaskListItem[];
  waitingOnClient: TaskListItem[];
  waitingOnKxd: TaskListItem[];
  completedRecent: TaskListItem[];
  stats: {
    openCount: number;
    blockedCount: number;
    dueTodayCount: number;
    dueThisWeekCount: number;
    overdueCount: number;
    waitingOnClientCount: number;
    waitingOnKxdCount: number;
    completedThisMonth: number;
    estimatedHoursOpen: number;
  };
  generatedAt: string;
}

export interface ClientWorkBoardData {
  clientId: number;
  clientName: string;
  tasks: TaskListItem[];
  byStatus: Record<TaskStatus, TaskListItem[]>;
  activity: TaskListItem[];
  completed: TaskListItem[];
  stats: {
    openCount: number;
    blockedCount: number;
    dueThisWeek: number;
    completedThisMonth: number;
    estimatedHoursOpen: number;
    currentFocus: string | null;
    nextRecommendedTask: TaskListItem | null;
  };
  generatedAt: string;
}

export interface ClientWorkSummary {
  openCount: number;
  blockedCount: number;
  dueThisWeek: number;
  completedThisMonth: number;
  estimatedHoursOpen: number;
  currentFocus: string | null;
  nextTask: TaskListItem | null;
  href: string;
}

export interface ClientTasksMonthActivity {
  completed: number;
  created: number;
  hoursEstimated: number;
  hoursCompleted: number;
  outstanding: number;
  blocked: number;
  velocityLabel: string;
}

export interface PortalClientTaskItem {
  id: number;
  title: string;
  status: TaskStatus;
  dueDate: string | null;
  category: TaskCategory;
  waitingOnClient: boolean;
  completed: boolean;
}

/** Future-ready interfaces */
export interface TimeTrackingPlaceholder {
  taskId: number;
  minutes: number;
  loggedAt: string;
}

export interface RecurringTaskPlaceholder {
  templateId: string;
  interval: "weekly" | "monthly" | "quarterly";
}

export interface TaskDependencyPlaceholder {
  taskId: number;
  dependsOnTaskId: number;
}

export interface SprintPlanningPlaceholder {
  sprintId: string;
  taskIds: number[];
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: "Backlog",
  "to-do": "To Do",
  "in-progress": "In Progress",
  review: "Review",
  "waiting-on-client": "Waiting On Client",
  "waiting-on-kxd": "Waiting On KXD",
  blocked: "Blocked",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  website: "Website",
  seo: "SEO",
  branding: "Branding",
  design: "Design",
  marketing: "Marketing",
  crm: "CRM",
  automation: "Automation",
  hosting: "Hosting",
  infrastructure: "Infrastructure",
  content: "Content",
  reporting: "Reporting",
  general: "General",
};
