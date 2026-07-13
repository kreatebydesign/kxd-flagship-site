/**
 * Phase 28A — Evidence collection entry point.
 * Phase 28B — Signals adapter + calendar availability evidence.
 */

import type { BriefingInputContext } from "@/lib/intelligence/briefings/types";
import { collectPortfolioEvidence } from "./portfolio";
import { collectScheduleEvidence, type ScheduleEvidenceInput } from "./schedule";
import { collectSignalEvidence, type SignalEvidenceSource } from "./signals";
import type { EvidenceItem } from "../types";

export interface CollectEvidenceInput {
  observedAt: string;
  briefing?: BriefingInputContext | null;
  schedule?: ScheduleEvidenceInput | null;
  signals?: SignalEvidenceSource[] | null;
  calendarAvailable?: boolean | null;
}

export function collectEvidence(input: CollectEvidenceInput): EvidenceItem[] {
  const items: EvidenceItem[] = [];

  if (input.briefing) {
    items.push(...collectPortfolioEvidence(input.briefing, input.observedAt));
  }

  if (input.schedule) {
    items.push(...collectScheduleEvidence(input.schedule));
  }

  if (input.signals && input.signals.length > 0) {
    items.push(...collectSignalEvidence(input.signals, input.observedAt));
  }

  if (input.calendarAvailable === false) {
    items.push({
      id: "evidence-calendar-unavailable",
      kind: "calendar_unavailable",
      domain: "schedule",
      summary: "Calendar is unavailable — schedule visibility is incomplete",
      observedAt: input.observedAt,
      sourceSystem: "google-calendar",
      freshness: "unknown",
      completeness: "partial",
      payload: {},
    });
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
export { collectSignalEvidence, type SignalEvidenceSource } from "./signals";
