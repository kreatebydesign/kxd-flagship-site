// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AutomationDoc = Record<string, any>;

export type AutomationModule =
  | "Launch"
  | "Onboarding"
  | "Infrastructure"
  | "Website Auditor"
  | "Founder Intelligence"
  | "Growth"
  | "Creative"
  | "Projects"
  | "Requests"
  | "Deliverables"
  | "Portal"
  | "Automation"
  | "Brain";

export type AutomationEventStatus = "published" | "processed" | "failed";

export type NotificationSeverity = "info" | "warning" | "critical" | "success";

export type NotificationStatus = "queued" | "resolved";

export interface CreateAutomationEventInput {
  module: AutomationModule;
  eventName: string;
  clientId?: number;
  payload?: Record<string, unknown>;
  status?: AutomationEventStatus;
  ruleId?: string;
  errorMessage?: string;
  skipRules?: boolean;
}

export interface PublishTimelineInput {
  clientId: number;
  eventType: string;
  title: string;
  summary?: string;
  description?: string;
  category: string;
  importance?: string;
  sourceModule: string;
  projectId?: number;
  infrastructureId?: number;
  requestId?: number;
  deliverableId?: number;
  createdBy?: string;
  occurredAt?: string;
  pinned?: boolean;
  metadata?: Record<string, unknown>;
}

export interface PublishNotificationInput {
  title: string;
  clientId?: number;
  severity: NotificationSeverity;
  module: AutomationModule | string;
  summary?: string;
  metadata?: Record<string, unknown>;
}

export interface PublishFounderSignalInput {
  clientId?: number;
  signalType: string;
  title: string;
  summary: string;
  urgency: "low" | "medium" | "high" | "critical";
  module: AutomationModule | string;
  recommendedAction?: string;
  href?: string;
  metadata?: Record<string, unknown>;
}

export interface PublishClientHealthInput {
  clientId: number;
  triggerModule: AutomationModule | string;
  triggerEvent?: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  when: (event: AutomationEventRecord) => boolean;
  then: (event: AutomationEventRecord, ctx: AutomationRuleContext) => Promise<void>;
}

export interface AutomationEventRecord {
  id?: number;
  module: AutomationModule;
  eventName: string;
  clientId?: number;
  payload?: Record<string, unknown>;
}

export interface AutomationRuleContext {
  payload?: import("payload").Payload;
}

export interface ModulePublisherInfo {
  id: AutomationModule;
  label: string;
  connected: boolean;
  description: string;
}

export interface AutomationDashboardData {
  recentEvents: AutomationDoc[];
  failedEvents: AutomationDoc[];
  queuedNotifications: AutomationDoc[];
  ruleExecutionCounts: Array<{ ruleId: string; name: string; count: number }>;
  stats: {
    eventsPublished: number;
    rulesExecuted: number;
    healthRecalculations: number;
    notificationsQueued: number;
    failedEvents: number;
  };
  connectedModules: ModulePublisherInfo[];
  systemStatus: "operational" | "degraded" | "offline";
}

export interface FounderSignalRecord {
  id: number;
  clientId?: number;
  signalType: string;
  title: string;
  summary: string;
  urgency: string;
  module: string;
  recommendedAction?: string;
  href?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}
