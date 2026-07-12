/**
 * Phase 27B — Executive Today brief domain types.
 * Deterministic composition shapes — no Google SDK, no LLM dependency.
 */

import type { ObservedCalendarEvent } from "@/lib/google/calendar/types";
import type {
  ScheduleExternalChangeClass,
  ScheduleRecoveryState,
  ScheduleSyncStatus,
} from "@/lib/scheduling/types";

export type ExecutiveDayOrientation =
  | "clear"
  | "focused"
  | "balanced"
  | "compressed"
  | "fragmented"
  | "overloaded"
  | "recovery_required"
  | "commitment_at_risk";

export type DayFlowItemKind =
  | "linked_work"
  | "external"
  | "focus_gap"
  | "all_day"
  | "recovery";

export type DayFlowItemState =
  | "past"
  | "current"
  | "next"
  | "upcoming"
  | "attention";

export type CommitmentCorrelation =
  | "linked_healthy"
  | "linked_drift"
  | "linked_recovery"
  | "external_unlinked"
  | "kxd_missing_from_calendar"
  | "duplicate_anomaly";

export type CommitmentRiskLevel =
  | "healthy"
  | "watch"
  | "at_risk"
  | "unrealistic"
  | "blocked"
  | "waiting"
  | "needs_reschedule"
  | "needs_decision";

export type CapacityConfidence = "known" | "partial" | "unknown";

export interface ExecutiveDayBounds {
  timeZone: string;
  dayStartIso: string;
  dayEndIso: string;
  workStartIso: string;
  workEndIso: string;
  nowIso: string;
  dateKey: string;
}

export interface ExecutiveTodayCapacity {
  remainingWorkMinutes: number;
  committedCalendarMinutes: number;
  scheduledWorkMinutes: number;
  openFocusMinutes: number;
  fragmentedMinutes: number;
  largestFocusBlockMinutes: number;
  largestFocusBlockStart: string | null;
  largestFocusBlockEnd: string | null;
  requestedWorkMinutes: number | null;
  capacityConfidence: CapacityConfidence;
  summary: string;
}

export interface ExecutiveTodayDayFlowItem {
  id: string;
  kind: DayFlowItemKind;
  state: DayFlowItemState;
  startIso: string | null;
  endIso: string | null;
  durationMinutes: number | null;
  allDay: boolean;
  title: string;
  detail: string | null;
  workId: number | null;
  workHref: string | null;
  clientName: string | null;
  scheduleLinkId: number | null;
  calendarHtmlLink: string | null;
  correlation: CommitmentCorrelation | null;
  syncStatus: ScheduleSyncStatus | null;
  recoveryState: ScheduleRecoveryState | null;
  externalChangeClass: ScheduleExternalChangeClass | null;
  risk: CommitmentRiskLevel | null;
  isPrivate: boolean;
}

export interface ExecutiveTodayAttentionItem {
  id: string;
  title: string;
  evidence: string;
  href: string | null;
  hrefLabel: string | null;
  severity: "watch" | "risk" | "recovery";
}

export interface ExecutiveTodayRecommendation {
  action: string;
  reason: string;
  timeSensitivity: string;
  href: string | null;
  hrefLabel: string | null;
  evidence: string[];
}

export interface ExecutiveTodayCurrentPosition {
  happeningNow: string | null;
  happeningNowKind: DayFlowItemKind | null;
  minutesRemaining: number | null;
  nextCommitment: string | null;
  nextStartsInMinutes: number | null;
  inOpenGap: boolean;
  behindPlan: boolean;
  summary: string;
}

export interface ExecutiveTodayFreshness {
  calendarObservedAt: string | null;
  calendarAvailable: boolean;
  calendarFailureMessage: string | null;
  label: string;
}

export interface ExecutiveTodayClosing {
  successLooksLike: string;
}

export interface ExecutiveTodayBrief {
  orientation: ExecutiveDayOrientation;
  orientationSummary: string;
  bounds: ExecutiveDayBounds;
  current: ExecutiveTodayCurrentPosition;
  recommendation: ExecutiveTodayRecommendation;
  dayFlow: ExecutiveTodayDayFlowItem[];
  attention: ExecutiveTodayAttentionItem[];
  capacity: ExecutiveTodayCapacity;
  closing: ExecutiveTodayClosing;
  freshness: ExecutiveTodayFreshness;
  /** Internal evidence for tests — not for UI decoration. */
  evidence: {
    observedEventCount: number;
    linkedCount: number;
    externalCount: number;
    recoveryCount: number;
    conflictCount: number;
    workTitleAuthoritative: true;
  };
}

/** Inputs for pure composition (testable without network). */
export interface ExecutiveTodayComposeInput {
  nowIso: string;
  timeZone: string;
  workStartHour: number;
  workEndHour: number;
  calendarAvailable: boolean;
  calendarObservedAt: string | null;
  calendarFailureMessage: string | null;
  observedEvents: ObservedCalendarEvent[];
  linkedSchedules: ExecutiveTodayLinkedSchedule[];
  workItems: ExecutiveTodayWorkRef[];
  reviewWaitingCount: number;
}

export interface ExecutiveTodayLinkedSchedule {
  linkId: number;
  workId: number;
  workTitle: string;
  workHref: string;
  clientName: string | null;
  proposedStart: string;
  proposedEnd: string;
  timezone: string;
  googleEventId: string | null;
  googleCalendarId: string | null;
  googleEventHtmlLink: string | null;
  syncStatus: ScheduleSyncStatus;
  recoveryState: ScheduleRecoveryState;
  externalChangeClass: ScheduleExternalChangeClass;
  lastSyncAt: string | null;
  estimatedEffortHours: number | null;
  workPriority: string | null;
  workDueDate: string | null;
  workStatus: string | null;
}

export interface ExecutiveTodayWorkRef {
  workId: number;
  title: string;
  href: string;
  clientName: string | null;
  priority: string;
  status: string;
  dueDate: string | null;
  plannedForDate: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  schedulingStatus: string;
  estimatedEffortHours: number | null;
  overdue: boolean;
}
