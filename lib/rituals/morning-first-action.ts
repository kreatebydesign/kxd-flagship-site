/**
 * Morning Brief — single recommended first action via Executive Intelligence Engine.
 * No additional database queries.
 */

import {
  composeExecutiveIntelligence,
  mapRecommendationToMorningFirstAction,
} from "@/lib/executive-intelligence";
import type { BriefingInputContext } from "@/lib/intelligence/briefings/types";

export type MorningFirstActionKind =
  | "website-review-new"
  | "website-review-active"
  | "communication"
  | "work"
  | "client-request"
  | "none";

export interface MorningFirstAction {
  title: string;
  kind: MorningFirstActionKind;
  hasAction: boolean;
  label: string;
  clientName: string | null;
  itemTitle: string | null;
  detail: string | null;
  href: string | null;
  hrefLabel: string | null;
}

/**
 * Pick exactly one founder-facing first action from live briefing context.
 */
export function buildMorningFirstAction(input: BriefingInputContext): MorningFirstAction {
  const intelligence = composeExecutiveIntelligence({
    observedAt: input.generatedAt,
    briefing: input,
  });
  return mapRecommendationToMorningFirstAction(intelligence.recommendation);
}
