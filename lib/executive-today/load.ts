import "server-only";

/**
 * Phase 22A/23A/23B/27B — Executive Today presentation loader.
 * Composes Executive Context + calendar-aware brief.
 * Does not publish Activity. Does not mutate calendar.
 */

import { getExecutiveContext } from "@/lib/executive-context";
import {
  EXECUTIVE_SIGNALS_EMPTY_MESSAGE,
  mapSignalToListItem,
} from "@/lib/executive-signals";
import { buildExecutiveTodayBrief } from "./brief/load-brief";
import {
  mapWorkToFocusItem,
  type ExecutiveTodayData,
  type ExecutiveTodayPrimary,
  type ExecutiveTodayUpcomingItem,
} from "./types";

function mapPrimaryFromBrief(
  brief: Awaited<ReturnType<typeof buildExecutiveTodayBrief>>,
): ExecutiveTodayPrimary {
  return {
    title: brief.recommendation.action,
    detail: brief.recommendation.reason,
    href: brief.recommendation.href,
    hrefLabel: brief.recommendation.hrefLabel,
    reason: brief.recommendation.timeSensitivity,
    from: "calendar-brief",
  };
}

function mapPrimary(ctx: Awaited<ReturnType<typeof getExecutiveContext>>): ExecutiveTodayPrimary {
  const { morning, recommendedPriority, quietHoursReady } = ctx;
  const { firstAction, briefing } = morning;

  if (firstAction.hasAction) {
    return {
      title: firstAction.label,
      detail:
        [firstAction.clientName, firstAction.itemTitle, firstAction.detail]
          .filter(Boolean)
          .join(" · ") || firstAction.label,
      href: firstAction.href,
      hrefLabel: firstAction.hrefLabel,
      reason: "Morning Brief first action — your calmest next move.",
      from: "first-action",
    };
  }

  if (briefing.primaryRecommendation) {
    const rec = briefing.primaryRecommendation;
    return {
      title: rec.title,
      detail: rec.reason,
      href: rec.href ?? null,
      hrefLabel: rec.href ? "Open" : "Continue",
      reason: rec.expectedImpact || rec.whyAppeared || rec.reason,
      from: "recommendation",
    };
  }

  if (recommendedPriority && !quietHoursReady) {
    return {
      title: recommendedPriority.title,
      detail: recommendedPriority.detail || "Continue from where the system left off.",
      href: recommendedPriority.href,
      hrefLabel: "Continue",
      reason: "Executive Context continuation.",
      from: "recommendation",
    };
  }

  return {
    title: "Nothing urgent",
    detail: "Continue planned work. The system is quiet.",
    href: "/admin/work",
    hrefLabel: "Open Work Engine",
    reason: "No elevated first action from Brief.",
    from: "calm",
  };
}

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
 * Executive Today — presentation adapter over Context + calendar brief.
 */
export async function loadExecutiveToday(input?: {
  displayName?: string | null;
  email?: string | null;
}): Promise<ExecutiveTodayData> {
  const [ctx, brief] = await Promise.all([
    getExecutiveContext(input),
    buildExecutiveTodayBrief({
      reviewWaitingCount: undefined,
    }).catch(() => null),
  ]);

  // Prefer calendar-aware recommendation when brief has material schedule evidence
  // or elevated orientation; otherwise keep Morning Brief priority.
  const preferBrief =
    brief != null &&
    (brief.evidence.observedEventCount > 0 ||
      brief.evidence.linkedCount > 0 ||
      brief.evidence.recoveryCount > 0 ||
      brief.orientation === "compressed" ||
      brief.orientation === "overloaded" ||
      brief.orientation === "commitment_at_risk" ||
      brief.orientation === "recovery_required" ||
      brief.orientation === "fragmented");

  const primary = preferBrief && brief
    ? mapPrimaryFromBrief(brief)
    : mapPrimary(ctx);

  // Re-run brief with review count from context when available
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
          ].slice(0, 6),
        }
      : brief;

  return {
    greeting: ctx.summary.greeting,
    welcome: ctx.summary.welcome,
    dateDisplay: ctx.summary.dateDisplay,
    timeDisplay: ctx.summary.timeDisplay,
    primary,
    focus: ctx.todayWork.map(mapWorkToFocusItem),
    activity: ctx.executiveSignals.map((signal) => {
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
    activityEmptyMessage: ctx.signalsEmptyMessage || EXECUTIVE_SIGNALS_EMPTY_MESSAGE,
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
    generatedAt: ctx.generatedAt,
  };
}
