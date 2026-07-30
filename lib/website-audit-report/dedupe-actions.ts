/**
 * Conservative client-facing action-plan deduplication.
 * Does not mutate stored editor data — apply only when rendering / resolving
 * the client-facing recommendation list.
 */

import { ACTION_PLAN_GROUPS, type CanonicalActionItem } from "./types.ts";

const GROUP_RANK: Record<string, number> = Object.fromEntries(
  ACTION_PLAN_GROUPS.map((g, i) => [g, i]),
);

/** Strip fixture labels and punctuation for comparison only. */
export function normalizeActionText(text: string): string {
  return text
    .replace(/\[local demo\]/gi, " ")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function significantTokens(text: string): Set<string> {
  const stop = new Set([
    "the",
    "and",
    "for",
    "with",
    "your",
    "from",
    "that",
    "this",
    "into",
    "across",
    "a",
    "an",
    "to",
    "of",
    "on",
    "in",
    "or",
    "is",
    "are",
    "be",
    "may",
    "could",
    "more",
  ]);
  return new Set(
    normalizeActionText(text)
      .split(" ")
      .filter((t) => t.length >= 4 && !stop.has(t)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size && !b.size) return 1;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Narrow topic fingerprints — only merge when intent is clearly the same.
 * Similar-but-distinct conversion path vs conversion language stay separate.
 */
export function actionTopicKey(text: string): string | null {
  const t = text.toLowerCase();
  if (/meta\s*description/.test(t)) return "meta-description";
  if (/typograph|type system/.test(t)) return "typography";
  if (/response time|load speed|hosting|caching|image delivery/.test(t)) {
    return "performance-delivery";
  }
  if (/conversion path|book,\s*apply,\s*or contact|primary conversion/.test(t)) {
    return "conversion-path";
  }
  if (/conversion language/.test(t)) return "conversion-language";
  if (/https|mixed[\s-]?content/.test(t)) return "https-mixed-content";
  if (/contrast|accessibility|keyboard focus/.test(t)) return "a11y-contrast";
  return null;
}

function sourceRank(kind: CanonicalActionItem["sourceKind"]): number {
  if (kind === "recommendation") return 0;
  if (kind === "manual") return 1;
  return 2;
}

/**
 * Prefer the strongest / most complete stored wording without inventing text.
 */
export function preferCanonicalAction(
  a: CanonicalActionItem,
  b: CanonicalActionItem,
): CanonicalActionItem {
  const aRank = sourceRank(a.sourceKind);
  const bRank = sourceRank(b.sourceKind);
  let winner = a;
  let other = b;
  if (bRank < aRank) {
    winner = b;
    other = a;
  } else if (bRank === aRank && b.text.trim().length > a.text.trim().length) {
    winner = b;
    other = a;
  }

  const group =
    (GROUP_RANK[a.group] ?? 99) <= (GROUP_RANK[b.group] ?? 99) ? a.group : b.group;

  // Prefer recommendation wording when merging rec+opp; otherwise keep the more complete line.
  let text = winner.text;
  if (winner.sourceKind === "recommendation" && other.sourceKind !== "recommendation") {
    text = winner.text;
  } else if (other.sourceKind === "recommendation" && winner.sourceKind !== "recommendation") {
    text = other.text;
  } else if (other.text.trim().length > winner.text.trim().length) {
    text = other.text;
  }

  return {
    ...winner,
    group,
    // Keep earliest stable order/id from the first-seen item when equal
    order: Math.min(a.order, b.order),
    id: a.order <= b.order ? a.id : b.id,
    sourceId: winner.sourceId,
    sourceKind: winner.sourceKind,
    text,
    included: true,
    hidden: false,
  };
}

export function actionsAreEquivalent(
  a: CanonicalActionItem,
  b: CanonicalActionItem,
): boolean {
  const na = normalizeActionText(a.text);
  const nb = normalizeActionText(b.text);
  if (!na || !nb) return false;
  if (na === nb) return true;

  // Manual items: exact match only (after normalize)
  if (a.sourceKind === "manual" || b.sourceKind === "manual") return false;

  const topicA = actionTopicKey(a.text);
  const topicB = actionTopicKey(b.text);
  if (!topicA || topicA !== topicB) return false;

  const jac = jaccard(significantTokens(a.text), significantTokens(b.text));

  // Recommendation + opportunity on the same narrow topic → material duplicate
  const pair = [a.sourceKind, b.sourceKind].sort().join("+");
  if (pair === "opportunity+recommendation") return true;

  // Same kind: require stronger overlap so distinct recs stay separate
  if (jac >= 0.5) return true;

  // Containment of shorter normalized string
  const shorter = na.length <= nb.length ? na : nb;
  const longer = na.length <= nb.length ? nb : na;
  if (shorter.length >= 24 && longer.includes(shorter) && jac >= 0.35) return true;

  return false;
}

/**
 * Deduplicate included action items for client-facing surfaces only.
 * Preserves first-seen order; merges into the strongest wording/group.
 */
export function dedupeClientActionPlan(
  items: CanonicalActionItem[],
): CanonicalActionItem[] {
  const sorted = [...items]
    .filter((i) => i.included !== false && !i.hidden)
    .sort((a, b) => a.order - b.order);

  const kept: CanonicalActionItem[] = [];
  for (const item of sorted) {
    const idx = kept.findIndex((k) => actionsAreEquivalent(k, item));
    if (idx === -1) {
      kept.push({ ...item, included: true });
      continue;
    }
    kept[idx] = preferCanonicalAction(kept[idx], item);
  }

  return kept.map((item, order) => ({ ...item, order }));
}
