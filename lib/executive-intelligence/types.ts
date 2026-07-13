/**
 * Phase 28A/28B — Executive Intelligence Engine types.
 * Deterministic executive reasoning. No AI. No prose generation.
 */

export type ExecutiveConfidence = "low" | "medium" | "high" | "unknown";

export type ExecutiveUrgency = "low" | "medium" | "high" | "critical";

export type ExecutiveReversibility = "easy" | "moderate" | "hard";

/**
 * Cross-domain arbitration classes (lower = higher priority).
 * Schedule and portfolio candidates compete inside one system.
 */
export type DecisionClass =
  | 0 // Integrity and recovery
  | 1 // Immediate commitment risk
  | 2 // Active time-sensitive execution
  | 3 // Highest leverage opportunity
  | 4 // Portfolio maintenance
  | 5; // Calm continuation

export const DECISION_CLASS_LABEL: Record<DecisionClass, string> = {
  0: "Integrity and recovery",
  1: "Immediate commitment risk",
  2: "Active time-sensitive execution",
  3: "Highest leverage opportunity",
  4: "Portfolio maintenance",
  5: "Calm continuation",
};

export type EvidenceDomain =
  | "schedule"
  | "work"
  | "review"
  | "relationship"
  | "client"
  | "capacity"
  | "signal"
  | "activity"
  | "memory";

export type EvidenceKind =
  | "schedule_recovery"
  | "schedule_conflict"
  | "schedule_compression"
  | "calendar_drift"
  | "calendar_unavailable"
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
  | "schedule_quiet"
  | "executive_signal"
  | "activity_elevated"
  | "memory_pattern";

export interface EvidenceItem {
  id: string;
  kind: EvidenceKind;
  domain: EvidenceDomain;
  summary: string;
  observedAt: string;
  payload: Record<string, unknown>;
  sourceRef?: string | null;
  /** Source system that produced this fact. */
  sourceSystem?: string | null;
  /** Freshness: how current the observation is. */
  freshness?: "current" | "recent" | "stale" | "unknown";
  /** Completeness of this evidence item. */
  completeness?: "complete" | "partial" | "unknown";
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
  | "steady_operations"
  | "signal_attention";

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
  primaryConstraint: string | null;
  schedulePosture: "recovery" | "pressured" | "elevated" | "steady" | "calm" | "unavailable";
  portfolioPosture: "pressured" | "elevated" | "steady" | "calm";
  clientPosture: "at_risk" | "attention" | "steady" | "calm";
  recoveryStatus: "required" | "watch" | "none";
  momentumStatus: "open" | "constrained" | "steady";
  recoverability: "high" | "medium" | "low" | "none";
  confidence: ExecutiveConfidence;
  confidenceReasons: string[];
  evidenceCompleteness: "complete" | "partial" | "sparse";
  scheduleMaterial: boolean;
  posture: "recovery" | "pressured" | "elevated" | "steady" | "calm";
}

export type RecommendationActionType =
  | "recover"
  | "decide"
  | "continue"
  | "prepare"
  | "reduce"
  | "begin"
  | "protect"
  | "triage"
  | "reply"
  | "review"
  | "maintain"
  | "calm";

export interface OutrankedCandidateSummary {
  id: string;
  action: string;
  decisionClass: DecisionClass;
  reason: string;
}

export interface PrimaryRecommendation {
  id: string;
  action: string;
  actionType: RecommendationActionType;
  reasoning: string;
  evidenceIds: string[];
  interpretationIds: string[];
  confidence: ExecutiveConfidence;
  urgency: ExecutiveUrgency;
  reversibility: ExecutiveReversibility;
  href: string | null;
  hrefLabel: string | null;
  timeSensitivity: string;
  source: "schedule" | "portfolio" | "signal" | "calm";
  decisionClass: DecisionClass;
  clientName?: string | null;
  itemTitle?: string | null;
  subject?: string | null;
  expectedImpact?: string | null;
  tradeoff?: string | null;
  /** Deterministic fingerprint for stability / thrash prevention. */
  fingerprint: string;
}

export interface DecisionPathStep {
  layer: "evidence" | "interpretation" | "decision" | "recommendation";
  label: string;
  detail: string;
}

/**
 * Internal explainability — full diagnostic contract.
 */
export interface Explainability {
  evidence: EvidenceItem[];
  interpretations: Interpretation[];
  decisionPath: DecisionPathStep[];
  confidenceRationale: string;
  confidenceReasons: string[];
  decisionClass: DecisionClass;
  decisionClassLabel: string;
  outranked: OutrankedCandidateSummary[];
  missingEvidence: string[];
  tradeoff: string | null;
  expectedImpact: string | null;
  freshness: string;
}

/**
 * User-facing explainability — progressive disclosure. No raw IDs.
 */
export interface UserFacingExplainability {
  headline: string;
  decision: string;
  keyEvidence: string[];
  businessImpact: string | null;
  tradeoff: string | null;
  confidence: ExecutiveConfidence;
  confidenceReasons: string[];
  freshness: string;
  missingInformation: string[];
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
  confidence: ExecutiveConfidence;
  tradeoff: string | null;
  freshness: string;
}

export interface ExecutiveIntelligenceSurface {
  evidence: EvidenceItem[];
  interpretations: Interpretation[];
  decision: OperatingPicture;
  recommendation: PrimaryRecommendation;
  narrativeInput: NarrativeInput;
  explainability: Explainability;
  userExplainability: UserFacingExplainability;
  generatedAt: string;
}
