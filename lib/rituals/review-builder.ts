import "server-only";

import type { ExecutiveBriefing } from "@/lib/intelligence/briefings/types";
import type { ExecutiveTimelineDoc } from "@/lib/executive-timeline/types";
import type { WorkListItem, WorkWorkspaceData } from "@/lib/work/types";
import {
  formatDisplayDateShort,
  KXD_BUSINESS_TIMEZONE,
} from "@/lib/platform/timezone";
import { getDelightAffirmation } from "./delight";
import { estimateReadingMinutes, formatReadingTime } from "./reading-time";
import type { WeeklyReviewIntelligence } from "./intelligence/types";
import type { FocusPriority, WeeklyReview, WeeklyReviewLesson, WeeklyReviewWin } from "./types";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function isWithinWeek(iso: string): boolean {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts <= WEEK_MS;
}

function weekLabel(timeZone: string = KXD_BUSINESS_TIMEZONE): string {
  const now = new Date();
  const start = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  return `${formatDisplayDateShort(start, timeZone)} – ${formatDisplayDateShort(now, timeZone)}`;
}

function completedThisWeek(work: WorkWorkspaceData): Array<{
  id: number;
  title: string;
  clientName: string;
  completedAt: string;
}> {
  const candidates = [...work.completedToday, ...work.recentWork].filter(
    (item) => item.status === "completed" && item.completedAt && isWithinWeek(item.completedAt),
  );

  const seen = new Set<number>();
  return candidates
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .slice(0, 12)
    .map((item) => ({
      id: item.id,
      title: item.title,
      clientName: item.clientName,
      completedAt: item.completedAt!,
    }));
}

function relationshipEvents(
  events: ExecutiveTimelineDoc[],
): WeeklyReview["relationshipProgress"] {
  return events
    .filter((e) => isWithinWeek(String(e.occurredAt)))
    .slice(0, 8)
    .map((e) => ({
      id: String(e.id),
      title: String(e.title),
      detail: String(e.summary ?? e.description ?? ""),
      occurredAt: String(e.occurredAt),
    }));
}

function buildWins(
  briefing: ExecutiveBriefing,
  completed: ReturnType<typeof completedThisWeek>,
): WeeklyReviewWin[] {
  const wins: WeeklyReviewWin[] = [];

  for (const insight of briefing.executiveInsights.filter((i) => i.tone === "positive")) {
    wins.push({
      id: insight.id,
      label: insight.observation,
      detail: insight.whyItMatters,
    });
  }

  for (const item of completed.slice(0, 4)) {
    wins.push({
      id: `work-${item.id}`,
      label: item.title,
      detail: `Completed for ${item.clientName}`,
    });
  }

  if (briefing.healthSnapshot.overall.level === "excellent" || briefing.healthSnapshot.overall.level === "healthy") {
    wins.push({
      id: "health",
      label: "Portfolio health is steady",
      detail: briefing.businessHealth.summary,
    });
  }

  return wins.slice(0, 6);
}

function buildLessons(briefing: ExecutiveBriefing): WeeklyReviewLesson[] {
  return briefing.executiveInsights
    .filter((i) => i.tone === "observational" || i.tone === "neutral")
    .slice(0, 4)
    .map((i) => ({
      id: i.id,
      observation: i.observation,
    }));
}

export function buildWeeklyReview(
  briefing: ExecutiveBriefing,
  work: WorkWorkspaceData,
  timelineEvents: ExecutiveTimelineDoc[],
  intelligence?: WeeklyReviewIntelligence,
): WeeklyReview {
  const completedWork = completedThisWeek(work);
  const wins = buildWins(briefing, completedWork);
  const lessons = buildLessons(briefing);

  const businessProgress = intelligence?.movementNarrative.length
    ? intelligence.movementNarrative
    : briefing.narrative.sentences.slice(0, 3);
  const relationshipProgress = relationshipEvents(timelineEvents);

  const nextWeekPriorities: FocusPriority[] = briefing.topPriorities.slice(0, 5).map((item) => ({
    id: item.id,
    title: item.title,
    reason: item.reason,
    href: item.href,
    urgency: item.urgency,
  }));

  const risks = briefing.businessRisks.slice(0, 4).map((r) => ({
    id: r.id,
    title: r.title,
    reason: r.reason,
  }));

  const readingTexts = [
    ...businessProgress,
    ...(intelligence?.meaningfulChanges ?? []),
    ...wins.map((w) => w.label),
    ...lessons.map((l) => l.observation),
  ];
  const minutes = estimateReadingMinutes(readingTexts);

  const affirmation = getDelightAffirmation(
    wins.length >= 2 ? "review-wins" : "review-calm",
  );

  return {
    greeting: briefing.greeting,
    weekLabel: weekLabel(),
    dateDisplay: briefing.dateDisplay,
    completedWork,
    businessProgress,
    relationshipProgress,
    wins,
    risks,
    lessons,
    nextWeekPriorities,
    affirmation,
    readingEstimate: {
      minutes,
      label: formatReadingTime(minutes),
    },
    intelligence,
  };
}
