import "server-only";

/**
 * Phase 22A/23A/23B — Executive Today presentation loader.
 * Renders entirely from Executive Context — no independent composition.
 */

import { getExecutiveContext } from "@/lib/executive-context";
import {
  EXECUTIVE_SIGNALS_EMPTY_MESSAGE,
  mapSignalToListItem,
} from "@/lib/executive-signals";
import {
  mapWorkToFocusItem,
  type ExecutiveTodayData,
  type ExecutiveTodayPrimary,
  type ExecutiveTodayUpcomingItem,
} from "./types";

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

function mapUpcoming(ctx: Awaited<ReturnType<typeof getExecutiveContext>>): ExecutiveTodayUpcomingItem[] {
  const items: ExecutiveTodayUpcomingItem[] = [];
  const reviewCount = ctx.reviewsWaiting.length;

  if (reviewCount > 0) {
    items.push({
      id: "review-inbox",
      label: "Website Review",
      detail: reviewCount === 1 ? "1 review waiting" : `${reviewCount} reviews waiting`,
      href: "/admin/operations/review-inbox",
      source: "review",
    });
  }

  if (ctx.waiting.blockedItems.length > 0) {
    items.push({
      id: "work-blocked",
      label: "Work Engine",
      detail: `${ctx.waiting.blockedItems.length} blocked`,
      href: "/admin/work",
      source: "work",
    });
  } else if (ctx.waiting.waitingOnKxd.length > 0) {
    items.push({
      id: "work-waiting-kxd",
      label: "Work Engine",
      detail: `${ctx.waiting.waitingOnKxd.length} waiting on KXD`,
      href: "/admin/work",
      source: "work",
    });
  }

  if (items.length === 0) {
    items.push({
      id: "calendar-reserved",
      label: "Calendar",
      detail: "Schedule awareness arrives when Calendar connects.",
      href: null,
      source: "calendar",
    });
  }

  return items.slice(0, 3);
}

/**
 * Executive Today — presentation adapter over getExecutiveContext().
 */
export async function loadExecutiveToday(input?: {
  displayName?: string | null;
  email?: string | null;
}): Promise<ExecutiveTodayData> {
  const ctx = await getExecutiveContext(input);

  return {
    greeting: ctx.summary.greeting,
    welcome: ctx.summary.welcome,
    dateDisplay: ctx.summary.dateDisplay,
    timeDisplay: ctx.summary.timeDisplay,
    primary: mapPrimary(ctx),
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
      postureLabel: ctx.momentum.postureLabel,
      headline: ctx.summary.headline,
      summary: ctx.summary.contextSummary,
      tone: ctx.momentum.tone,
    },
    upcoming: mapUpcoming(ctx),
    morning: ctx.morning,
    generatedAt: ctx.generatedAt,
  };
}
