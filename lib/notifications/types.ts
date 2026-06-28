/** Phase 7C — Notification Center types */

export type NotificationSeverity = "info" | "warning" | "critical" | "success";

export type NotificationReadState = "unread" | "read" | "resolved";

export type NotificationSource =
  | "automation"
  | "brain"
  | "founder"
  | "strategy"
  | "reports"
  | "sales"
  | "infrastructure"
  | "playbooks"
  | "client-success";

export interface NotificationItem {
  id: string;
  persistedId?: number | null;
  virtual: boolean;
  source: NotificationSource;
  title: string;
  message: string;
  clientId?: number | null;
  clientName?: string | null;
  severity: NotificationSeverity;
  module: string;
  status: NotificationReadState;
  href: string;
  createdAt: string;
  actionLabel?: string;
}

export interface NotificationCenterSummary {
  unread: number;
  critical: number;
  dueToday: number;
  recentlyResolved: number;
}

export interface NotificationCenterData {
  items: NotificationItem[];
  summary: NotificationCenterSummary;
  modules: string[];
  clients: Array<{ id: number; name: string }>;
}

export interface NotificationFilters {
  severity?: NotificationSeverity | "all";
  module?: string | "all";
  clientId?: number | "all";
  status?: NotificationReadState | "all";
}

export interface NotificationCenterResponse {
  success: boolean;
  data: NotificationCenterData;
}
