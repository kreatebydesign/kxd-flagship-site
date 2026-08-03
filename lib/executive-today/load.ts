import "server-only";

/**
 * Phase 22A/23A/23B/27B/28B — Executive Today presentation loader.
 * Composes Executive Context + calendar-aware brief + Executive Intelligence Engine.
 * Does not publish Activity. Does not mutate calendar.
 */

import { getExecutiveContext } from "@/lib/executive-context";
import {
  composeExecutiveIntelligence,
  mapRecommendationToTodayPrimary,
} from "@/lib/executive-intelligence";
import { mapSignalToListItem } from "@/lib/executive-signals";
import { loadBriefingContext } from "@/lib/intelligence/briefings/builder";
import { buildExecutiveTodayBrief } from "./brief/load-brief";
import {
  TODAY_EMPTY,
  TODAY_EXCEPTIONS_LIMIT,
  TODAY_PRIORITIES_LIMIT,
  TODAY_SIGNALS_LIMIT,
} from "./presentation";
import {
  mapWorkToFocusItem,
  type ExecutiveTodayData,
  type ExecutiveTodayUpcomingItem,
} from "./types";

function mapUpcoming(
  ctx: Awaited<ReturnType<typeof getExecutiveContext>>,
  brief: Awaited<ReturnType<typeof buildExecutiveTodayBrief>> | null,
): ExecutiveTodayUpcomingItem[] {
  const items: ExecutiveTodayUpcomingItem[] = [];

  if (brief) {
    for (const item of brief.dayFlow.filter((i) => i.state === "next" || i.state === "upcoming").slice(0, 2)) {
      items.push({
        id: item.id,
        label: item.title,
        detail: item.detail ?? item.kind.replace("_", " "),
        href: item.workHref ?? item.calendarHtmlLink,
        source: item.kind === "linked_work" || item.kind === "recovery" ? "work" : "calendar",
      });
    }
  }

  const reviewCount = ctx.reviewsWaiting.length;
  if (reviewCount > 0 && items.length < 3) {
    items.push({
      id: "review-inbox",
      label: "Website Review",
      detail: reviewCount === 1 ? "1 review waiting" : `${reviewCount} reviews waiting`,
      href: "/admin/operations/review-inbox",
      source: "review",
    });
  }

  if (items.length === 0) {
    items.push({
      id: "calendar-quiet",
      label: "Day flow",
      detail: brief?.freshness.label ?? "No timed commitments on the board.",
      href: null,
      source: "calendar",
    });
  }

  return items.slice(0, 3);
}

/**
 * Executive Today — presentation adapter over Context + calendar brief + intelligence engine.
 */
export async function loadExecutiveToday(input?: {
  displayName?: string | null;
  email?: string | null;
}): Promise<ExecutiveTodayData> {
  // Single shared briefing load — React cache shares with getExecutiveContext → morning brief.
  const briefingContext = await loadBriefingContext();

  const [ctx, brief] = await Promise.all([
    getExecutiveContext(input),
    buildExecutiveTodayBrief({
      reviewWaitingCount: undefined,
      briefingContext,
    }).catch(() => null),
  ]);

  const signals = ctx.executiveSignals.map((s) => ({
    id: s.id,
    title: s.title,
    summary: s.summary ?? s.title,
    domain: s.domain,
    href: s.href,
    occurredAt: s.occurredAt,
    businessImpact: s.score.businessImpact,
    urgency: s.score.urgency,
  }));

  const intelligence = composeExecutiveIntelligence({
    observedAt: brief?.bounds.nowIso ?? ctx.generatedAt,
    briefing: briefingContext,
    schedule: brief?.engineSchedule ?? null,
    signals,
    calendarAvailable: brief?.freshness.calendarAvailable ?? null,
  });

  const primary = mapRecommendationToTodayPrimary(intelligence.recommendation);

  const briefWithReviews =
    brief && ctx.reviewsWaiting.length > 0
      ? {
          ...brief,
          attention: [
            ...brief.attention.filter((a) => a.id !== "reviews"),
            {
              id: "reviews",
              title: "Website reviews waiting",
              evidence: `${ctx.reviewsWaiting.length} review${ctx.reviewsWaiting.length === 1 ? "" : "s"} need judgment.`,
              href: "/admin/operations/review-inbox",
              hrefLabel: "Open Review Inbox",
              severity: "watch" as const,
            },
          ].slice(0, TODAY_EXCEPTIONS_LIMIT),
        }
      : brief
        ? {
            ...brief,
            attention: brief.attention.slice(0, TODAY_EXCEPTIONS_LIMIT),
          }
        : brief;

  return {
    greeting: ctx.summary.greeting,
    welcome: ctx.summary.welcome,
    dateDisplay: ctx.summary.dateDisplay,
    timeDisplay: ctx.summary.timeDisplay,
    primary,
    focus: ctx.todayWork
      .slice(0, TODAY_PRIORITIES_LIMIT)
      .map(mapWorkToFocusItem),
    activity: ctx.executiveSignals.slice(0, TODAY_SIGNALS_LIMIT).map((signal) => {
      const mapped = mapSignalToListItem(signal);
      return {
        id: mapped.id,
        title: mapped.title,
        meta: mapped.meta,
        href: mapped.href,
        read: false,
        emphasis: mapped.emphasis === "strong" ? ("notable" as const) : ("quiet" as const),
      };
    }),
    activityEmptyMessage: TODAY_EMPTY.signals,
    intelligence: {
      postureLabel: briefWithReviews
        ? briefWithReviews.orientation.replace(/_/g, " ")
        : ctx.momentum.postureLabel,
      headline: briefWithReviews?.orientationSummary ?? ctx.summary.headline,
      summary: briefWithReviews?.current.summary ?? ctx.summary.contextSummary,
      tone: ctx.momentum.tone,
    },
    upcoming: mapUpcoming(ctx, briefWithReviews),
    brief: briefWithReviews,
    morning: ctx.morning,
    explainability: intelligence.userExplainability,
    generatedAt: ctx.generatedAt,
  };
}
