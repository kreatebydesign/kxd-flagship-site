/**
 * Phase 28A — Schedule evidence from Executive Today brief context.
 * Facts only — no recommendations.
 */

import type {
  ExecutiveDayOrientation,
  ExecutiveTodayAttentionItem,
  ExecutiveTodayCapacity,
  ExecutiveTodayCurrentPosition,
  ExecutiveTodayDayFlowItem,
  ExecutiveTodayWorkRef,
} from "@/lib/executive-today/brief/types";
import type { EvidenceItem } from "../types";

export interface ScheduleEvidenceInput {
  orientation: ExecutiveDayOrientation;
  dayFlow: ExecutiveTodayDayFlowItem[];
  attention: ExecutiveTodayAttentionItem[];
  capacity: ExecutiveTodayCapacity;
  current: ExecutiveTodayCurrentPosition;
  overdueWork: ExecutiveTodayWorkRef[];
  plannedUnscheduled: ExecutiveTodayWorkRef[];
  observedEventCount: number;
  linkedCount: number;
  recoveryCount: number;
  conflictCount: number;
  observedAt: string;
  timeZone: string;
}

export function isScheduleMaterial(input: ScheduleEvidenceInput): boolean {
  return (
    input.observedEventCount > 0 ||
    input.linkedCount > 0 ||
    input.recoveryCount > 0 ||
    input.orientation === "compressed" ||
    input.orientation === "overloaded" ||
    input.orientation === "commitment_at_risk" ||
    input.orientation === "recovery_required" ||
    input.orientation === "fragmented"
  );
}

