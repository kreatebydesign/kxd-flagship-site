/**
 * Phase 27B — Deterministic Executive Today brief composition.
 * Evidence first. One primary recommendation. No Google SDK. No Activity publish.
 */

import type { ObservedCalendarEvent } from "@/lib/google/calendar/types";
import { correlateDayCommitments, type CorrelatedCommitment } from "./correlate";
import {
  buildExecutiveDayBounds,
  formatClock,
  gapMinutes,
  largestGap,
  minutesBetween,
  normalizeObservedInterval,
  overlaps,
  subtractBusy,
  toIso,
  totalMinutes,
  type TimeInterval,
} from "./time-model";
import type {
  CommitmentRiskLevel,
  DayFlowItemKind,
  DayFlowItemState,
  ExecutiveDayOrientation,
  ExecutiveTodayAttentionItem,
  ExecutiveTodayBrief,
  ExecutiveTodayCapacity,
  ExecutiveTodayComposeInput,
  ExecutiveTodayCurrentPosition,
  ExecutiveTodayDayFlowItem,
  ExecutiveTodayRecommendation,
} from "./types";

const TRANSITION_BUFFER_MINUTES = 10;
const BACK_TO_BACK_MINUTES = 5;

function displayTitle(
  event: ObservedCalendarEvent | null,
  linkTitle: string | null,
): string {
  if (event?.isPrivate) return "Private commitment";
  if (linkTitle) return linkTitle;
  if (event?.title) return event.title;
  return "Calendar commitment";
}

function riskForCorrelation(
  c: CorrelatedCommitment,
  capacityTight: boolean,
): CommitmentRiskLevel {
  if (c.correlation === "linked_recovery" || c.correlation === "kxd_missing_from_calendar") {
    return "needs_reschedule";
  }
  if (c.correlation === "linked_drift") return "watch";
  if (c.link?.workStatus === "blocked") return "blocked";
  if (c.link?.workStatus === "waiting-on-client") return "waiting";
  if (capacityTight) return "at_risk";
  return "healthy";
}

function classifyOrientation(input: {
  conflictCount: number;
  recoveryCount: number;
  openFocusMinutes: number;
  committedMinutes: number;
  remainingWorkMinutes: number;
  gapCount: number;
  plannedExceedsCapacity: boolean;
  atRiskCount: number;
}): ExecutiveDayOrientation {
  if (input.recoveryCount > 0) return "recovery_required";
  if (input.atRiskCount > 0 || input.plannedExceedsCapacity) return "commitment_at_risk";
  if (input.conflictCount > 0) return "compressed";
  if (
    input.committedMinutes > input.remainingWorkMinutes * 0.85 &&
    input.openFocusMinutes < 45
  ) {
    return "overloaded";
  }
  if (input.gapCount >= 4 && input.openFocusMinutes > 0) return "fragmented";
  if (input.openFocusMinutes >= 90 && input.committedMinutes < 180) return "focused";
  if (input.committedMinutes === 0 && input.openFocusMinutes > 0) return "clear";
  return "balanced";
}

