/**
 * Phase 28A — Executive Intelligence Engine types.
 * Deterministic executive reasoning. No AI. No prose generation.
 */

export type ExecutiveConfidence = "low" | "medium" | "high";

export type ExecutiveUrgency = "low" | "medium" | "high" | "critical";

export type ExecutiveReversibility = "easy" | "moderate" | "hard";

export type EvidenceDomain =
  | "schedule"
  | "work"
  | "review"
  | "relationship"
  | "client"
  | "capacity";

export type EvidenceKind =
  | "schedule_recovery"
  | "schedule_conflict"
  | "schedule_compression"
  | "calendar_drift"
  | "current_linked_work"
  | "current_external_commitment"
  | "upcoming_commitment_soon"
  | "capacity_overrun"
  | "open_focus_gap"
  | "focus_block_available"
  | "overdue_work"
  | "blocked_work"
  | "high_priority_work"
  | "waiting_on_client"
  | "website_review_new"
  | "website_review_active"
  | "communication_needs_reply"
  | "client_request_open"
  | "review_backlog"
  | "workload_pressure"
  | "schedule_quiet";

export interface EvidenceItem {
  id: string;
  kind: EvidenceKind;
  domain: EvidenceDomain;
  summary: string;
  observedAt: string;
  payload: Record<string, unknown>;
  sourceRef?: string | null;
}

export type InterpretationKind =
  | "client_risk"
  | "schedule_pressure"
  | "recovery_opportunity"
  | "momentum_opportunity"
  | "capacity_constraint"
  | "dependency_chain"
  | "review_bottleneck"
  | "communication_delay"
  | "delivery_risk"
  | "steady_operations";

export interface Interpretation {
  id: string;
  kind: InterpretationKind;
  evidenceIds: string[];
  summary: string;
  leverage: number;
  risk: number;
  opportunity: number;
  confidence: ExecutiveConfidence;
}

export interface OperatingPicture {
  highestPriority: string | null;
  highestRisk: string | null;
  highestOpportunity: string | null;
  highestLeverage: string | null;
  recoverability: "high" | "medium" | "low" | "none";
  confidence: ExecutiveConfidence;
  scheduleMaterial: boolean;
  posture: "recovery" | "pressured" | "elevated" | "steady" | "calm";
}

export interface PrimaryRecommendation {
  id: string;
  action: string;
  reasoning: string;
  evidenceIds: string[];
  interpretationIds: string[];
  confidence: ExecutiveConfidence;
  urgency: ExecutiveUrgency;
  reversibility: ExecutiveReversibility;
  href: string | null;
  hrefLabel: string | null;
  timeSensitivity: string;
  source: "schedule" | "portfolio" | "calm";
  clientName?: string | null;
  itemTitle?: string | null;
}

export interface DecisionPathStep {
  layer: "evidence" | "interpretation" | "decision" | "recommendation";
  label: string;
  detail: string;
}

export interface Explainability {
  evidence: EvidenceItem[];
  interpretations: Interpretation[];
  decisionPath: DecisionPathStep[];
  confidenceRationale: string;
}

export interface NarrativeInput {
  posture: OperatingPicture["posture"];
  scheduleMaterial: boolean;
  primaryAction: string;
  primaryReason: string;
  riskSignals: string[];
  opportunitySignals: string[];
  capacitySummary: string | null;
  evidenceHighlights: Array<{ id: string; summary: string }>;
}

export interface ExecutiveIntelligenceSurface {
  evidence: EvidenceItem[];
  interpretations: Interpretation[];
  decision: OperatingPicture;
  recommendation: PrimaryRecommendation;
  narrativeInput: NarrativeInput;
  explainability: Explainability;
  generatedAt: string;
}
