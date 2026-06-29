export type ClientActionSource =
  | "Communication"
  | "Intelligence"
  | "Executive"
  | "Timeline"
  | "Manual"
  | "Revenue"
  | "Retention";

export type ClientActionPriority = "low" | "medium" | "high" | "critical";

export type ClientActionStatus =
  | "pending"
  | "in-progress"
  | "waiting"
  | "completed"
  | "dismissed"
  | "archived";

export type ClientActionType =
  | "follow-up"
  | "email"
  | "phone-call"
  | "meeting"
  | "proposal"
  | "upsell"
  | "task"
  | "project"
  | "reminder"
  | "custom";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ClientActionDoc = Record<string, any>;

export interface WorkspaceActionRow {
  id: number;
  title: string;
  description: string | null;
  source: ClientActionSource;
  priority: ClientActionPriority;
  status: ClientActionStatus;
  actionType: ClientActionType;
  dueDate: string | null;
  completedDate: string | null;
  assignedTo: string | null;
  createdBy: string | null;
  memoryReference: string | null;
  href: string;
}

export interface WorkspaceActionsSnapshot {
  actions: WorkspaceActionRow[];
  openCount: number;
  criticalCount: number;
  nextDue: WorkspaceActionRow | null;
  todayPriorities: WorkspaceActionRow[];
  overdue: WorkspaceActionRow[];
  upcoming: WorkspaceActionRow[];
  revenueOpportunities: WorkspaceActionRow[];
  retentionRisks: WorkspaceActionRow[];
  completedRecently: WorkspaceActionRow[];
}

export interface CreateClientActionInput {
  clientId: number;
  title: string;
  description?: string;
  source?: ClientActionSource;
  priority?: ClientActionPriority;
  status?: ClientActionStatus;
  actionType?: ClientActionType;
  createdBy?: string;
  assignedTo?: string;
  dueDate?: string;
  memoryReference?: string;
  relatedCommunicationId?: number;
  relatedProjectId?: number;
  relatedRequestId?: number;
  executiveNotes?: string;
}

export interface UpdateClientActionInput {
  status?: ClientActionStatus;
  priority?: ClientActionPriority;
  assignedTo?: string | null;
  dueDate?: string | null;
  completionNotes?: string;
  result?: string;
  executiveNotes?: string;
}

export interface BulkClientActionInput {
  ids: number[];
  status?: ClientActionStatus;
  priority?: ClientActionPriority;
  assignedTo?: string | null;
  dueDate?: string | null;
}

export interface ClientPrioritiesWidgetItem {
  id: number;
  clientId: number;
  clientName: string;
  title: string;
  priority: ClientActionPriority;
  status: ClientActionStatus;
  dueDate: string | null;
  href: string;
  bucket: "critical" | "high" | "due-today" | "overdue" | "needs-reply";
}

export interface ClientPrioritiesWidget {
  critical: ClientPrioritiesWidgetItem[];
  high: ClientPrioritiesWidgetItem[];
  dueToday: ClientPrioritiesWidgetItem[];
  overdue: ClientPrioritiesWidgetItem[];
  needsReply: ClientPrioritiesWidgetItem[];
  totals: {
    critical: number;
    high: number;
    dueToday: number;
    overdue: number;
    needsReply: number;
  };
}
