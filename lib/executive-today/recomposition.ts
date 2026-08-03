/**
 * Phase 7 — Today | Batch D.1 — Founder experience recomposition.
 *
 * Presentation-only. No new intelligence. No new data owners.
 * Rewrites tone, hierarchy, and composition over existing facts.
 */

import type { ExecutiveContextRef } from "@/lib/executive-context/types";
import type { ExecutiveDayOrientation, ExecutiveTodayBrief } from "./brief/types";
import {
  TODAY_EXCEPTIONS_LIMIT,
  TODAY_PRIORITIES_LIMIT,
  TODAY_SCHEDULE_LIMIT,
  TODAY_SIGNALS_LIMIT,
  selectTodaySchedule,
} from "./presentation";
import type {
  ExecutiveTodayActivityItem,
  ExecutiveTodayData,
  ExecutiveTodayFocusItem,
  ExecutiveTodayPrimary,
} from "./types";

export type TodayDayPeriod = "Morning" | "Afternoon" | "Evening";

export interface TodayWaitingItem {
  id: string;
  title: string;
  meta: string;
  href: string | null;
}

export interface TodayFlowPeriod {
  period: TodayDayPeriod;
  items: ExecutiveTodayBrief["dayFlow"];
}

export interface TodayRecomposition {
  postureLine: string;
  daySentence: string;
  primary: ExecutiveTodayPrimary;
  waitingForYou: TodayWaitingItem[];
  flowPeriods: TodayFlowPeriod[];
  scheduleEmpty: string;
  priorities: ExecutiveTodayFocusItem[];
  momentumLine: string;
  signals: ExecutiveTodayActivityItem[];
  signalsEmpty: string;
  waitingEmpty: string;
}

const ROBOTIC_PRIMARY: Array<{ match: RegExp; title: string; detail?: string }> = [
  {
    match: /continue planned work without forcing the calendar/i,
    title: "Protect one clear priority",
    detail: "The day has room — use it on one thing that moves the business.",
  },
  {
    match: /without forcing the calendar/i,
    title: "Choose one priority and protect it",
  },
];

export function humanizePrimary(primary: ExecutiveTodayPrimary): ExecutiveTodayPrimary {
  const joined = `${primary.title} ${primary.detail} ${primary.reason}`;
  for (const rule of ROBOTIC_PRIMARY) {
    if (rule.match.test(joined) || rule.match.test(primary.title)) {
      return {
        ...primary,
        title: rule.title,
        detail: rule.detail ?? primary.detail,
        hrefLabel: primary.href
          ? humanizeActionLabel(primary.hrefLabel) ?? "Begin"
          : primary.hrefLabel,
      };
    }
  }

  return {
    ...primary,
    hrefLabel: primary.href
      ? humanizeActionLabel(primary.hrefLabel) ?? primary.hrefLabel ?? "Begin"
      : primary.hrefLabel,
  };
}

function humanizeActionLabel(label: string | null): string | null {
  if (!label) return null;
  const map: Record<string, string> = {
    "Open Work Engine": "Open Work",
    "Open Scheduling": "See the day",
    Continue: "Begin",
    "Open Focus": "Enter Focus",
  };
  return map[label] ?? label.replace(/^Open Work Engine$/i, "Open Work");
}

export function composePostureLine(input: {
  orientation: ExecutiveDayOrientation | null;
  businessMomentum: "quiet" | "steady" | "elevated" | "pressured";
  waitingCount: number;
  isCalm: boolean;
}): string {
  const { orientation, businessMomentum, waitingCount, isCalm } = input;

  if (orientation === "recovery_required") {
    return "One calendar commitment needs your attention before the day settles.";
  }
  if (orientation === "commitment_at_risk" || orientation === "overloaded") {
    return "Today is tight. Protect the decision that matters most.";
  }
  if (orientation === "compressed" || orientation === "fragmented") {
    return "The day is fragmented — clarity will come from choosing less.";
  }
  if (waitingCount >= 3) {
    return "A few things are waiting on you. Clear those first.";
  }
  if (waitingCount > 0) {
    return "You're in a steady position — with a short list waiting on you.";
  }
  if (isCalm || businessMomentum === "quiet" || orientation === "clear") {
    return "You're in a good position today.";
  }
  if (orientation === "focused") {
    return "You have a real focus window. Use it well.";
  }
  if (businessMomentum === "pressured") {
    return "There is pressure in the studio — stay with one clear decision.";
  }
  if (businessMomentum === "elevated") {
    return "The business is moving. Keep your attention narrow.";
  }
  return "Everything critical is under control.";
}

