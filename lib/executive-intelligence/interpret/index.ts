/**
 * Phase 28A — Evidence → executive meaning (deterministic).
 */

import type { EvidenceItem, EvidenceKind, Interpretation, InterpretationKind } from "../types";

const KIND_TO_INTERPRETATION: Record<
  EvidenceKind,
  { kind: InterpretationKind; leverage: number; risk: number; opportunity: number; confidence: "high" | "medium" | "low" }
> = {
  schedule_recovery: {
    kind: "recovery_opportunity",
    leverage: 95,
    risk: 90,
    opportunity: 70,
    confidence: "high",
  },
  schedule_conflict: {
    kind: "schedule_pressure",
    leverage: 88,
    risk: 85,
    opportunity: 40,
    confidence: "high",
  },
  schedule_compression: {
    kind: "schedule_pressure",
    leverage: 80,
    risk: 75,
    opportunity: 35,
    confidence: "high",
  },
  calendar_drift: {
    kind: "schedule_pressure",
    leverage: 72,
    risk: 65,
    opportunity: 45,
    confidence: "medium",
  },
  current_linked_work: {
    kind: "momentum_opportunity",
    leverage: 78,
    risk: 20,
    opportunity: 82,
    confidence: "high",
  },
  current_external_commitment: {
    kind: "schedule_pressure",
    leverage: 70,
    risk: 30,
    opportunity: 55,
    confidence: "high",
  },
  upcoming_commitment_soon: {
    kind: "schedule_pressure",
    leverage: 75,
    risk: 45,
    opportunity: 50,
    confidence: "high",
  },
  capacity_overrun: {
    kind: "capacity_constraint",
    leverage: 85,
    risk: 70,
    opportunity: 60,
    confidence: "high",
  },
  open_focus_gap: {
    kind: "momentum_opportunity",
    leverage: 65,
    risk: 15,
    opportunity: 70,
    confidence: "high",
  },
  focus_block_available: {
    kind: "momentum_opportunity",
    leverage: 72,
    risk: 20,
    opportunity: 78,
    confidence: "high",
  },
  overdue_work: {
    kind: "delivery_risk",
    leverage: 82,
    risk: 80,
    opportunity: 55,
    confidence: "high",
  },
  blocked_work: {
    kind: "dependency_chain",
    leverage: 88,
    risk: 85,
    opportunity: 45,
    confidence: "high",
  },
  high_priority_work: {
    kind: "momentum_opportunity",
    leverage: 75,
    risk: 55,
    opportunity: 70,
    confidence: "high",
  },
  waiting_on_client: {
    kind: "dependency_chain",
    leverage: 58,
    risk: 45,
    opportunity: 40,
    confidence: "medium",
  },
  website_review_new: {
    kind: "review_bottleneck",
    leverage: 78,
    risk: 65,
    opportunity: 72,
    confidence: "high",
  },
  website_review_active: {
    kind: "review_bottleneck",
    leverage: 72,
    risk: 55,
    opportunity: 68,
    confidence: "high",
  },
  communication_needs_reply: {
    kind: "communication_delay",
    leverage: 76,
    risk: 70,
    opportunity: 65,
    confidence: "high",
  },
  client_request_open: {
    kind: "client_risk",
    leverage: 62,
    risk: 58,
    opportunity: 55,
    confidence: "high",
  },
  review_backlog: {
    kind: "review_bottleneck",
    leverage: 60,
    risk: 50,
    opportunity: 58,
    confidence: "high",
  },
  workload_pressure: {
    kind: "capacity_constraint",
    leverage: 70,
    risk: 65,
    opportunity: 40,
    confidence: "medium",
  },
  schedule_quiet: {
    kind: "steady_operations",
    leverage: 40,
    risk: 10,
    opportunity: 35,
    confidence: "high",
  },
  calendar_unavailable: {
    kind: "schedule_pressure",
    leverage: 50,
    risk: 40,
    opportunity: 20,
    confidence: "medium",
  },
  executive_signal: {
    kind: "signal_attention",
    leverage: 45,
    risk: 35,
    opportunity: 40,
    confidence: "medium",
  },
  activity_elevated: {
    kind: "signal_attention",
    leverage: 48,
    risk: 40,
    opportunity: 35,
    confidence: "medium",
  },
  memory_pattern: {
    kind: "steady_operations",
    leverage: 35,
    risk: 20,
    opportunity: 30,
    confidence: "low",
  },
};

export function interpretEvidence(evidence: EvidenceItem[]): Interpretation[] {
  return evidence.map((item) => {
    const mapping = KIND_TO_INTERPRETATION[item.kind];
    return {
      id: `interpretation-${item.id}`,
      kind: mapping.kind,
      evidenceIds: [item.id],
      summary: `${mapping.kind.replace(/_/g, " ")}: ${item.summary}`,
      leverage: mapping.leverage,
      risk: mapping.risk,
      opportunity: mapping.opportunity,
      confidence: mapping.confidence,
    };
  });
}
