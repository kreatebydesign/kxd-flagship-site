/**
 * Group near-duplicate executive candidates into one signal.
 */

import type { ExecutiveActivityItem } from "@/lib/activity-engine";
import type { ExecutiveSignal, SignalDomain, SignalScore } from "./types";
import { scoreActivityItem } from "./score";

type Scored = {
  item: ExecutiveActivityItem;
  domain: SignalDomain;
  score: SignalScore;
};

const GROUP_LABELS: Array<{ pattern: RegExp; singular: string; plural: string }> = [
  { pattern: /infrastructure/i, singular: "infrastructure update", plural: "infrastructure updates" },
  { pattern: /registry/i, singular: "registry update", plural: "registry updates" },
  { pattern: /website-review|revision/i, singular: "website review", plural: "website reviews" },
  { pattern: /work\.completed/i, singular: "work completion", plural: "work completions" },
  { pattern: /work\.blocked/i, singular: "blocked work item", plural: "blocked work items" },
  { pattern: /work\.waiting/i, singular: "waiting work item", plural: "waiting work items" },
  { pattern: /proposal/i, singular: "proposal event", plural: "proposal events" },
  { pattern: /invoice|payment/i, singular: "finance event", plural: "finance events" },
  { pattern: /training/i, singular: "training milestone", plural: "training milestones" },
  { pattern: /onboarding/i, singular: "onboarding milestone", plural: "onboarding milestones" },
];

function groupKey(item: ExecutiveActivityItem, domain: SignalDomain): string {
  const type = (item.eventType || "unknown").toLowerCase();
  if (
    item.clientId != null &&
    /proposal\.accepted|invoice\.paid|website-review\.submitted|onboarding\.completed/i.test(type)
  ) {
    return `unique:${item.id}`;
  }
  return `${domain}|${type}`;
}

function labelForGroup(eventType: string, count: number): string {
  for (const row of GROUP_LABELS) {
    if (row.pattern.test(eventType)) {
      return count === 1 ? row.singular : `${count} ${row.plural} completed`;
    }
  }
  return count === 1 ? "business update" : `${count} business updates completed`;
}

function mergeScores(scores: SignalScore[]): SignalScore {
  const best = [...scores].sort((a, b) => b.rank - a.rank)[0];
  return {
    ...best,
    businessImpact: Math.max(...scores.map((s) => s.businessImpact)),
    requiresAttention: scores.some((s) => s.requiresAttention),
    visibility: scores.some((s) => s.visibility === "executive") ? "executive" : "history",
    rank: Math.max(...scores.map((s) => s.rank)) + Math.min(8, scores.length),
  };
}

export function groupScoredActivity(scored: Scored[]): ExecutiveSignal[] {
  const buckets = new Map<string, Scored[]>();

  for (const row of scored) {
    const key = groupKey(row.item, row.domain);
    const list = buckets.get(key) ?? [];
    list.push(row);
    buckets.set(key, list);
  }

  const signals: ExecutiveSignal[] = [];

  for (const [, rows] of buckets) {
    rows.sort(
      (a, b) => new Date(b.item.occurredAt).getTime() - new Date(a.item.occurredAt).getTime(),
    );
    const primary = rows[0];
    const count = rows.length;
    const grouped = count > 1;
    const score = mergeScores(rows.map((r) => r.score));

    signals.push({
      id: grouped
        ? `signal-group-${primary.domain}-${primary.item.eventType}`
        : `signal-${primary.item.id}`,
      title: grouped ? labelForGroup(primary.item.eventType, count) : primary.item.title,
      summary: grouped
        ? `Grouped from ${count} related Activity events.`
        : primary.item.summary,
      href: primary.item.href,
      domain: primary.domain,
      score,
      sourceActivityIds: rows.map((r) => r.item.id),
      sourceCount: count,
      occurredAt: primary.item.occurredAt,
      clientId: grouped ? null : primary.item.clientId,
      clientName: grouped ? null : primary.item.clientName,
      eventType: primary.item.eventType,
      grouped,
    });
  }

  return signals;
}

export function scoreItems(items: ExecutiveActivityItem[]): Scored[] {
  return items.map((item) => {
    const { score, domain } = scoreActivityItem(item);
    return { item, score, domain };
  });
}