export function collectScheduleEvidence(input: ScheduleEvidenceInput): EvidenceItem[] {
  const evidence: EvidenceItem[] = [];

  const recovery = input.dayFlow.find((i) => i.kind === "recovery");
  if (recovery) {
    evidence.push({
      id: `evidence-schedule-recovery-${recovery.id}`,
      kind: "schedule_recovery",
      domain: "schedule",
      summary: recovery.detail ?? "Linked calendar commitment requires recovery",
      observedAt: input.observedAt,
      sourceRef: recovery.scheduleLinkId ? `schedule-link:${recovery.scheduleLinkId}` : null,
      payload: {
        flowItemId: recovery.id,
        title: recovery.title,
        detail: recovery.detail,
        workHref: recovery.workHref,
        scheduleLinkId: recovery.scheduleLinkId,
      },
    });
  }

  for (const item of input.attention.filter((a) => a.id.startsWith("conflict"))) {
    evidence.push({
      id: `evidence-schedule-conflict-${item.id}`,
      kind: "schedule_conflict",
      domain: "schedule",
      summary: item.evidence,
      observedAt: input.observedAt,
      payload: {
        attentionId: item.id,
        title: item.title,
        href: item.href,
        hrefLabel: item.hrefLabel,
      },
    });
  }

  if (input.conflictCount > 0) {
    evidence.push({
      id: "evidence-schedule-compression",
      kind: "schedule_compression",
      domain: "schedule",
      summary: `${input.conflictCount} overlapping commitment${input.conflictCount === 1 ? "" : "s"}`,
      observedAt: input.observedAt,
      payload: { conflictCount: input.conflictCount, orientation: input.orientation },
    });
  }

  const currentLinked = input.dayFlow.find(
    (i) => i.state === "current" && i.kind === "linked_work",
  );
  if (currentLinked) {
    evidence.push({
      id: `evidence-current-linked-${currentLinked.id}`,
      kind: "current_linked_work",
      domain: "schedule",
      summary: `Active linked work block: ${currentLinked.title}`,
      observedAt: input.observedAt,
      sourceRef: currentLinked.workId ? `work:${currentLinked.workId}` : null,
      payload: {
        flowItemId: currentLinked.id,
        title: currentLinked.title,
        workHref: currentLinked.workHref,
        clientName: currentLinked.clientName,
        minutesRemaining: input.current.minutesRemaining,
      },
    });
  }

  const currentExternal = input.dayFlow.find(
    (i) =>
      i.state === "current" &&
      (i.kind === "external" || i.kind === "all_day"),
  );
  if (currentExternal) {
    evidence.push({
      id: `evidence-current-external-${currentExternal.id}`,
      kind: "current_external_commitment",
      domain: "schedule",
      summary: `Active external commitment: ${currentExternal.title}`,
      observedAt: input.observedAt,
      payload: {
        flowItemId: currentExternal.id,
        title: currentExternal.title,
        calendarHtmlLink: currentExternal.calendarHtmlLink,
        minutesRemaining: input.current.minutesRemaining,
      },
    });
  }

  if (
    input.current.nextStartsInMinutes != null &&
    input.current.nextStartsInMinutes <= 20 &&
    input.current.nextCommitment
  ) {
    evidence.push({
      id: "evidence-upcoming-soon",
      kind: "upcoming_commitment_soon",
      domain: "schedule",
      summary: `Next commitment in ${input.current.nextStartsInMinutes} minutes: ${input.current.nextCommitment}`,
      observedAt: input.observedAt,
      payload: {
        nextCommitment: input.current.nextCommitment,
        nextStartsInMinutes: input.current.nextStartsInMinutes,
      },
    });
  }

  if (
    input.capacity.requestedWorkMinutes != null &&
    input.capacity.largestFocusBlockMinutes > 0 &&
    input.capacity.requestedWorkMinutes > input.capacity.openFocusMinutes
  ) {
    evidence.push({
      id: "evidence-capacity-overrun",
      kind: "capacity_overrun",
      domain: "capacity",
      summary: `${input.capacity.requestedWorkMinutes} minutes planned vs ${input.capacity.openFocusMinutes} minutes open focus`,
      observedAt: input.observedAt,
      payload: {
        requestedWorkMinutes: input.capacity.requestedWorkMinutes,
        openFocusMinutes: input.capacity.openFocusMinutes,
        capacitySummary: input.capacity.summary,
        moveCandidate: input.plannedUnscheduled[0] ?? null,
      },
    });
  }

  if (input.capacity.largestFocusBlockMinutes >= 45 && input.plannedUnscheduled[0]) {
    evidence.push({
      id: "evidence-focus-block",
      kind: "focus_block_available",
      domain: "capacity",
      summary: `${input.capacity.largestFocusBlockMinutes}-minute focus block available`,
      observedAt: input.observedAt,
      payload: {
        largestFocusBlockMinutes: input.capacity.largestFocusBlockMinutes,
        largestFocusBlockStart: input.capacity.largestFocusBlockStart,
        plannedWork: input.plannedUnscheduled[0],
        capacitySummary: input.capacity.summary,
      },
    });
  }

  if (input.current.inOpenGap && input.capacity.largestFocusBlockMinutes >= 30) {
    evidence.push({
      id: "evidence-open-gap",
      kind: "open_focus_gap",
      domain: "capacity",
      summary: `Open focus window with ${input.capacity.largestFocusBlockMinutes} minutes available`,
      observedAt: input.observedAt,
      payload: {
        largestFocusBlockMinutes: input.capacity.largestFocusBlockMinutes,
        capacitySummary: input.capacity.summary,
        plannedWork: input.plannedUnscheduled[0] ?? null,
      },
    });
  }

  for (const item of input.overdueWork) {
    evidence.push({
      id: `evidence-schedule-overdue-${item.workId}`,
      kind: "overdue_work",
      domain: "work",
      summary: `Overdue work competing with today: ${item.title}`,
      observedAt: input.observedAt,
      sourceRef: `work:${item.workId}`,
      payload: {
        workId: item.workId,
        title: item.title,
        href: item.href,
        clientName: item.clientName,
        estimatedEffortHours: item.estimatedEffortHours,
        largestFocusBlockMinutes: input.capacity.largestFocusBlockMinutes,
      },
    });
  }

  if (input.recoveryCount === 0 && input.conflictCount === 0 && isScheduleMaterial(input)) {
    evidence.push({
      id: "evidence-schedule-active",
      kind: "schedule_quiet",
      domain: "schedule",
      summary: "Schedule evidence present without elevated conflict or recovery",
      observedAt: input.observedAt,
      payload: {
        orientation: input.orientation,
        capacitySummary: input.capacity.summary,
      },
    });
  }

  return evidence;
}
