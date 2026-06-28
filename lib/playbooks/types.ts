/** Phase 7E — Playbooks & SOP Engine types */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PlaybookDoc = Record<string, any>;

export type PlaybookRunStatus =
  | "not-started"
  | "in-progress"
  | "blocked"
  | "completed"
  | "archived";

export type PlaybookAppliesTo =
  | "agency"
  | "client"
  | "project"
  | "website"
  | "campaign"
  | "motorsports"
  | "contractor"
  | "hospitality"
  | "professional-services"
  | "future-editions";

export type PlaybookCategory =
  | "launch"
  | "onboarding"
  | "seo"
  | "reporting"
  | "sales"
  | "audit"
  | "strategy"
  | "vertical"
  | "operations";

export type PlaybookAutomationTrigger =
  | "none"
  | "create_deliverable"
  | "create_request"
  | "generate_report"
  | "schedule_meeting"
  | "create_executive_note"
  | "run_website_audit"
  | "launch_client"
  | "generate_proposal"
  | "send_portal_invite";

export interface PlaybookStepTemplate {
  order: number;
  title: string;
  description?: string;
  instructions?: string;
  required?: boolean;
  estimatedMinutes?: number;
  linkedModule?: string;
  automationTrigger?: PlaybookAutomationTrigger;
}

export interface PlaybookTemplate {
  slug: string;
  name: string;
  description: string;
  category: PlaybookCategory;
  icon: string;
  color?: string;
  estimatedDuration: string;
  appliesTo: PlaybookAppliesTo[];
  tags?: string[];
  steps: PlaybookStepTemplate[];
}

export interface PlaybookListItem {
  id: number;
  slug: string;
  name: string;
  description: string;
  category: PlaybookCategory;
  icon: string;
  estimatedDuration: string;
  stepCount: number;
  active: boolean;
  href: string;
  launchHref: string;
}

export interface PlaybookRunListItem {
  id: number;
  playbookId: number;
  playbookName: string;
  playbookSlug: string;
  clientId: number;
  clientName: string;
  status: PlaybookRunStatus;
  percentComplete: number;
  currentStepTitle?: string;
  startedAt?: string | null;
  completedAt?: string | null;
  href: string;
}

export interface PlaybookDashboardData {
  playbooks: PlaybookListItem[];
  activeRuns: PlaybookRunListItem[];
  completedRuns: PlaybookRunListItem[];
  blockedRuns: PlaybookRunListItem[];
  byCategory: Record<string, PlaybookListItem[]>;
  stats: {
    templateCount: number;
    activeRunCount: number;
    completedRunCount: number;
    blockedRunCount: number;
  };
  generatedAt: string;
}

export interface PlaybookRunStepView {
  id: number;
  order: number;
  title: string;
  description?: string;
  instructions?: string;
  required: boolean;
  estimatedMinutes?: number;
  linkedModule?: string;
  automationTrigger?: string;
  state: "pending" | "completed" | "skipped" | "current";
}

export interface PlaybookRunDetail {
  id: number;
  playbookId: number;
  playbookName: string;
  playbookSlug: string;
  clientId: number;
  clientName: string;
  projectId?: number | null;
  status: PlaybookRunStatus;
  percentComplete: number;
  startedAt?: string | null;
  completedAt?: string | null;
  durationMinutes?: number | null;
  steps: PlaybookRunStepView[];
  currentStepId?: number | null;
}

export interface ClientPlaybookSummary {
  active: PlaybookRunListItem[];
  completed: PlaybookRunListItem[];
  nextStep?: { runId: number; stepTitle: string; href: string } | null;
}

export interface PlaybookOperationsSnapshot {
  activeCount: number;
  blockedCount: number;
  completedThisMonth: number;
  completionRate: number;
  bottleneckPlaybooks: Array<{ slug: string; name: string; blockedCount: number }>;
}

export interface LaunchPlaybookInput {
  playbookSlug: string;
  clientId: number;
  projectId?: number;
  startedByUserId?: number;
}

export interface LaunchPlaybookResult {
  success: boolean;
  runId?: number;
  href?: string;
  error?: string;
}

/* ── Future architecture (interfaces only) ──────────────────────────── */

export interface PlaybookBranchRule {
  stepId: number;
  condition: string;
  targetStepId: number;
}

export interface PlaybookApprovalGate {
  stepId: number;
  approverRole: string;
  status: "pending" | "approved" | "rejected";
}

export interface PlaybookParallelGroup {
  stepIds: number[];
  requireAll: boolean;
}

export interface PlaybookRecurringSchedule {
  playbookId: number;
  interval: "weekly" | "monthly" | "quarterly" | "annual";
  clientId?: number;
}

export interface PlaybookAiSopDraft {
  playbookId: number;
  prompt: string;
  status: "draft" | "review" | "published";
}

export const PLAYBOOK_RUN_STATUS_LABELS: Record<PlaybookRunStatus, string> = {
  "not-started": "Not Started",
  "in-progress": "In Progress",
  blocked: "Blocked",
  completed: "Completed",
  archived: "Archived",
};

export const PLAYBOOK_CATEGORY_LABELS: Record<PlaybookCategory, string> = {
  launch: "Launch",
  onboarding: "Onboarding",
  seo: "SEO",
  reporting: "Reporting",
  sales: "Sales",
  audit: "Audit",
  strategy: "Strategy",
  vertical: "Vertical",
  operations: "Operations",
};
