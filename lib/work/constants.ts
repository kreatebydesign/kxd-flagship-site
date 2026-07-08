import type { WorkCategory, WorkPriority, WorkSource, WorkStatus } from "./types";

export const WORK_STATUSES: WorkStatus[] = [
  "new",
  "planned",
  "in-progress",
  "waiting-on-client",
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
  "blocked",
  "review",
];

export const WORK_STATUS_LABELS: Record<WorkStatus, string> = {
  new: "New",
  planned: "Planned",
  "in-progress": "In Progress",
  "waiting-on-client": "Waiting on Client",
  blocked: "Blocked",
  review: "Review",
  completed: "Completed",
  archived: "Archived",
};

export const WORK_PRIORITIES: WorkPriority[] = ["low", "normal", "high", "critical"];

export const WORK_PRIORITY_LABELS: Record<WorkPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  critical: "Critical",
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

export const PRIORITY_RANK: Record<WorkPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};
