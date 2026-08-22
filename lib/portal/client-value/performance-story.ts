/**
 * Plain-language performance story from ReportingFacts.
 * Deterministic — no live provider calls, no fabricated improvement.
 */

import type { ReportingFact } from "@/lib/reporting/domain/types";
import { periodLabel } from "@/lib/portal/work-performance/period";
import type { PeriodWindow } from "@/lib/reporting/domain/types";
import type {
  ClientPerformanceStory,
  ClientPerformanceStoryTone,
  ClientValueAvailability,
} from "./types";

export type ComposePerformanceStoryInput = {
  reportingFacts: ReportingFact[];
  reportingEntitled: boolean;
  reportingPeriod: PeriodWindow;
  /** Connection mapping present (not property IDs themselves). */
  ga4Mapped: boolean;
  gscMapped: boolean;
  /** Optional next-move hint from existing Work Performance next moves. */
  nextMoveHint?: string | null;
  /** Website Review entitled without performance reporting — launch-stage copy. */
  websiteReviewEntitled?: boolean;
  /** Project build vs ongoing managed relationship. */
  engagementLifecycle?: "website-build" | "managed-ongoing" | "unknown";
};

const TRACKED_KEYS = [
  "sessions",
  "visitors",
  "clicks",
  "impressions",
  "conversions",
  "ctr",
] as const;

type TrackedKey = (typeof TRACKED_KEYS)[number];

function factByKey(facts: ReportingFact[], key: TrackedKey): ReportingFact | undefined {
  return facts.find((f) => f.metricKey === key);
}

function hasPrior(fact: ReportingFact | undefined): boolean {
  return Boolean(
    fact && fact.previousValue != null && Number.isFinite(fact.previousValue),
  );
}

function trendOf(fact: ReportingFact | undefined): "up" | "down" | "flat" | "unknown" {
  if (!fact) return "unknown";
  if (fact.trend === "up" || fact.trend === "down" || fact.trend === "flat") {
    return fact.trend;
  }
  if (!hasPrior(fact)) return "unknown";
  if (fact.value > (fact.previousValue as number)) return "up";
  if (fact.value < (fact.previousValue as number)) return "down";
  return "flat";
}

function relativeLift(fact: ReportingFact): number | null {
  if (!hasPrior(fact) || fact.previousValue === 0) return null;
  return (fact.value - (fact.previousValue as number)) / Math.abs(fact.previousValue as number);
}

function pickStrongestUp(facts: ReportingFact[]): ReportingFact | null {
  let best: ReportingFact | null = null;
  let bestScore = 0;
  for (const key of TRACKED_KEYS) {
    const fact = factByKey(facts, key);
    if (!fact || trendOf(fact) !== "up") continue;
    const lift = relativeLift(fact);
    const score = lift != null ? lift : 0.05;
    if (score > bestScore) {
      best = fact;
      bestScore = score;
    }
  }
  return best;
}

function pickStrongestDown(facts: ReportingFact[]): ReportingFact | null {
  let worst: ReportingFact | null = null;
  let worstScore = 0;
  for (const key of TRACKED_KEYS) {
    const fact = factByKey(facts, key);
    if (!fact || trendOf(fact) !== "down") continue;
    const lift = relativeLift(fact);
    const score = lift != null ? Math.abs(lift) : 0.05;
    if (score > worstScore) {
      worst = fact;
      worstScore = score;
    }
  }
  return worst;
}

function signalLabel(fact: ReportingFact): string {
  switch (fact.metricKey) {
    case "sessions":
      return "Website visits";
    case "visitors":
      return "People visiting the website";
    case "clicks":
      return "Visits from Google Search";
    case "impressions":
      return "How often the site appears in Google Search";
    case "conversions":
      return "Tracked website actions";
    case "ctr":
      return "How often people click from Google Search";
    default:
      return "Website activity";
  }
}

function positiveSignalSentence(fact: ReportingFact): string {
  switch (fact.metricKey) {
    case "sessions":
    case "visitors":
      return "More people found and visited the website this period.";
    case "clicks":
      return "More people arrived from Google Search this period.";
    case "impressions":
      return "The website appeared more often in Google Search this period.";
    case "ctr":
      return "More people who saw the site in Google chose to click through.";
    case "conversions":
      return "Tracked website actions moved in a positive direction.";
    default:
      return "A tracked website signal improved versus the prior period.";
  }
}

