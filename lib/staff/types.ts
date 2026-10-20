/**
 * Shared Core — role-driven internal staff experience.
 * Heather is the first learner; the model is reusable for every future teammate.
 */

import type { StaffDeliverableView } from "@/lib/staff/work-deliverables";
import type { WorkActivityEntry, WorkListItem } from "@/lib/work/types";
import type { StaffMyWorkBoardColumnId } from "./my-work-board";

export type StaffRoleId =
  | "operations_coordinator"
  | "executive_operations_coordinator"
  | "operations_manager"
  | "business_development_specialist"
  | "none";

/** Deny-by-default capability grants for restricted staff. */
export type StaffCapability =
  | "staff.home"
  | "staff.assigned-work.read"
  | "staff.assigned-work.update"
  | "staff.draft.prepare"
  | "staff.draft.submit-for-approval"
  | "staff.notes.internal"
  | "staff.inbox.triage"
  | "staff.scheduling.propose"
  | "staff.training"
  | "staff.help.request"
  | "staff.guidance"
  | "staff.client-context.limited"
  | "staff.onboarding.assist"
  | "staff.billing.verify"
  | "staff.documents.read"
  | "staff.documents.acknowledge"
  | "staff.documents.sign"
  | "staff.sales.read"
  | "staff.sales.manage"
  | "admin.staff-documents.manage"
  | "admin.staff-documents.countersign"
  | "admin.oversight"
  | "admin.preview-staff"
  | "admin.full-operations";

export type StaffPlanBucket =
  | "start-here"
  | "then"
  | "waiting-on-matt"
  | "coming-next"
  | "can-wait"
  | "training";

export type StaffPlanItemKind =
  | "work"
  | "training"
  | "approval"
  | "help"
  | "empty"
  | "practice"
  | "responsibility";

/** Clear plan states shown on each daily-plan row. */
export type StaffPlanState =
  | "ready-to-begin"
  | "continue"
  | "needs-information"
  | "prepare-for-matt"
  | "waiting-on-matt"
  | "training-required"
  | "scheduled-later"
  | "complete";

export interface StaffActor {
  userId: number;
  email: string;
  displayName: string;
  role: "admin" | "editor" | string;
  staffRole: StaffRoleId;
  onboardingCompletedAt: string | null;
}

export interface StaffPlanItem {
  id: string;
  order: number;
  bucket: StaffPlanBucket;
  kind: StaffPlanItemKind;
  title: string;
  clientOrCategory: string;
  whyItMatters: string;
  expectedOutcome: string;
  estimatedMinutes: number | null;
  dueState: string;
  currentStatus: string;
  planState: StaffPlanState;
  canAct: boolean;
  canCompleteIndependently: boolean;
  requiresMattApproval: boolean;
  missingInformation: string[];
  safestNextAction: string;
  href: string | null;
  workId: number | null;
  priorityBand: number | null;
  evidence: string[];
  /** @deprecated prefer whyItMatters — kept for older callers */
  expectedResult?: string;
}

export interface StaffPrimaryAction {
  label: string;
  href: string;
  reason: string;
  evidence: string[];
  title?: string;
  clientOrCategory?: string;
  expectedOutcome?: string;
  estimatedMinutes?: number | null;
  permissionStatus?: string;
  planState?: StaffPlanState;
  workId?: number | null;
}

export interface StaffMorningOverview {
  greeting: string;
  dateLabel: string;
  dateKey: string;
  summary: string;
  actionableCount: number;
  waitingOnMattCount: number;
  estimatedWorkloadMinutes: number | null;
  trainingPercent: number;
  trainingLevelLabel: string;
  caughtUp: boolean;
}

export interface StaffWaitingOnMattItem {
  id: string;
  title: string;
  preparedSummary: string;
  decisionNeeded: string;
  submittedAt: string | null;
  followUpAppropriate: boolean;
  href: string | null;
  workId: number | null;
}

export interface StaffWrapUpData {
  dateKey: string;
  dateLabel: string;
  completedToday: Array<{ title: string; workId: number | null }>;
  preparedForMatt: Array<{ title: string; workId: number | null; submittedAt: string | null }>;
  underway: Array<{ title: string; workId: number | null; status: string }>;
  blockers: Array<{ title: string; workId: number | null; detail: string }>;
  movingToTomorrow: Array<{ title: string; workId: number | null; reason: string }>;
  trainingCompletedToday: boolean;
  optionalNoteForMatt: string | null;
  savedNote: string | null;
}

export interface StaffGuidancePrompt {
  id: string;
  label: string;
  prompt: string;
}

export type StaffHelpStatus = "open" | "answered" | "resolved";

export interface StaffHelpRequestView {
  id: number;
  question: string;
  pagePath: string;
  status: StaffHelpStatus;
  intelligenceResponse: string | null;
  responseSource: "none" | "deterministic" | "ai-assisted" | "matt";
  confidence: "high" | "medium" | "low" | null;
  requiresMatt: boolean;
  mattResponse: string | null;
  workId: number | null;
  workTitle: string | null;
  clientLabel: string | null;
  createdAt: string;
  answeredAt: string | null;
  href: string | null;
}

