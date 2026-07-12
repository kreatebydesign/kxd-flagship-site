/**
 * Legacy activity filter — retained for adapters.
 * Executive surfaces should use @/lib/executive-signals (Phase 23B).
 */

import type { ExecutiveActivityItem } from "@/lib/activity-engine";

const FETCH_WINDOW = 40;
const SURFACE_LIMIT = 6;

const NOISE_EVENT_PATTERNS = [
  /^work\.updated$/i,
  /\.updated$/i,
  /heartbeat/i,
  /sync\.?/i,
  /seed/i,
  /backfill/i,
  /system\./i,
];

const MEANINGFUL_EVENT_PATTERNS = [
  /^work\.(created|completed|started|waiting|blocked|review|status-changed)$/i,
  /website-review/i,
  /communication/i,
  /client\./i,
  /proposal/i,
  /invoice/i,
  /payment/i,
  /retainer/i,
  /training/i,
  /onboarding/i,
];

const MEANINGFUL_MODULES = [
  "work",
  "client",
  "client success",
  "client command",
  "sales",
  "retainers",
  "emails",
  "training",
  "website",
  "review",
  "finance",
];

function isNoise(item: ExecutiveActivityItem): boolean {
  const type = item.eventType || "";
  if (NOISE_EVENT_PATTERNS.some((p) => p.test(type))) {
    if (item.importance === "low" || item.importance === "normal") return true;
  }
  if (item.importance === "low" && !item.clientId && !item.workId && !item.reviewId) {
    return true;
  }
  return false;
}

function isMeaningful(item: ExecutiveActivityItem): boolean {
  if (item.importance === "critical" || item.importance === "high") return true;

  const type = item.eventType || "";
  if (MEANINGFUL_EVENT_PATTERNS.some((p) => p.test(type))) return true;

  const module = (item.sourceModule || "").toLowerCase();
  if (MEANINGFUL_MODULES.some((m) => module.includes(m))) return true;

  if (item.clientId != null || item.reviewId != null) return true;
  if (item.workId != null && !/^work\.updated$/i.test(type)) return true;

  return false;
}

function rank(item: ExecutiveActivityItem): number {
  let score = 0;
  if (item.importance === "critical") score += 40;
  else if (item.importance === "high") score += 28;
  else if (item.importance === "normal") score += 12;
  else score += 2;

  if (!item.read) score += 8;
  if (item.clientId != null) score += 10;
  if (item.reviewId != null) score += 10;
  if (item.workId != null) score += 6;

  const type = item.eventType || "";
  if (/website-review|proposal|invoice|payment|blocked|needs-reply/i.test(type)) score += 12;
  if (/training/i.test(type) || /training/i.test(item.sourceModule)) score += 8;
  if (/work\.completed|work\.created|work\.started/i.test(type)) score += 6;

  return score;
}

export function selectMeaningfulActivity(
  items: ExecutiveActivityItem[],
  limit = SURFACE_LIMIT,
): ExecutiveActivityItem[] {
  const filtered = items.filter((item) => !isNoise(item) && isMeaningful(item));
  const pool = filtered.length > 0 ? filtered : items.filter((item) => !isNoise(item));

  return [...pool]
    .sort((a, b) => {
      const byRank = rank(b) - rank(a);
      if (byRank !== 0) return byRank;
      return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
    })
    .slice(0, limit);
}

export const EXECUTIVE_CONTEXT_ACTIVITY_FETCH = FETCH_WINDOW;