function composeReadyStory(
  facts: ReportingFact[],
  period: PeriodWindow,
  nextMoveHint: string | null,
): ClientPerformanceStory {
  const label = periodLabel(period);
  const up = pickStrongestUp(facts);
  const down = pickStrongestDown(facts);
  const anyPrior = facts.some((f) => hasPrior(f));
  const sessions = factByKey(facts, "sessions") ?? factByKey(facts, "visitors");
  const clicks = factByKey(facts, "clicks");
  const impressions = factByKey(facts, "impressions");

  let tone: ClientPerformanceStoryTone = "steady";
  let whatMovedForward: string;
  let whatItMeans: string;
  let strongestSignal: string | null = null;

  if (!anyPrior) {
    tone = "unknown";
    whatMovedForward =
      "Tracking is connected and current-period activity is available.";
    whatItMeans =
      "This is an early read. A clearer month-to-month comparison will appear after the next full period is recorded.";
    strongestSignal = sessions
      ? `${signalLabel(sessions)} are being measured for ${label}.`
      : clicks
        ? `${signalLabel(clicks)} are being measured for ${label}.`
        : "Website and search activity are being measured.";
  } else if (up && (!down || (relativeLift(up) ?? 0) >= (relativeLift(down) ?? 0))) {
    tone = "positive";
    whatMovedForward = positiveSignalSentence(up);
    whatItMeans =
      up.metricKey === "impressions" || up.metricKey === "clicks" || up.metricKey === "ctr"
        ? "Search visibility is contributing. The smartest follow-through is strengthening pages already near the front of Google results."
        : "Website interest is holding attention. Keep focus on clear pages and easy next steps for visitors.";
    strongestSignal = `${signalLabel(up)} improved versus the prior period.`;
  } else if (down && !up) {
    tone = "caution";
    whatMovedForward =
      "Activity was recorded for this period, with one signal softer than the prior period.";
    whatItMeans = `${signalLabel(down)} eased compared with the prior period. That is useful information — not a reason to panic. KXD will focus on the pages and searches that still have room to improve.`;
    strongestSignal = null;
  } else if (up && down) {
    tone = "steady";
    whatMovedForward = `${positiveSignalSentence(up)} Another signal was softer than last period.`;
    whatItMeans =
      "Results are mixed but readable. KXD will lean into what improved and quietly address what softened.";
    strongestSignal = `${signalLabel(up)} was the strongest positive signal.`;
  } else {
    tone = "steady";
    whatMovedForward = "Website and search activity held steady this period.";
    whatItMeans =
      "No dramatic swing either way. Steady periods are normal — KXD watches for clear opportunities rather than forcing a story.";
    strongestSignal =
      impressions && trendOf(impressions) === "flat"
        ? "Search visibility held about even with the prior period."
        : sessions
          ? "Website visits held about even with the prior period."
          : null;
  }

  const watchingParts: string[] = [];
  if (impressions || clicks) watchingParts.push("Google Search visibility");
  if (sessions || factByKey(facts, "visitors")) watchingParts.push("website visits");
  if (factByKey(facts, "conversions")) watchingParts.push("tracked website actions");
  let whatKxdIsWatching: string;
  if (watchingParts.length === 0) {
    whatKxdIsWatching =
      "KXD keeps an eye on the connected website and search signals for this business.";
  } else if (watchingParts.length === 1) {
    whatKxdIsWatching = `KXD is watching ${watchingParts[0]} for this business.`;
  } else if (watchingParts.length === 2) {
    whatKxdIsWatching = `KXD is watching ${watchingParts[0]} and ${watchingParts[1]} for this business.`;
  } else {
    const last = watchingParts[watchingParts.length - 1];
    whatKxdIsWatching = `KXD is watching ${watchingParts.slice(0, -1).join(", ")}, and ${last} for this business.`;
  }

  const smartestNextMove =
    nextMoveHint?.trim() ||
    (tone === "positive"
      ? "Keep improving the pages that already attract interest — that is usually the highest-return next step."
      : tone === "caution"
        ? "Review the pages and searches already near page one — small clarity improvements often help most."
        : "Stay the course on clear website updates and search visibility; KXD will flag a sharper move when the data supports it.");

  return {
    availability: "ready",
    tone,
    whatMovedForward,
    whatItMeans,
    strongestSignal,
    whatKxdIsWatching,
    smartestNextMove,
    periodLabel: label,
  };
}

