/**
 * Phase 28B — Focus Mode adapter over Executive Intelligence.
 * Interprets the canonical recommendation for focus — does not re-rank.
 */

import type { PrimaryRecommendation, UserFacingExplainability } from "../types";

export interface FocusDecisionFromEngine {
  id: string;
  title: string;
  reason: string;
  href?: string;
  whatToDo: string;
  whatToIgnore: string;
  whatCanWait: string;
  whyThisBlock: string;
  whenToStop: string;
}

export function mapRecommendationToFocusDecision(
  rec: PrimaryRecommendation,
  explainability?: UserFacingExplainability | null,
): FocusDecisionFromEngine {
  const whatToIgnore =
    explainability?.tradeoff ??
    "Everything outside this recommendation until the current block ends.";

  const whenToStop =
    rec.decisionClass <= 1
      ? "Stop when integrity is restored or the immediate risk is cleared."
      : rec.decisionClass === 2
        ? "Stop when the current commitment ends or the next one begins."
        : rec.timeSensitivity || "Stop when this one action is complete.";

  return {
    id: rec.id,
    title: rec.action,
    reason: rec.reasoning,
    href: rec.href ?? undefined,
    whatToDo: rec.action,
    whatToIgnore,
    whatCanWait: "Routine portfolio maintenance and non-blocking follow-ups.",
    whyThisBlock:
      explainability?.businessImpact ??
      rec.expectedImpact ??
      rec.reasoning,
    whenToStop,
  };
}
