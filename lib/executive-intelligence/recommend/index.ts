/**
 * Phase 28B — Primary recommendation selection with cross-domain arbitration.
 * Exactly one primary recommendation. DecisionClass 0–5. Deterministic ties.
 */

import { EXECUTIVE_URGENCY_RANK } from "../constants";
import type { ScheduleEvidenceInput } from "../evidence/schedule";
import { recommendationFingerprint } from "../fingerprint";
import type {
  EvidenceItem,
  ExecutiveConfidence,
  Interpretation,
  OperatingPicture,
  OutrankedCandidateSummary,
  PrimaryRecommendation,
  UserFacingExplainability,
} from "../types";
import { DECISION_CLASS_LABEL } from "../types";
import {
  buildPortfolioCandidates,
  buildScheduleCandidates,
  type RecommendationCandidate,
} from "./candidates";

function withFingerprint(
  rec: Omit<PrimaryRecommendation, "fingerprint">,
): PrimaryRecommendation {
  return {
    ...rec,
    fingerprint: recommendationFingerprint({
      id: rec.id,
      decisionClass: rec.decisionClass,
      actionType: rec.actionType,
      subject: rec.subject ?? rec.itemTitle,
      href: rec.href,
      urgency: rec.urgency,
      evidenceIds: rec.evidenceIds,
    }),
  };
}

function compareCandidates(a: RecommendationCandidate, b: RecommendationCandidate): number {
  if (a.decisionClass !== b.decisionClass) return a.decisionClass - b.decisionClass;
  if (b.secondary !== a.secondary) return b.secondary - a.secondary;
  const ua = EXECUTIVE_URGENCY_RANK[a.recommendation.urgency];
  const ub = EXECUTIVE_URGENCY_RANK[b.recommendation.urgency];
  if (ub !== ua) return ub - ua;
  return a.recommendation.id.localeCompare(b.recommendation.id);
}

export function selectPrimaryRecommendation(input: {
  evidence: EvidenceItem[];
  interpretations: Interpretation[];
  decision: OperatingPicture;
  schedule?: ScheduleEvidenceInput | null;
}): {
  recommendation: PrimaryRecommendation;
  outranked: OutrankedCandidateSummary[];
  allCandidates: RecommendationCandidate[];
} {
  const scheduleCandidates = input.schedule
    ? buildScheduleCandidates(input.evidence, input.schedule)
    : [];
  const portfolioCandidates = buildPortfolioCandidates(input.evidence);

  // Cross-domain pool — schedule and portfolio compete by DecisionClass.
  const pool =
    scheduleCandidates.length > 0
      ? [...scheduleCandidates, ...portfolioCandidates]
      : portfolioCandidates;

  const sorted = [...pool].sort(compareCandidates);
  const winner = sorted[0];
  const recommendation = withFingerprint(winner.recommendation);

  const outranked: OutrankedCandidateSummary[] = sorted.slice(1, 6).map((c) => ({
    id: c.recommendation.id,
    action: c.recommendation.action,
    decisionClass: c.decisionClass,
    reason: `Outranked by ${DECISION_CLASS_LABEL[winner.decisionClass]} (class ${winner.decisionClass} over ${c.decisionClass})`,
  }));

  return { recommendation, outranked, allCandidates: sorted };
}

export function buildExplainabilityPath(
  evidence: EvidenceItem[],
  interpretations: Interpretation[],
  decision: OperatingPicture,
  recommendation: PrimaryRecommendation,
): {
  decisionPath: Array<{
    layer: "evidence" | "interpretation" | "decision" | "recommendation";
    label: string;
    detail: string;
  }>;
  confidenceRationale: string;
  missingEvidence: string[];
  freshness: string;
} {
  const decisionPath = [
    {
      layer: "evidence" as const,
      label: "Evidence collected",
      detail: `${evidence.length} fact${evidence.length === 1 ? "" : "s"} across ${decision.scheduleMaterial ? "schedule and portfolio" : "portfolio"} domains`,
    },
    {
      layer: "interpretation" as const,
      label: "Meaning derived",
      detail: `${interpretations.length} interpretation${interpretations.length === 1 ? "" : "s"} with deterministic mapping`,
    },
    {
      layer: "decision" as const,
      label: "Operating picture",
      detail: `Class ${recommendation.decisionClass} · ${DECISION_CLASS_LABEL[recommendation.decisionClass]}. Posture: ${decision.posture}. Confidence: ${decision.confidence}.`,
    },
    {
      layer: "recommendation" as const,
      label: "Primary recommendation",
      detail: `${recommendation.action} (${recommendation.source})`,
    },
  ];

  const confidenceRationale =
    decision.confidenceReasons.length > 0
      ? decision.confidenceReasons.join("; ")
      : recommendation.confidence === "high"
        ? "High confidence — evidence is direct and current."
        : recommendation.confidence === "medium"
          ? "Medium confidence — some evidence is indirect or partial."
          : recommendation.confidence === "unknown"
            ? "Unknown confidence — evidence coverage is incomplete."
            : "Low confidence — limited evidence available.";

  const missingEvidence: string[] = [];
  if (evidence.some((e) => e.kind === "calendar_unavailable")) {
    missingEvidence.push("Calendar observation");
  }

  const freshness =
    evidence.length === 0
      ? "No evidence observed"
      : evidence.some((e) => e.freshness === "stale")
        ? "Some evidence may be stale"
        : "Evidence is current";

  return { decisionPath, confidenceRationale, missingEvidence, freshness };
}

export function buildUserFacingExplainability(input: {
  recommendation: PrimaryRecommendation;
  confidence: ExecutiveConfidence;
  confidenceReasons: string[];
  evidence: EvidenceItem[];
  freshness: string;
  missingEvidence: string[];
}): UserFacingExplainability {
  const keyEvidence = input.evidence
    .filter((e) => input.recommendation.evidenceIds.includes(e.id))
    .map((e) => e.summary)
    .filter((s) => !/private/i.test(s))
    .slice(0, 4);

  return {
    headline: "Why this matters",
    decision: input.recommendation.action,
    keyEvidence,
    businessImpact: input.recommendation.expectedImpact ?? null,
    tradeoff: input.recommendation.tradeoff ?? null,
    confidence: input.confidence,
    confidenceReasons: input.confidenceReasons,
    freshness: input.freshness,
    missingInformation: input.missingEvidence,
  };
}

export type { RecommendationCandidate };
