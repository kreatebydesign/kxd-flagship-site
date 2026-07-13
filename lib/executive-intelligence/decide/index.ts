/**
 * Phase 28A — Operating picture from evidence + interpretations.
 */

import { isScheduleMaterial, type ScheduleEvidenceInput } from "../evidence/schedule";
import type {
  EvidenceItem,
  ExecutiveConfidence,
  Interpretation,
  OperatingPicture,
} from "../types";

function postureFromSchedule(
  schedule: ScheduleEvidenceInput | null | undefined,
  scheduleMaterial: boolean,
): OperatingPicture["posture"] {
  if (!schedule || !scheduleMaterial) return "calm";
  switch (schedule.orientation) {
    case "recovery_required":
      return "recovery";
    case "compressed":
    case "overloaded":
    case "commitment_at_risk":
      return "pressured";
    case "fragmented":
      return "elevated";
    case "clear":
    case "focused":
      return "calm";
    default:
      return "steady";
  }
}

function aggregateConfidence(interpretations: Interpretation[]): ExecutiveConfidence {
  if (interpretations.some((i) => i.confidence === "high" && i.risk >= 70)) return "high";
  if (interpretations.some((i) => i.confidence === "high")) return "high";
  if (interpretations.some((i) => i.confidence === "medium")) return "medium";
  return interpretations.length > 0 ? "medium" : "low";
}

export function buildOperatingPicture(input: {
  evidence: EvidenceItem[];
  interpretations: Interpretation[];
  schedule?: ScheduleEvidenceInput | null;
}): OperatingPicture {
  const scheduleMaterial = input.schedule ? isScheduleMaterial(input.schedule) : false;

  const byRisk = [...input.interpretations].sort((a, b) => b.risk - a.risk);
  const byOpportunity = [...input.interpretations].sort((a, b) => b.opportunity - a.opportunity);
  const byLeverage = [...input.interpretations].sort((a, b) => b.leverage - a.leverage);

  const hasRecovery = input.evidence.some((e) => e.kind === "schedule_recovery");
  const recoverability: OperatingPicture["recoverability"] = hasRecovery
    ? "high"
    : input.evidence.some((e) => e.kind === "schedule_conflict" || e.kind === "capacity_overrun")
      ? "medium"
      : scheduleMaterial
        ? "low"
        : "none";

  return {
    highestPriority: byLeverage[0]?.id ?? null,
    highestRisk: byRisk[0]?.id ?? null,
    highestOpportunity: byOpportunity[0]?.id ?? null,
    highestLeverage: byLeverage[0]?.id ?? null,
    recoverability,
    confidence: aggregateConfidence(input.interpretations),
    scheduleMaterial,
    posture: postureFromSchedule(input.schedule, scheduleMaterial),
  };
}
