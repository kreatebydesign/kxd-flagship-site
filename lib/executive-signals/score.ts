/**
 * Scoring model — deterministic, taxonomy-based.
 */

import type { ExecutiveActivityItem } from "@/lib/activity-engine";
import type {
  SignalDomain,
  SignalFreshness,
  SignalImportance,
  SignalScore,
  SignalUrgency,
  SignalVisibility,
} from "./types";

interface TaxonomyHit {
  domain: SignalDomain;
  businessImpact: number;
  urgencyBoost: number;
  elevate: boolean;
}

const ELEVATE_TAXONOMY: Array<{ pattern: RegExp; hit: TaxonomyHit }> = [
  {
    pattern: /website-review\.(submitted|completed|resolved)|revision/i,
    hit: { domain: "review", businessImpact: 82, urgencyBoost: 2, elevate: true },
  },
  {
    pattern: /review\.?(waiting|new)|waiting.*review/i,
    hit: { domain: "review", businessImpact: 78, urgencyBoost: 2, elevate: true },
  },
  {
    pattern: /work\.(completed|blocked)/i,
    hit: { domain: "work", businessImpact: 80, urgencyBoost: 2, elevate: true },
  },
  {
    pattern: /work\.(waiting|waiting-on-client|waiting-on-kxd)/i,
    hit: { domain: "work", businessImpact: 74, urgencyBoost: 2, elevate: true },
  },
  {
    pattern: /overdue|high-priority.*overdue/i,
    hit: { domain: "work", businessImpact: 88, urgencyBoost: 3, elevate: true },
  },
  {
    pattern: /invoice\.(paid|overdue)|payment\.(received|failed)/i,
    hit: { domain: "finance", businessImpact: 90, urgencyBoost: 3, elevate: true },
  },
  {
    pattern: /proposal\.(sent|accepted|declined)/i,
    hit: { domain: "finance", businessImpact: 86, urgencyBoost: 2, elevate: true },
  },
  {
    pattern: /training\.(completed|milestone)|lesson\.completed/i,
    hit: { domain: "training", businessImpact: 62, urgencyBoost: 0, elevate: true },
  },
  {
    pattern: /onboarding\.(completed|finished)/i,
    hit: { domain: "onboarding", businessImpact: 84, urgencyBoost: 1, elevate: true },
  },
  {
    pattern: /client\.(health|created)|relationship/i,
    hit: { domain: "client", businessImpact: 76, urgencyBoost: 1, elevate: true },
  },
  {
    pattern: /communication\.needs-reply|needs-reply/i,
    hit: { domain: "relationship", businessImpact: 80, urgencyBoost: 2, elevate: true },
  },
  {
    pattern: /work\.(created|started|review|status-changed)/i,
    hit: { domain: "work", businessImpact: 58, urgencyBoost: 0, elevate: true },
  },
  {
    pattern: /milestone/i,
    hit: { domain: "client", businessImpact: 70, urgencyBoost: 1, elevate: true },
  },
];

function importanceFromActivity(item: ExecutiveActivityItem): SignalImportance {
  return item.importance;
}

function freshnessFromOccurredAt(occurredAt: string): SignalFreshness {
  const ageMs = Date.now() - new Date(occurredAt).getTime();
  if (Number.isNaN(ageMs) || ageMs < 0) return "recent";
  const hours = ageMs / (1000 * 60 * 60);
  if (hours <= 6) return "fresh";
  if (hours <= 36) return "recent";
  if (hours <= 96) return "aging";
  return "stale";
}

function freshnessPoints(freshness: SignalFreshness): number {
  switch (freshness) {
    case "fresh":
      return 20;
    case "recent":
      return 14;
    case "aging":
      return 6;
    default:
      return 0;
  }
}

function importancePoints(importance: SignalImportance): number {
  switch (importance) {
    case "critical":
      return 40;
    case "high":
      return 28;
    case "normal":
      return 12;
    default:
      return 4;
  }
}

function resolveTaxonomy(item: ExecutiveActivityItem): TaxonomyHit {
  const haystack = `${item.eventType} ${item.title} ${item.summary ?? ""} ${item.sourceModule}`;
  for (const row of ELEVATE_TAXONOMY) {
    if (row.pattern.test(haystack)) return row.hit;
  }

  if (item.clientId != null || item.reviewId != null) {
    return { domain: "client", businessImpact: 48, urgencyBoost: 0, elevate: false };
  }
  if (item.workId != null) {
    return { domain: "work", businessImpact: 42, urgencyBoost: 0, elevate: false };
  }
  return { domain: "system", businessImpact: 15, urgencyBoost: 0, elevate: false };
}

function urgencyFrom(item: ExecutiveActivityItem, boost: number): SignalUrgency {
  const hay = `${item.eventType} ${item.title}`.toLowerCase();
  if (boost >= 3 || /overdue|critical|blocked|unpaid/.test(hay)) return "critical";
  if (boost >= 2 || item.importance === "high" || /waiting|needs-reply|submitted/.test(hay)) {
    return "high";
  }
  if (item.importance === "normal" || boost >= 1) return "medium";
  return "low";
}

export function scoreActivityItem(item: ExecutiveActivityItem): {
  score: SignalScore;
  domain: SignalDomain;
  elevate: boolean;
} {
  const taxonomy = resolveTaxonomy(item);
  const importance = importanceFromActivity(item);
  const freshness = freshnessFromOccurredAt(item.occurredAt);
  const urgency = urgencyFrom(item, taxonomy.urgencyBoost);
  const businessImpact = Math.min(
    100,
    taxonomy.businessImpact +
      (item.clientId != null ? 6 : 0) +
      (importance === "critical" ? 10 : importance === "high" ? 5 : 0),
  );

  const rank =
    businessImpact +
    importancePoints(importance) +
    freshnessPoints(freshness) +
    (urgency === "critical" ? 18 : urgency === "high" ? 12 : urgency === "medium" ? 5 : 0) +
    (item.read ? 0 : 8) +
    (taxonomy.elevate ? 10 : -20);

  const requiresAttention =
    taxonomy.elevate &&
    businessImpact >= 55 &&
    freshness !== "stale" &&
    (importance !== "low" || urgency === "high" || urgency === "critical");

  const visibility: SignalVisibility =
    requiresAttention && rank >= 70 ? "executive" : "history";

  return {
    domain: taxonomy.domain,
    elevate: taxonomy.elevate,
    score: {
      importance,
      urgency,
      freshness,
      businessImpact,
      requiresAttention,
      visibility,
      rank,
    },
  };
}

/** Minimum rank to appear on Executive Today. */
export const EXECUTIVE_SIGNAL_RANK_FLOOR = 70;