export function composeDaySentence(input: {
  orientation: ExecutiveDayOrientation | null;
  scheduleCount: number;
  waitingCount: number;
  isCalm: boolean;
  happeningNow: string | null;
  nextCommitment: string | null;
}): string {
  if (input.happeningNow) {
    return `Right now: ${input.happeningNow}.`;
  }
  if (input.nextCommitment) {
    return `Next up: ${input.nextCommitment}.`;
  }
  if (input.orientation === "clear" || (input.isCalm && input.scheduleCount === 0)) {
    return "Quiet day ahead — a good one to move something forward.";
  }
  if (input.scheduleCount === 0) {
    return "No timed commitments. The day is open.";
  }
  if (input.waitingCount > 0 && input.scheduleCount <= 2) {
    return "A light calendar with a few decisions waiting.";
  }
  if (input.orientation === "balanced" || input.orientation === "focused") {
    return "The day has shape — enough structure without crowding you.";
  }
  if (
    input.orientation === "compressed" ||
    input.orientation === "fragmented" ||
    input.orientation === "overloaded"
  ) {
    return "The calendar is demanding. Keep your focus list short.";
  }
  return "Begin with the one thing that deserves you first.";
}

export function composeWaitingForYou(input: {
  reviews: ExecutiveContextRef[];
  waitingOnKxd: ExecutiveContextRef[];
  blocked: ExecutiveContextRef[];
  attention: ExecutiveTodayBrief["attention"];
  primaryHref: string | null;
}): TodayWaitingItem[] {
  const items: TodayWaitingItem[] = [];
  const seen = new Set<string>();

  const push = (item: TodayWaitingItem) => {
    if (seen.has(item.id)) return;
    if (items.length >= TODAY_EXCEPTIONS_LIMIT) return;
    seen.add(item.id);
    items.push(item);
  };

  for (const review of input.reviews) {
    push({
      id: `review-${review.id}`,
      title: review.title || "Website Review",
      meta: review.clientName
        ? `${review.clientName} · waiting on your judgment`
        : "Waiting on your judgment",
      href: review.href ?? "/admin/operations/review-inbox",
    });
  }

  for (const work of input.waitingOnKxd) {
    push({
      id: `wait-kxd-${work.id}`,
      title: work.title,
      meta: work.clientName
        ? `${work.clientName} · waiting on you`
        : "Waiting on you",
      href: work.href,
    });
  }

  for (const work of input.blocked) {
    push({
      id: `blocked-${work.id}`,
      title: work.title,
      meta: work.clientName ? `${work.clientName} · blocked` : "Blocked",
      href: work.href,
    });
  }

  for (const attention of input.attention) {
    push({
      id: `attention-${attention.id}`,
      title: attention.title,
      meta: attention.evidence,
      href: attention.href,
    });
  }

  // Avoid echoing the exact primary destination as a second hero.
  return items.filter((item) => {
    if (!input.primaryHref || !item.href) return true;
    return item.href !== input.primaryHref;
  });
}

export function composeFlowPeriods(
  dayFlow: ExecutiveTodayBrief["dayFlow"],
  timeZone: string,
): TodayFlowPeriod[] {
  const live = selectTodaySchedule(dayFlow, TODAY_SCHEDULE_LIMIT);
  const buckets: Record<TodayDayPeriod, ExecutiveTodayBrief["dayFlow"]> = {
    Morning: [],
    Afternoon: [],
    Evening: [],
  };

  for (const item of live) {
    const period = periodForIso(item.startIso, timeZone, item.allDay);
    buckets[period].push(item);
  }

  return (["Morning", "Afternoon", "Evening"] as TodayDayPeriod[])
    .map((period) => ({ period, items: buckets[period] }))
    .filter((group) => group.items.length > 0);
}

