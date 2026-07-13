/**
 * Phase 28A — Evidence collection entry point.
 */

import type { BriefingInputContext } from "@/lib/intelligence/briefings/types";
import { collectPortfolioEvidence } from "./portfolio";
import { collectScheduleEvidence, type ScheduleEvidenceInput } from "./schedule";
import type { EvidenceItem } from "../types";

export interface CollectEvidenceInput {
  observedAt: string;
  briefing?: BriefingInputContext | null;
  schedule?: ScheduleEvidenceInput | null;
}

export function collectEvidence(input: CollectEvidenceInput): EvidenceItem[] {
  const items: EvidenceItem[] = [];

  if (input.briefing) {
    items.push(...collectPortfolioEvidence(input.briefing, input.observedAt));
  }

  if (input.schedule) {
    items.push(...collectScheduleEvidence(input.schedule));
  }

  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export { collectPortfolioEvidence } from "./portfolio";
export { collectScheduleEvidence, isScheduleMaterial, type ScheduleEvidenceInput } from "./schedule";