function buildDayFlow(input: {
  correlations: CorrelatedCommitment[];
  bounds: ReturnType<typeof buildExecutiveDayBounds>;
  nowMs: number;
  focusGaps: TimeInterval[];
  largestFocus: TimeInterval | null;
}): ExecutiveTodayDayFlowItem[] {
  const { bounds, nowMs } = input;
  const items: ExecutiveTodayDayFlowItem[] = [];

  for (const c of input.correlations) {
    const event = c.event;
    const link = c.link;
    const interval = event
      ? normalizeObservedInterval(
          event.start,
          event.end,
          bounds,
          event.allDay,
        )
      : link
        ? normalizeObservedInterval(
            link.proposedStart,
            link.proposedEnd,
            bounds,
            false,
          )
        : null;

    if (!interval && c.correlation !== "linked_recovery" && c.correlation !== "kxd_missing_from_calendar") {
      continue;
    }

    const startMs = interval?.startMs ?? (link ? Date.parse(link.proposedStart) : nowMs);
    const endMs = interval?.endMs ?? (link ? Date.parse(link.proposedEnd) : nowMs);
    const allDay = Boolean(event?.allDay);
    const isCurrent = !allDay && startMs <= nowMs && nowMs < endMs;
    const isPast = !allDay && endMs <= nowMs;

    let kind: DayFlowItemKind = "external";
    if (c.correlation === "linked_recovery" || c.correlation === "kxd_missing_from_calendar") {
      kind = "recovery";
    } else if (link) {
      kind = "linked_work";
    } else if (allDay) {
      kind = "all_day";
    }

    const title = displayTitle(event, link?.workTitle ?? null);
    const detailParts: string[] = [];
    if (link?.clientName) detailParts.push(link.clientName);
    if (c.correlation === "linked_drift") detailParts.push("External change detected");
    if (c.correlation === "linked_recovery") detailParts.push("Calendar recovery required");
    if (c.correlation === "kxd_missing_from_calendar") {
      detailParts.push("Not confirmed on calendar");
    }
    if (c.correlation === "external_unlinked" && !event?.isPrivate) {
      detailParts.push("External commitment");
    }

    items.push({
      id: `flow-${c.eventId ?? link?.linkId ?? title}-${startMs}`,
      kind,
      state: isCurrent ? "current" : isPast ? "past" : "upcoming",
      startIso: interval ? toIso(startMs) : link?.proposedStart ?? null,
      endIso: interval ? toIso(endMs) : link?.proposedEnd ?? null,
      durationMinutes: interval
        ? minutesBetween(startMs, endMs)
        : link
          ? minutesBetween(Date.parse(link.proposedStart), Date.parse(link.proposedEnd))
          : null,
      allDay,
      title,
      detail: detailParts.join(" · ") || null,
      workId: link?.workId ?? null,
      workHref: link?.workHref ?? null,
      clientName: link?.clientName ?? null,
      scheduleLinkId: link?.linkId ?? null,
      calendarHtmlLink: event?.htmlLink ?? link?.googleEventHtmlLink ?? null,
      correlation: c.correlation,
      syncStatus: link?.syncStatus ?? null,
      recoveryState: link?.recoveryState ?? null,
      externalChangeClass: link?.externalChangeClass ?? null,
      risk: riskForCorrelation(c, false),
      isPrivate: Boolean(event?.isPrivate),
    });
  }

  // Mark next upcoming timed item
  const upcoming = items
    .filter((i) => i.state === "upcoming" && !i.allDay && i.startIso)
    .sort(
      (a, b) =>
        Date.parse(a.startIso!) - Date.parse(b.startIso!),
    );
  if (upcoming[0]) {
    upcoming[0] = { ...upcoming[0], state: "next" };
    const idx = items.findIndex((i) => i.id === upcoming[0].id);
    if (idx >= 0) items[idx] = upcoming[0];
  }

  // Intentional focus gaps (only largest + meaningful gaps ≥ 30m remaining today)
  for (const gap of input.focusGaps) {
    if (gap.endMs <= nowMs) continue;
    const startMs = Math.max(gap.startMs, nowMs);
    const mins = minutesBetween(startMs, gap.endMs);
    if (mins < 30) continue;
    const isLargest =
      input.largestFocus &&
      gap.startMs === input.largestFocus.startMs &&
      gap.endMs === input.largestFocus.endMs;
    items.push({
      id: `gap-${startMs}`,
      kind: "focus_gap",
      state: startMs <= nowMs && nowMs < gap.endMs ? "current" : "upcoming",
      startIso: toIso(startMs),
      endIso: toIso(gap.endMs),
      durationMinutes: mins,
      allDay: false,
      title: isLargest ? "Open focus block" : "Open time",
      detail: `${mins} minutes available`,
      workId: null,
      workHref: null,
      clientName: null,
      scheduleLinkId: null,
      calendarHtmlLink: null,
      correlation: null,
      syncStatus: null,
      recoveryState: null,
      externalChangeClass: null,
      risk: null,
      isPrivate: false,
    });
  }

  return items.sort((a, b) => {
    const am = a.startIso ? Date.parse(a.startIso) : Number.MAX_SAFE_INTEGER;
    const bm = b.startIso ? Date.parse(b.startIso) : Number.MAX_SAFE_INTEGER;
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
    return am - bm;
  });
}

