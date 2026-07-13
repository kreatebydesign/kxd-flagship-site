/**
 * Phase 28B — Adapters for Executive Today surfaces.
 */

import type { ExecutiveTodayRecommendation } from "@/lib/executive-today/brief/types";
import type { ExecutiveTodayPrimary } from "@/lib/executive-today/types";
import type { PrimaryRecommendation, UserFacingExplainability } from "../types";

export function mapRecommendationToTodayBrief(
  rec: PrimaryRecommendation,
  evidenceSummaries: string[],
): ExecutiveTodayRecommendation {
  return {
    action: rec.action,
    reason: rec.reasoning,
    timeSensitivity: rec.timeSensitivity,
    href: rec.href,
    hrefLabel: rec.hrefLabel,
    evidence: evidenceSummaries.length > 0 ? evidenceSummaries : [rec.reasoning],
  };
}

export function mapRecommendationToTodayPrimary(
  rec: PrimaryRecommendation,
): ExecutiveTodayPrimary {
  const from =
    rec.source === "schedule"
      ? ("calendar-brief" as const)
      : rec.source === "portfolio"
        ? ("first-action" as const)
        : rec.source === "calm"
          ? ("calm" as const)
          : ("recommendation" as const);

  return {
    title: rec.action,
    detail: rec.reasoning,
    href: rec.href,
    hrefLabel: rec.hrefLabel,
    reason: rec.timeSensitivity || rec.subject || rec.reasoning,
    from,
  };
}

export type { UserFacingExplainability };