function periodForIso(
  startIso: string | null,
  timeZone: string,
  allDay: boolean,
): TodayDayPeriod {
  if (allDay || !startIso) return "Morning";
  try {
    const hour = Number(
      new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        hour12: false,
        timeZone,
      }).format(new Date(startIso)),
    );
    if (hour < 12) return "Morning";
    if (hour < 17) return "Afternoon";
    return "Evening";
  } catch {
    return "Afternoon";
  }
}

export function composeMomentumLine(input: {
  businessMomentum: "quiet" | "steady" | "elevated" | "pressured";
  waitingCount: number;
  priorityCount: number;
  isCalm: boolean;
}): string {
  if (input.isCalm && input.waitingCount === 0) {
    return "Quiet momentum — a clean runway for one meaningful advance.";
  }
  switch (input.businessMomentum) {
    case "quiet":
      return "The portfolio is calm. Progress today can be deliberate.";
    case "steady":
      return input.priorityCount > 0
        ? "Steady movement across the studio. Keep finishing what you start."
        : "Steady movement across the studio.";
    case "elevated":
      return "Clients and work are advancing — protect your attention.";
    case "pressured":
      return "Pressure is present. Confidence comes from finishing one thing.";
    default:
      return "The business is moving.";
  }
}

export function selectDecisionSignals(
  activity: ExecutiveTodayActivityItem[],
): ExecutiveTodayActivityItem[] {
  const notable = activity.filter((item) => item.emphasis === "notable");
  const chosen = (notable.length > 0 ? notable : activity).slice(
    0,
    Math.min(3, TODAY_SIGNALS_LIMIT),
  );
  return chosen;
}

export function recomposeTodayExperience(
  data: Omit<ExecutiveTodayData, "experience">,
  extras: {
    reviews: ExecutiveContextRef[];
    waitingOnKxd: ExecutiveContextRef[];
    blocked: ExecutiveContextRef[];
    businessMomentum: "quiet" | "steady" | "elevated" | "pressured";
  },
): TodayRecomposition {
  const brief = data.brief;
  const isCalm = data.primary.from === "calm";
  const primary = humanizePrimary(data.primary);
  const waitingForYou = composeWaitingForYou({
    reviews: extras.reviews,
    waitingOnKxd: extras.waitingOnKxd,
    blocked: extras.blocked,
    attention: brief?.attention ?? [],
    primaryHref: primary.href,
  });
  const scheduleItems = brief ? selectTodaySchedule(brief.dayFlow) : [];
  const flowPeriods = brief
    ? composeFlowPeriods(brief.dayFlow, brief.bounds.timeZone)
    : [];

  return {
    postureLine: composePostureLine({
      orientation: brief?.orientation ?? null,
      businessMomentum: extras.businessMomentum,
      waitingCount: waitingForYou.length,
      isCalm,
    }),
    daySentence: composeDaySentence({
      orientation: brief?.orientation ?? null,
      scheduleCount: scheduleItems.length,
      waitingCount: waitingForYou.length,
      isCalm,
      happeningNow: brief?.current.happeningNow ?? null,
      nextCommitment: brief?.current.nextCommitment ?? null,
    }),
    primary,
    waitingForYou,
    flowPeriods,
    scheduleEmpty:
      brief && !brief.freshness.calendarAvailable
        ? "The calendar isn’t available — your time is still yours."
        : "Open day. Nothing timed is competing for you.",
    priorities: data.focus.slice(0, TODAY_PRIORITIES_LIMIT),
    momentumLine: composeMomentumLine({
      businessMomentum: extras.businessMomentum,
      waitingCount: waitingForYou.length,
      priorityCount: data.focus.length,
      isCalm,
    }),
    signals: selectDecisionSignals(data.activity),
    signalsEmpty: "Nothing here changes today’s decisions.",
    waitingEmpty: "Nothing is waiting on you.",
  };
}