function buildCapacity(input: {
  remainingWindow: TimeInterval;
  busy: TimeInterval[];
  scheduledWorkMinutes: number;
  requestedWorkMinutes: number | null;
  hasUnknownDurations: boolean;
}): ExecutiveTodayCapacity {
  const gaps = subtractBusy(input.remainingWindow, input.busy);
  const openFocusMinutes = totalMinutes(gaps);
  const largest = largestGap(gaps);
  const committed = totalMinutes(
    input.busy.filter(
      (b) =>
        b.endMs > input.remainingWindow.startMs &&
        b.startMs < input.remainingWindow.endMs,
    ),
  );
  const remainingWorkMinutes = minutesBetween(
    input.remainingWindow.startMs,
    input.remainingWindow.endMs,
  );
  const fragmentedMinutes = gaps
    .filter((g) => minutesBetween(g.startMs, g.endMs) < 30)
    .reduce((s, g) => s + minutesBetween(g.startMs, g.endMs), 0);

  const confidence = input.hasUnknownDurations
    ? input.requestedWorkMinutes != null
      ? "partial"
      : "unknown"
    : "known";

  let summary = `${openFocusMinutes} minutes of open focus remain`;
  if (largest) {
    summary += `; largest block is ${minutesBetween(largest.startMs, largest.endMs)} minutes`;
  }
  if (input.requestedWorkMinutes != null) {
    summary += `. About ${input.requestedWorkMinutes} minutes of planned work is on the board`;
  } else if (input.hasUnknownDurations) {
    summary += ". Some planned work has no duration estimate";
  }

  return {
    remainingWorkMinutes,
    committedCalendarMinutes: committed,
    scheduledWorkMinutes: input.scheduledWorkMinutes,
    openFocusMinutes,
    fragmentedMinutes,
    largestFocusBlockMinutes: largest
      ? minutesBetween(largest.startMs, largest.endMs)
      : 0,
    largestFocusBlockStart: largest ? toIso(largest.startMs) : null,
    largestFocusBlockEnd: largest ? toIso(largest.endMs) : null,
    requestedWorkMinutes: input.requestedWorkMinutes,
    capacityConfidence: confidence,
    summary,
  };
}

