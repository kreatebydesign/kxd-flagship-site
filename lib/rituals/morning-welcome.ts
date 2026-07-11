/**
 * Morning Brief — permanent executive voice.
 * Personalized greeting + live-state welcome. Admin / founder only.
 */

import type { BriefingInputContext } from "@/lib/intelligence/briefings/types";
import type { ExecutiveBriefing } from "@/lib/intelligence/briefings/types";
import {
  getZonedHour,
  KXD_BUSINESS_TIMEZONE,
} from "@/lib/platform/timezone";
import type { MorningClientActivity } from "@/lib/rituals/morning-activity";
import type { MorningFirstAction } from "@/lib/rituals/morning-first-action";

export interface MorningBriefVoice {
  firstName: string;
  greeting: string;
  welcome: string;
}

const DEFAULT_FOUNDER_FIRST_NAME = "Matt";

export function resolveExecutiveFirstName(
  displayName?: string | null,
  email?: string | null,
): string {
  if (displayName?.trim()) {
    const first = displayName.trim().split(/\s+/)[0];
    if (first) return first;
  }
  if (email?.trim()) {
    const local = email.trim().split("@")[0] ?? "";
    const token = local.split(/[._-]/)[0];
    if (token) {
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    }
  }
  return DEFAULT_FOUNDER_FIRST_NAME;
}

function periodGreeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function periodClause(hour: number): string {
  if (hour < 12) return "this morning";
  if (hour < 17) return "this afternoon";
  return "this evening";
}

function uniqueClientCount(activity: MorningClientActivity): number {
  return activity.groups.length;
}

/**
 * Build greeting + welcome from live briefing state.
 * Deterministic — never random, never mentions systems or AI.
 */
export function buildMorningBriefVoice(input: {
  firstName: string;
  context: BriefingInputContext;
  briefing: ExecutiveBriefing;
  activity: MorningClientActivity;
  firstAction: MorningFirstAction;
  now?: Date;
  timeZone?: string;
}): MorningBriefVoice {
  const timeZone = input.timeZone ?? KXD_BUSINESS_TIMEZONE;
  const now = input.now ?? new Date();
  const hour = getZonedHour(now, timeZone);
  const firstName = input.firstName.trim() || DEFAULT_FOUNDER_FIRST_NAME;
  const greeting = `${periodGreeting(hour)}, ${firstName}.`;

  const welcome = buildWelcomeLine({
    hour,
    context: input.context,
    briefing: input.briefing,
    activity: input.activity,
    firstAction: input.firstAction,
  });

  return { firstName, greeting, welcome };
}

function buildWelcomeLine(input: {
  hour: number;
  context: BriefingInputContext;
  briefing: ExecutiveBriefing;
  activity: MorningClientActivity;
  firstAction: MorningFirstAction;
}): string {
  const { hour, context, briefing, activity, firstAction } = input;
  const when = periodClause(hour);
  const clientsInView = uniqueClientCount(activity);
  const newReviews = context.reviewInbox.newCount;
  const healthLevel = briefing.healthSnapshot.overall.level;
  const completedToday = context.work.stats.completedTodayCount;

  // Attention from live client work
  if (firstAction.hasAction) {
    if (
      firstAction.kind === "website-review-new" ||
      firstAction.kind === "communication" ||
      firstAction.kind === "work" ||
      firstAction.kind === "client-request"
    ) {
      if (clientsInView <= 1) {
        return `One client requires your attention ${when}.`;
      }
      return `A few clients require your attention ${when}.`;
    }

    if (firstAction.kind === "website-review-active") {
      if (clientsInView <= 1) {
        return `One client requires your attention ${when}.`;
      }
      return `Active client work is waiting for you ${when}.`;
    }
  }

  if (newReviews > 0) {
    return newReviews === 1
      ? `One client requires your attention ${when}.`
      : `A few clients require your attention ${when}.`;
  }

  // Quiet overnight / no live activity
  if (!activity.hasActivity) {
    return hour < 12
      ? "No overnight client activity was detected."
      : "No new client activity was detected.";
  }

  // Healthy studio posture
  if (healthLevel === "excellent" || healthLevel === "healthy") {
    if (completedToday > 0 || context.work.stats.inProgressCount > 0) {
      return "Business momentum remains strong today.";
    }
    return "The studio is in a healthy position today.";
  }

  if (completedToday > 0) {
    return "Business momentum remains strong today.";
  }

  return "Welcome back.";
}