/**
 * Compose plain-language performance story from existing facts + connection flags.
 */
export function composePerformanceStory(
  input: ComposePerformanceStoryInput,
): ClientPerformanceStory {
  const label = periodLabel(input.reportingPeriod);
  const nextHint = input.nextMoveHint?.trim() || null;
  const mapped = input.ga4Mapped || input.gscMapped;
  const websiteReviewEntitled = Boolean(input.websiteReviewEntitled);
  const websiteBuild =
    input.engagementLifecycle === "website-build" ||
    (websiteReviewEntitled && !input.reportingEntitled);

  if (!input.reportingEntitled && websiteBuild) {
    return {
      availability: "launch-stage",
      tone: "unknown",
      whatMovedForward: "Your website engagement is active.",
      whatItMeans:
        "This workspace is set up for your website project. Milestones, updates, and revision paths will appear here as work progresses.",
      strongestSignal: null,
      whatKxdIsWatching:
        "KXD is advancing the website work included in your agreement.",
      smartestNextMove:
        nextHint ??
        "When you have notes or screenshots to share, open Website Review.",
      periodLabel: label,
    };
  }

  if (!input.reportingEntitled) {
    return {
      availability: "not-entitled",
      tone: "unknown",
      whatMovedForward: "Performance reporting is not enabled for this workspace yet.",
      whatItMeans:
        "When reporting is included in the partnership, a clear monthly story will appear here — not a wall of charts.",
      strongestSignal: null,
      whatKxdIsWatching: "KXD continues to manage the website services included in your partnership.",
      smartestNextMove:
        nextHint ??
        "Use Website Review when you have notes or updates for the site.",
      periodLabel: label,
    };
  }

  if (!mapped) {
    return {
      availability: "disconnected",
      tone: "unknown",
      whatMovedForward: "Website tracking is not connected for this business yet.",
      whatItMeans:
        "Without connected analytics, KXD cannot truthfully show how visits or search visibility changed. That setup is handled by KXD — not something you need to fix.",
      strongestSignal: null,
      whatKxdIsWatching:
        "Partnership work and website care continue while tracking is being connected.",
      smartestNextMove:
        nextHint ??
        "Share website notes through Website Review anytime — tracking setup is handled by KXD.",
      periodLabel: label,
    };
  }

  if (input.reportingFacts.length === 0) {
    return {
      availability: mapped ? "new-tracking" : "insufficient",
      tone: "unknown",
      whatMovedForward: "Tracking is connected. The first clear performance period is still filling in.",
      whatItMeans:
        "This is a normal early state. We do not show zeros — the story appears once a verified reporting period is ready.",
      strongestSignal: null,
      whatKxdIsWatching:
        "KXD is confirming that visit and search data arrive cleanly for this business.",
      smartestNextMove:
        nextHint ??
        "Continue with planned website updates; the first clear performance story will arrive with the next reporting period.",
      periodLabel: label,
    };
  }

  const usable = input.reportingFacts.filter((f) =>
    (TRACKED_KEYS as readonly string[]).includes(f.metricKey),
  );
  if (usable.length === 0) {
    return {
      availability: "insufficient",
      tone: "unknown",
      whatMovedForward: "Reporting data exists, but client-facing website metrics are not ready yet.",
      whatItMeans:
        "KXD will not invent a performance story from incomplete metrics.",
      strongestSignal: null,
      whatKxdIsWatching: "KXD is reviewing which website and search signals are ready to share.",
      smartestNextMove:
        nextHint ??
        "Keep partnership work moving; clearer performance language will appear when metrics are ready.",
      periodLabel: label,
    };
  }

  return composeReadyStory(usable, input.reportingPeriod, nextHint);
}
