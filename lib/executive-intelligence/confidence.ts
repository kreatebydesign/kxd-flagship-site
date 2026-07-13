/**
 * Phase 28B — Durable confidence model.
 * Levels: high | medium | low | unknown. No fabricated percentages.
 */

import type { EvidenceItem, ExecutiveConfidence } from "./types";
import type { ScheduleEvidenceInput as ScheduleInput } from "./evidence/schedule";

export interface ConfidenceAssessment {
  level: ExecutiveConfidence;
  reasons: string[];
}

export function assessConfidence(input: {
  evidence: EvidenceItem[];
  schedule?: ScheduleInput | null;
  hasBriefing: boolean;
}): ConfidenceAssessment {
  const reasons: string[] = [];
  let level: ExecutiveConfidence = "high";

  const hasScheduleEvidence = input.evidence.some(
    (e) => e.domain === "schedule" || e.domain === "capacity",
  );
  const hasPortfolioEvidence = input.evidence.some((e) =>
    ["work", "review", "relationship", "client"].includes(e.domain),
  );

  if (!input.hasBriefing && !hasScheduleEvidence) {
    reasons.push("Limited portfolio and schedule evidence");
    level = "unknown";
  }

  if (input.schedule?.capacity.capacityConfidence === "unknown") {
    reasons.push("Estimated duration is missing — capacity is imprecise");
    if (level === "high") level = "medium";
  } else if (input.schedule?.capacity.capacityConfidence === "partial") {
    reasons.push("Some planned work has no duration estimate");
    if (level === "high") level = "medium";
  }

  if (input.schedule && !input.schedule.observedAt) {
    reasons.push("Calendar observation timestamp missing");
    if (level === "high") level = "medium";
  }

  const calendarUnavailable = input.evidence.some((e) => e.kind === "calendar_unavailable");
  if (calendarUnavailable) {
    reasons.push("Calendar is unavailable — schedule visibility is incomplete");
    if (level === "high") level = "medium";
  }

  const stale = input.evidence.filter((e) => e.freshness === "stale");
  if (stale.length > 0) {
    reasons.push(`${stale.length} evidence item${stale.length === 1 ? "" : "s"} may be stale`);
    if (level === "high") level = "medium";
  }

  const partial = input.evidence.filter((e) => e.completeness === "partial");
  if (partial.length >= 2) {
    reasons.push("Multiple evidence items are incomplete");
    if (level === "high") level = "medium";
  }

  if (hasScheduleEvidence && hasPortfolioEvidence) {
    reasons.unshift("Schedule and portfolio evidence are both present");
  } else if (hasScheduleEvidence) {
    reasons.unshift("Schedule evidence is current");
  } else if (hasPortfolioEvidence) {
    reasons.unshift("Portfolio evidence is known");
  }

  if (reasons.length === 0) {
    reasons.push("Direct evidence is current and complete");
  }

  // Cap: never claim high when calendar unavailable and schedule path was expected
  if (calendarUnavailable && level === "high") {
    level = "medium";
  }

  return { level, reasons: reasons.slice(0, 5) };
}

export function evidenceCompleteness(
  evidence: EvidenceItem[],
): "complete" | "partial" | "sparse" {
  if (evidence.length === 0) return "sparse";
  const partialCount = evidence.filter(
    (e) => e.completeness === "partial" || e.completeness === "unknown",
  ).length;
  if (partialCount === 0 && evidence.length >= 1) return "complete";
  if (evidence.length <= 1) return "sparse";
  return "partial";
}
