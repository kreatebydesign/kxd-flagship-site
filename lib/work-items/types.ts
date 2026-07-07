/**
 * KXD Work Items — product layer over client-tasks collection.
 * Collection slug remains client-tasks (Phase 11B).
 */

export type WorkItemSourceType =
  | "client-request"
  | "monthly-deliverable"
  | "project-task"
  | "follow-up"
  | "admin-task"
  | "upgrade-offer"
  | "growth-opportunity"
  | "playbook-step"
  | "portal-request"
  | "retainer-task"
  | "content"
  | "website"
  | "seo"
  | "ads"
  | "internal"
  | "manual";

export const WORK_ITEM_SOURCE_TYPES: WorkItemSourceType[] = [
  "client-request",
  "monthly-deliverable",
  "project-task",
  "follow-up",
  "admin-task",
  "upgrade-offer",
  "growth-opportunity",
  "playbook-step",
  "portal-request",
  "retainer-task",
  "content",
  "website",
  "seo",
  "ads",
  "internal",
  "manual",
];

export const WORK_ITEM_SOURCE_LABELS: Record<WorkItemSourceType, string> = {
  "client-request": "Client Request",
  "monthly-deliverable": "Monthly Deliverable",
  "project-task": "Project Task",
  "follow-up": "Follow-up",
  "admin-task": "Admin Task",
  "upgrade-offer": "Upgrade Offer",
  "growth-opportunity": "Growth Opportunity",
  "playbook-step": "Playbook Step",
  "portal-request": "Portal Request",
  "retainer-task": "Retainer Task",
  content: "Content",
  website: "Website",
  seo: "SEO",
  ads: "Ads",
  internal: "Internal",
  manual: "Manual",
};

/** UI label for backlog column status */
export const WORK_ITEM_STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  "to-do": "Ready",
  "in-progress": "In Progress",
  review: "Review",
  "waiting-on-client": "Waiting on Client",
  "waiting-on-kxd": "Waiting on KXD",
  blocked: "Blocked",
  completed: "Completed",
  cancelled: "Cancelled",
};

export type {
  TaskCategory,
  TaskPriority,
  TaskStatus,
  TaskListItem,
  WorkPortfolioData,
  ClientWorkBoardData,
  ClientWorkSummary,
} from "@/lib/client-tasks/types";
