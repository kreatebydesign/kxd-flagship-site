/**
 * Phase 28B — Operating picture from evidence + interpretations.
 */

import { assessConfidence, evidenceCompleteness } from "../confidence";
import { isScheduleMaterial, type ScheduleEvidenceInput } from "../evidence/schedule";
import type {
  EvidenceItem,
  Interpretation,
  OperatingPicture,
} from "../types";

function schedulePostureFrom(
  schedule: ScheduleEvidenceInput | null | undefined,
  scheduleMaterial: boolean,
  calendarUnavailable: boolean,
): OperatingPicture["schedulePosture"] {
  if (calendarUnavailable) return "unavailable";
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

function portfolioPostureFrom(evidence: EvidenceItem[]): OperatingPicture["portfolioPosture"] {
  if (evidence.some((e) => e.kind === "blocked_work" || e.kind === "overdue_work")) {
    return "pressured";
  }
  if (
    evidence.some(
      (e) =>
        e.kind === "website_review_new" ||
        e.kind === "communication_needs_reply" ||
        e.kind === "high_priority_work",
    )
  ) {
    return "elevated";
  }
  if (evidence.some((e) => ["work", "review", "client"].includes(e.domain))) {
    return "steady";
  }
  return "calm";
}

function clientPostureFrom(evidence: EvidenceItem[]): OperatingPicture["clientPosture"] {
  if (
    evidence.some(
      (e) =>
        e.kind === "communication_needs_reply" ||
        e.kind === "website_review_new" ||
        e.kind === "blocked_work",
    )
  ) {
    return "at_risk";
  }
  if (
    evidence.some(
      (e) => e.kind === "website_review_active" || e.kind === "client_request_open",
    )
  ) {
    return "attention";
  }
  if (evidence.some((e) => e.domain === "client" || e.domain === "relationship")) {
    return "steady";
  }
  return "calm";
}

export function buildOperatingPicture(input: {
  evidence: EvidenceItem[];
  interpretations: Interpretation[];
  schedule?: ScheduleEvidenceInput | null;
  hasBriefing?: boolean;
}): OperatingPicture {
  const scheduleMaterial = input.schedule ? isScheduleMaterial(input.schedule) : false;
  const calendarUnavailable = input.evidence.some((e) => e.kind === "calendar_unavailable");

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

  const confidence = assessConfidence({
    evidence: input.evidence,
    schedule: input.schedule,
    hasBriefing: input.hasBriefing ?? false,
  });

  const schedulePosture = schedulePostureFrom(
    input.schedule,
    scheduleMaterial,
    calendarUnavailable,
  );
  const portfolioPosture = portfolioPostureFrom(input.evidence);
  const clientPosture = clientPostureFrom(input.evidence);

  const posture: OperatingPicture["posture"] =
    schedulePosture === "recovery"
      ? "recovery"
      : schedulePosture === "pressured" || portfolioPosture === "pressured"
        ? "pressured"
        : schedulePosture === "elevated" || portfolioPosture === "elevated"
          ? "elevated"
          : schedulePosture === "calm" && portfolioPosture === "calm"
            ? "calm"
            : "steady";

  return {
    highestPriority: byLeverage[0]?.id ?? null,
    highestRisk: byRisk[0]?.id ?? null,
    highestOpportunity: byOpportunity[0]?.id ?? null,
    highestLeverage: byLeverage[0]?.id ?? null,
    primaryConstraint: byRisk[0]?.summary ?? null,
    schedulePosture,
    portfolioPosture,
    clientPosture,
    recoveryStatus: hasRecovery
      ? "required"
      : input.evidence.some((e) => e.kind === "calendar_drift")
        ? "watch"
        : "none",
    momentumStatus: input.evidence.some(
      (e) => e.kind === "focus_block_available" || e.kind === "open_focus_gap",
    )
      ? "open"
      : input.evidence.some((e) => e.kind === "capacity_overrun" || e.kind === "schedule_compression")
        ? "constrained"
        : "steady",
    recoverability,
    confidence: confidence.level,
    confidenceReasons: confidence.reasons,
    evidenceCompleteness: evidenceCompleteness(input.evidence),
    scheduleMaterial,
    posture,
  };
}