function buildRecommendation(input: {
  orientation: ExecutiveDayOrientation;
  dayFlow: ExecutiveTodayDayFlowItem[];
  attention: ExecutiveTodayAttentionItem[];
  capacity: ExecutiveTodayCapacity;
  current: ExecutiveTodayCurrentPosition;
  overdueWork: ExecutiveTodayComposeInput["workItems"];
  plannedUnscheduled: ExecutiveTodayComposeInput["workItems"];
  timeZone: string;
}): ExecutiveTodayRecommendation {
  const recovery = input.dayFlow.find((i) => i.kind === "recovery");
  if (recovery) {
    return {
      action: "Resolve calendar recovery before treating the day as confirmed",
      reason: recovery.detail || "A linked calendar commitment is missing or cancelled.",
      timeSensitivity: "Before relying on today’s schedule",
      href: recovery.workHref ?? recovery.scheduleLinkId
        ? `/admin/work/scheduling`
        : "/admin/work/scheduling",
      hrefLabel: recovery.workHref ? "Open Work" : "Open Scheduling",
      evidence: [
        recovery.title,
        recovery.detail ?? "Recovery required",
        "KXD OS did not recreate the event",
      ],
    };
  }

  const conflict = input.attention.find((a) => a.id.startsWith("conflict"));
  if (conflict) {
    return {
      action: "Decide which overlapping commitment to protect",
      reason: conflict.evidence,
      timeSensitivity: "Now — the day plan is inconsistent",
      href: conflict.href,
      hrefLabel: conflict.hrefLabel,
      evidence: [conflict.title, conflict.evidence],
    };
  }

  const currentItem = input.dayFlow.find((i) => i.state === "current" && i.kind !== "focus_gap");
  if (currentItem && currentItem.kind === "linked_work" && currentItem.workHref) {
    return {
      action: `Continue ${currentItem.title}`,
      reason: "This Work block is active now.",
      timeSensitivity:
        input.current.minutesRemaining != null
          ? `${input.current.minutesRemaining} minutes remaining`
          : "In progress",
      href: currentItem.workHref,
      hrefLabel: "Open Work",
      evidence: [
        "Current linked schedule block",
        currentItem.clientName ?? "Internal",
      ],
    };
  }

  if (
    currentItem &&
    (currentItem.kind === "external" || currentItem.kind === "all_day")
  ) {
    return {
      action: "Stay with the current commitment",
      reason: "An external calendar block is active. Protect the transition after it ends.",
      timeSensitivity:
        input.current.minutesRemaining != null
          ? `${input.current.minutesRemaining} minutes remaining`
          : "In progress",
      href: currentItem.calendarHtmlLink,
      hrefLabel: currentItem.calendarHtmlLink ? "Open Calendar" : null,
      evidence: [currentItem.title, "External occupancy"],
    };
  }

  if (
    input.current.nextStartsInMinutes != null &&
    input.current.nextStartsInMinutes <= 20 &&
    input.current.nextCommitment
  ) {
    return {
      action: `Prepare for ${input.current.nextCommitment}`,
      reason: "The next commitment begins soon — avoid starting deep work that cannot finish.",
      timeSensitivity: `Starts in ${input.current.nextStartsInMinutes} minutes`,
      href: null,
      hrefLabel: null,
      evidence: [
        input.current.nextCommitment,
        `${input.current.nextStartsInMinutes} minutes until start`,
      ],
    };
  }

  if (
    input.capacity.requestedWorkMinutes != null &&
    input.capacity.largestFocusBlockMinutes > 0 &&
    input.capacity.requestedWorkMinutes > input.capacity.openFocusMinutes
  ) {
    const move = input.plannedUnscheduled[0];
    return {
      action: move
        ? `Move “${move.title}” out of today`
        : "Reduce today’s planned load",
      reason: `${input.capacity.requestedWorkMinutes} minutes of planned work exceed ${input.capacity.openFocusMinutes} minutes of open focus.`,
      timeSensitivity: "Before the day compresses further",
      href: move?.href ?? "/admin/work",
      hrefLabel: move ? "Open Work" : "Open Work Engine",
      evidence: [
        input.capacity.summary,
        "Planned work exceeds remaining capacity",
      ],
    };
  }

  if (input.overdueWork[0]) {
    const item = input.overdueWork[0];
    if (
      input.capacity.largestFocusBlockMinutes >= 45 ||
      item.estimatedEffortHours == null
    ) {
      return {
        action: `Begin ${item.title}`,
        reason: "Overdue Work is competing with today and a usable focus block remains.",
        timeSensitivity: "Use the next open focus block",
        href: item.href,
        hrefLabel: "Open Work",
        evidence: [
          "Overdue",
          item.clientName ?? "Internal",
          input.capacity.largestFocusBlockMinutes > 0
            ? `Largest focus block: ${input.capacity.largestFocusBlockMinutes} minutes`
            : "Duration unknown — no false precision",
        ],
      };
    }
  }

  if (
    input.capacity.largestFocusBlockMinutes >= 45 &&
    input.plannedUnscheduled[0]
  ) {
    const item = input.plannedUnscheduled[0];
    return {
      action: `Protect the next focus block for ${item.title}`,
      reason: `A ${input.capacity.largestFocusBlockMinutes}-minute open block is the best available window.`,
      timeSensitivity: input.capacity.largestFocusBlockStart
        ? `From ${formatClock(input.capacity.largestFocusBlockStart, input.timeZone)}`
        : "Next open block",
      href: item.href,
      hrefLabel: "Open Work",
      evidence: [
        input.capacity.summary,
        item.clientName ?? "Internal priority",
      ],
    };
  }

  if (input.current.inOpenGap && input.capacity.largestFocusBlockMinutes >= 30) {
    return {
      action: "Leave this gap intentionally open — or begin one clear Work item",
      reason: "You are in an open focus window with no active commitment.",
      timeSensitivity: `${input.capacity.largestFocusBlockMinutes} minutes available`,
      href: input.plannedUnscheduled[0]?.href ?? "/admin/work",
      hrefLabel: input.plannedUnscheduled[0] ? "Open Work" : "Open Work Engine",
      evidence: [input.capacity.summary],
    };
  }

  return {
    action: "Continue planned work without forcing the calendar",
    reason: "No elevated schedule conflict or recovery issue requires a decision right now.",
    timeSensitivity: "Steady pace",
    href: "/admin/work",
    hrefLabel: "Open Work Engine",
    evidence: [input.orientation, input.capacity.summary],
  };
}