export interface StaffDocumentAttentionItem {
  id: number;
  title: string;
  href: string;
  assignedAt: string;
  kind: import("@/lib/staff-documents/types").StaffDocumentKind;
  signingMode: import("@/lib/staff-documents/types").StaffDocumentSigningMode;
  actionLabel: string;
}

export interface StaffTodayData {
  actor: StaffActor;
  greeting: string;
  roleTitle: string;
  trainingLevelLabel: string;
  trainingPercent: number;
  todaySummary: string;
  hasUrgentWork: boolean;
  primaryAction: StaffPrimaryAction;
  plan: StaffPlanItem[];
  morning: StaffMorningOverview;
  waitingOnMatt: StaffWaitingOnMattItem[];
  comingNext: StaffPlanItem[];
  wrapUpHref: string;
  guidancePrompts: StaffGuidancePrompt[];
  helpRequests: StaffHelpRequestView[];
  documentAttention: StaffDocumentAttentionItem[];
  emptyState: {
    title: string;
    body: string;
    actionLabel: string;
    actionHref: string;
  } | null;
  permissions: {
    canAct: boolean;
    isPreview: boolean;
    previewBanner: string | null;
  };
}

export interface StaffMyWorkData {
  viewer: Pick<StaffActor, "userId" | "staffRole">;
  items: WorkListItem[];
  openItems: WorkListItem[];
  completedItems: WorkListItem[];
  board: Record<StaffMyWorkBoardColumnId, WorkListItem[]>;
  groups: {
    key: string;
    label: string;
    kind: "client" | "internal";
    items: WorkListItem[];
  }[];
  columns: { id: StaffMyWorkBoardColumnId; label: string }[];
  counts: {
    open: number;
    completed: number;
    todo: number;
    inProgress: number;
    blocked: number;
    inReview: number;
  };
  includeCompleted: boolean;
  generatedAt: string;
}

export interface StaffGuidedWorkData {
  workId: number;
  title: string;
  summary: string | null;
  description: string | null;
  acceptanceCriteria: string | null;
  /** Operator / studio notes — read-only for staff. */
  studioNotes: string | null;
  /** Staff-owned progress section (persisted after [Staff progress] marker). */
  staffProgressNotes: string | null;
  /** Persisted checklist state for the current assignee. */
  checklistChecked: Record<string, boolean>;
  /** Operator-defined deliverables with assignee completion state. */
  deliverables: StaffDeliverableView[];
  deliverableProgress: {
    total: number;
    completed: number;
    requiredTotal: number;
    requiredCompleted: number;
    allRequiredComplete: boolean;
  };
  instructionBlocks: string[];
  activityHistory: WorkActivityEntry[];
  status: string;
  priority: string | null;
  dueDate: string | null;
  clientLabel: string | null;
  whyItMatters: string;
  whatKxdKnows: string[];
  whatToProduce: string[];
  steps: Array<{ title: string; detail: string }>;
  examples: string[];
  permissionBoundary: string;
  checklist: Array<{ id: string; label: string; required: boolean }>;
  canCompleteIndependently: boolean;
  requiresMattApproval: boolean;
  hrefBack: string;
  hrefMyWork: string;
  helpRequests: StaffHelpRequestView[];
}

export interface StaffOversightMember {
  userId: number;
  displayName: string;
  email: string;
  staffRole: StaffRoleId;
  roleTitle: string;
  trainingPercent: number;
  onboardingCompleted: boolean;
  assignedOpenCount: number;
  waitingOnMattCount: number;
  helpRequestedCount: number;
  recentCompletedCount: number;
  blockedCount: number;
  startHereLabel: string | null;
  planActionableCount: number;
}

export interface StaffOversightData {
  members: StaffOversightMember[];
  draftsAwaitingApproval: Array<{
    workId: number;
    title: string;
    assigneeLabel: string;
    href: string;
  }>;
  helpRequests: Array<{
    id: string;
    staffLabel: string;
    summary: string;
    createdAt: string;
    href: string | null;
    status: "open" | "answered" | "resolved";
    workTitle: string | null;
    mattResponse: string | null;
    helpId: number;
    intelligenceResponse: string | null;
    responseSource: string;
    confidence: string | null;
    requiresMatt: boolean;
  }>;
  responsibilities: Array<{
    id: number;
    title: string;
    ownerLabel: string;
    cadence: string;
    active: boolean;
    requiresApproval: boolean;
  }>;
  wrapUps: Array<{
    id: number;
    staffLabel: string;
    dateKey: string;
    noteForMatt: string | null;
    createdAt: string;
  }>;
}

export interface StaffPreviewSession {
  staffUserId: number;
  staffLabel: string;
  adminUserId: number;
  startedAt: string;
  expiresAt: string;
}

export type StaffResponsibilityCadence =
  | "daily"
  | "weekdays"
  | "weekly"
  | "monthly";

export interface StaffResponsibilityTemplate {
  id: number;
  title: string;
  purpose: string;
  expectedOutcome: string;
  estimatedMinutes: number | null;
  ownerUserId: number | null;
  cadence: StaffResponsibilityCadence;
  /** 0=Sun … 6=Sat when cadence is weekly; empty = any weekday for weekdays. */
  weekdayMask: number[];
  scope: "internal" | "client";
  clientId: number | null;
  requiresApproval: boolean;
  active: boolean;
  libraryKey: string | null;
}
