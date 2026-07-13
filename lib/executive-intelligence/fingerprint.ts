/**
 * Phase 28B — Deterministic recommendation fingerprint + stability rules.
 * Same material evidence → same fingerprint. Minor metadata does not thrash.
 */

import type { DecisionClass, PrimaryRecommendation } from "./types";

/**
 * Fingerprint ignores timestamps and display-only fields.
 * Material identity: id + decisionClass + actionType + subject + href + urgency.
 */
export function recommendationFingerprint(rec: {
  id: string;
  decisionClass: DecisionClass;
  actionType: string;
  subject?: string | null;
  href?: string | null;
  urgency: string;
  evidenceIds: string[];
}): string {
  const evidenceKey = [...rec.evidenceIds].sort().join(",");
  return [
    rec.id,
    `c${rec.decisionClass}`,
    rec.actionType,
    rec.subject ?? "",
    rec.href ?? "",
    rec.urgency,
    evidenceKey,
  ].join("|");
}

/**
 * Stability: preserve current recommendation when new candidate is materially equivalent.
 * Replace when higher decision class (lower number), material urgency change, or invalid.
 */
export function shouldReplaceRecommendation(
  current: PrimaryRecommendation | null,
  next: PrimaryRecommendation,
): boolean {
  if (!current) return true;
  if (current.fingerprint === next.fingerprint) return false;
  if (next.decisionClass < current.decisionClass) return true;
  if (next.urgency !== current.urgency && urgencyMateriallyHigher(current.urgency, next.urgency)) {
    return true;
  }
  // Same class, different subject — replace (prior action no longer valid identity)
  if (current.id !== next.id) return true;
  return false;
}

function urgencyMateriallyHigher(
  current: string,
  next: string,
): boolean {
  const rank: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
  return (rank[next] ?? 0) > (rank[current] ?? 0);
}