export function composeExecutiveTodayBrief(
  input: ExecutiveTodayComposeInput,
): ExecutiveTodayBrief {
  const bounds = buildExecutiveDayBounds({
    nowIso: input.nowIso,
    timeZone: input.timeZone,
    workStartHour: input.workStartHour,
    workEndHour: input.workEndHour,
  });
  const nowMs = Date.parse(bounds.nowIso);
  const workEndMs = Date.parse(bounds.workEndIso);
  const workStartMs = Date.parse(bounds.workStartIso);
  const remainingStart = Math.max(nowMs, workStartMs);
  const remainingWindow: TimeInterval = {
    startMs: remainingStart,
    endMs: Math.max(remainingStart, workEndMs),
  };

  const correlations = correlateDayCommitments({
    events: input.observedEvents,
    links: input.linkedSchedules,
  });

  const busy: TimeInterval[] = [];
  for (const c of correlations) {
    if (c.correlation === "linked_recovery" || c.correlation === "kxd_missing_from_calendar") {
      continue;
    }
    const event = c.event;
    const link = c.link;
    const interval = event
      ? normalizeObservedInterval(event.start, event.end, bounds, event.allDay)
      : link
        ? normalizeObservedInterval(link.proposedStart, link.proposedEnd, bounds, false)
        : null;
    if (!interval) continue;
    if (event?.transparency === "transparent") continue;
    busy.push(interval);
  }

  // Conflicts
  const conflictPairs: Array<{ a: string; b: string; evidence: string }> = [];
  for (let i = 0; i < busy.length; i += 1) {
    for (let j = i + 1; j < busy.length; j += 1) {
      if (overlaps(busy[i], busy[j])) {
        conflictPairs.push({
          a: `busy-${i}`,
          b: `busy-${j}`,
          evidence: "Two commitments overlap on the calendar.",
        });
      }
    }
  }

  // Transition pressure
  const sortedBusy = [...busy].sort((a, b) => a.startMs - b.startMs);
  let transitionPressure = 0;
  for (let i = 0; i < sortedBusy.length - 1; i += 1) {
    const gap = gapMinutes(sortedBusy[i].endMs, sortedBusy[i + 1].startMs);
    if (gap <= BACK_TO_BACK_MINUTES) transitionPressure += 1;
    else if (gap < TRANSITION_BUFFER_MINUTES) transitionPressure += 1;
  }

  const scheduledWorkMinutes = input.linkedSchedules.reduce((sum, link) => {
    const mins = minutesBetween(
      Date.parse(link.proposedStart),
      Date.parse(link.proposedEnd),
    );
    return sum + (Number.isFinite(mins) ? mins : 0);
  }, 0);

  const plannedUnscheduled = input.workItems.filter(
    (w) =>
      (w.plannedForDate === bounds.dateKey ||
        (w.plannedForDate && w.plannedForDate.startsWith(bounds.dateKey))) &&
      w.schedulingStatus !== "scheduled" &&
      w.status !== "completed" &&
      w.status !== "archived",
  );
  const overdueWork = input.workItems.filter((w) => w.overdue);

  let requestedKnown = 0;
  let hasUnknown = false;
  for (const w of [...plannedUnscheduled, ...overdueWork]) {
    if (w.estimatedEffortHours != null && w.estimatedEffortHours > 0) {
      requestedKnown += Math.round(w.estimatedEffortHours * 60);
    } else {
      hasUnknown = true;
    }
  }

  const gaps = subtractBusy(remainingWindow, busy);
  const largest = largestGap(gaps);
  const capacity = buildCapacity({
    remainingWindow,
    busy,
    scheduledWorkMinutes,
    requestedWorkMinutes: requestedKnown > 0 ? requestedKnown : null,
    hasUnknownDurations: hasUnknown,
  });

  const plannedExceeds =
    capacity.requestedWorkMinutes != null &&
    capacity.requestedWorkMinutes > capacity.openFocusMinutes;

  const recoveryCount = correlations.filter(
    (c) =>
      c.correlation === "linked_recovery" ||
      c.correlation === "kxd_missing_from_calendar",
  ).length;

  const dayFlow = buildDayFlow({
    correlations,
    bounds,
    nowMs,
    focusGaps: gaps,
    largestFocus: largest,
  });

  const attention: ExecutiveTodayAttentionItem[] = [];
  for (const c of correlations) {
    if (
      c.correlation === "linked_recovery" ||
      c.correlation === "kxd_missing_from_calendar"
    ) {
      attention.push({
        id: `recovery-${c.link?.linkId ?? c.eventId}`,
        title: c.link?.workTitle ?? "Linked calendar event",
        evidence:
          c.link?.recoveryState === "cancelled_remote"
            ? "Linked Google event was cancelled; Work remains but is not a healthy confirmed commitment."
            : "Linked Google event could not be confirmed on today’s calendar.",
        href: c.link?.workHref ?? "/admin/work/scheduling",
        hrefLabel: "Review",
        severity: "recovery",
      });
    }
    if (c.correlation === "linked_drift" && c.link) {
      attention.push({
        id: `drift-${c.link.linkId}`,
        title: c.link.workTitle,
        evidence:
          c.link.externalChangeClass === "schedule_impacting"
            ? "The linked Google event moved and may disrupt the rest of today’s plan."
            : "External descriptive change detected — Work title preserved.",
        href: c.link.workHref,
        hrefLabel: "Open Work",
        severity: "watch",
      });
    }
  }
  for (let i = 0; i < conflictPairs.length; i += 1) {
    attention.push({
      id: `conflict-${i}`,
      title: "Overlapping commitments",
      evidence: conflictPairs[i].evidence,
      href: "/admin/work/scheduling",
      hrefLabel: "Open Scheduling",
      severity: "risk",
    });
  }
  if (transitionPressure > 0) {
    attention.push({
      id: "transition-pressure",
      title: "Tight transitions",
      evidence: `${transitionPressure} back-to-back or under-buffered handoff${transitionPressure === 1 ? "" : "s"} today.`,
      href: null,
      hrefLabel: null,
      severity: "watch",
    });
  }
  if (plannedExceeds) {
    attention.push({
      id: "capacity-mismatch",
      title: "Planned work exceeds remaining focus",
      evidence: capacity.summary,
      href: "/admin/work",
      hrefLabel: "Open Work Engine",
      severity: "risk",
    });
  }
  for (const w of overdueWork.slice(0, 2)) {
    attention.push({
      id: `overdue-${w.workId}`,
      title: w.title,
      evidence: w.clientName
        ? `Overdue client Work competing with today (${w.clientName}).`
        : "Overdue Work competing with today.",
      href: w.href,
      hrefLabel: "Open Work",
      severity: "risk",
    });
  }
  if (input.reviewWaitingCount > 0) {
    attention.push({
      id: "reviews",
      title: "Website reviews waiting",
      evidence: `${input.reviewWaitingCount} review${input.reviewWaitingCount === 1 ? "" : "s"} need judgment.`,
      href: "/admin/operations/review-inbox",
      hrefLabel: "Open Review Inbox",
      severity: "watch",
    });
  }

  const orientation = classifyOrientation({
    conflictCount: conflictPairs.length,
    recoveryCount,
    openFocusMinutes: capacity.openFocusMinutes,
    committedMinutes: capacity.committedCalendarMinutes,
    remainingWorkMinutes: capacity.remainingWorkMinutes,
    gapCount: gaps.length,
    plannedExceedsCapacity: plannedExceeds,
    atRiskCount: attention.filter((a) => a.severity === "risk").length,
  });

  const currentItem = dayFlow.find((i) => i.state === "current" && i.kind !== "focus_gap");
  const nextItem = dayFlow.find((i) => i.state === "next");
  const inGap = Boolean(
    dayFlow.find((i) => i.state === "current" && i.kind === "focus_gap"),
  );
  const minutesRemaining =
    currentItem?.endIso != null
      ? Math.max(0, Math.round((Date.parse(currentItem.endIso) - nowMs) / 60_000))
      : null;
  const nextStartsIn =
    nextItem?.startIso != null
      ? Math.max(0, Math.round((Date.parse(nextItem.startIso) - nowMs) / 60_000))
      : null;

  const current: ExecutiveTodayCurrentPosition = {
    happeningNow: currentItem?.title ?? (inGap ? "Open focus time" : null),
    happeningNowKind: currentItem?.kind ?? (inGap ? "focus_gap" : null),
    minutesRemaining,
    nextCommitment: nextItem?.title ?? null,
    nextStartsInMinutes: nextStartsIn,
    inOpenGap: inGap || (!currentItem && capacity.openFocusMinutes > 0),
    behindPlan: plannedExceeds || recoveryCount > 0,
    summary: currentItem
      ? `${currentItem.title}${minutesRemaining != null ? ` · ${minutesRemaining}m remaining` : ""}`
      : nextItem
        ? `Next: ${nextItem.title}${nextStartsIn != null ? ` in ${nextStartsIn}m` : ""}`
        : "No active timed commitment",
  };

  const recommendation = buildRecommendation({
    orientation,
    dayFlow,
    attention,
    capacity,
    current,
    overdueWork,
    plannedUnscheduled,
    timeZone: bounds.timeZone,
  });

  // Fix accidental minutesLabel reference - already avoided in final buildRecommendation for current linked work
  // Clean recommendation timeSensitivity if it somehow got a function - already fixed

  const orientationSummary = (() => {
    switch (orientation) {
      case "clear":
        return "The day is open. Capacity is available.";
      case "focused":
        return "A meaningful focus window is intact.";
      case "balanced":
        return "Commitments and open time are in workable balance.";
      case "compressed":
        return "Overlapping or tightly packed commitments need a decision.";
      case "fragmented":
        return "Focus time is split into small pieces.";
      case "overloaded":
        return "Committed time leaves little realistic focus remaining.";
      case "recovery_required":
        return "A linked calendar commitment is not confirmed.";
      case "commitment_at_risk":
        return "Today’s plan is at risk of becoming unrealistic.";
      default:
        return "Operating picture composed from current evidence.";
    }
  })();

  const closingSuccess =
    orientation === "recovery_required"
      ? "Confirm or consciously replace the broken calendar link, then protect one real focus block."
      : orientation === "commitment_at_risk" || plannedExceeds
        ? "Leave today with one fewer unrealistic commitment and one completed priority."
        : capacity.largestFocusBlockMinutes >= 45
          ? `Use the ${capacity.largestFocusBlockMinutes}-minute focus block for one clear Work item — then stop.`
          : "Keep the remaining commitments intact and avoid adding new work to today.";

  return {
    orientation,
    orientationSummary,
    bounds,
    current,
    recommendation,
    dayFlow,
    attention: attention.slice(0, 6),
    capacity,
    closing: { successLooksLike: closingSuccess },
    freshness: {
      calendarObservedAt: input.calendarObservedAt,
      calendarAvailable: input.calendarAvailable,
      calendarFailureMessage: input.calendarFailureMessage,
      label: input.calendarAvailable
        ? input.calendarObservedAt
          ? "Calendar observed for today"
          : "Calendar connected"
        : input.calendarFailureMessage
          ? "Calendar unavailable — Work intelligence still active"
          : "Calendar not connected — Work intelligence still active",
    },
    evidence: {
      observedEventCount: input.observedEvents.length,
      linkedCount: correlations.filter((c) => c.link != null).length,
      externalCount: correlations.filter(
        (c) => c.correlation === "external_unlinked",
      ).length,
      recoveryCount,
      conflictCount: conflictPairs.length,
      workTitleAuthoritative: true,
    },
  };
}
