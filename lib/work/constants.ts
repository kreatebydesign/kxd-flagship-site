import type { WorkCategory, WorkPriority, WorkSource, WorkStatus } from "./types";

export const WORK_STATUSES: WorkStatus[] = [
  "new",
  "planned",
  "in-progress",
  "waiting-on-client",
  "waiting-on-kxd",
  "blocked",
  "review",
  "completed",
  "archived",
];

export const OPEN_WORK_STATUSES: WorkStatus[] = [
  "new",
  "planned",
  "in-progress",
  "waiting-on-client",
  "waiting-on-kxd",
  "blocked",
  "review",
];

/** `new` is the Inbox status value — preserved for existing records. */
export const WORK_STATUS_LABELS: Record<WorkStatus, string> = {
  new: "Inbox",
  planned: "Planned",
  "in-progress": "In Progress",
  "waiting-on-client": "Waiting on Client",
  "waiting-on-kxd": "Waiting on KXD",
  blocked: "Blocked",
  review: "Review",
  completed: "Completed",
  archived: "Archived",
};

export const WORK_PRIORITIES: WorkPriority[] = ["critical", "high", "normal", "low"];

export const WORK_PRIORITY_LABELS: Record<WorkPriority, string> = {
  critical: "Critical",
  high: "High",
  normal: "Normal",
  low: "Low",
};

export const WORK_SOURCES: WorkSource[] = [
  "website-review",
  "client-request",
  "communication",
  "manual",
  "future-ai",
  "future-automation",
  "future-onboarding",
  "future-brand-center",
  "future-marketing",
];

export const WORK_SOURCE_LABELS: Record<WorkSource, string> = {
  "website-review": "Website Review",
  "client-request": "Client Request",
  communication: "Communication",
  manual: "Manual",
  "future-ai": "AI",
  "future-automation": "Automation",
  "future-onboarding": "Onboarding",
  "future-brand-center": "Brand Center",
  "future-marketing": "Marketing",
};

export const WORK_CATEGORIES: WorkCategory[] = [
  "website",
  "creative",
  "content",
  "strategy",
  "communication",
  "onboarding",
  "reporting",
  "operations",
  "general",
];

export const WORK_CATEGORY_LABELS: Record<WorkCategory, string> = {
  website: "Website",
  creative: "Creative",
  content: "Content",
  strategy: "Strategy",
  communication: "Communication",
  onboarding: "Onboarding",
  reporting: "Reporting",
  operations: "Operations",
  general: "General",
};

export const WORK_COLLECTION = "work" as const;

export const WORK_ENGINE_HOME = "/admin/work" as const;

export const CLIENT_SUCCESS_HOME = "/admin/operations/client-success" as const;

export function clientSuccessHref(clientId: number): string {
  return `${CLIENT_SUCCESS_HOME}/${clientId}`;
}

export const PRIORITY_RANK: Record<WorkPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};
