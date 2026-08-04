/**
 * Movement Log contracts + enforcement (P0-E).
 * No movement without traceability. No movement without explanation.
 */

import type {
  HealthDomainId,
  HealthMovementRecord,
  HealthScoreObservation,
} from "./types";
import { resolveHealthConfidence } from "./confidence";

export interface ProposedHealthMovement {
  domainId: HealthDomainId;
  previousValue: number;
  currentValue: number;
  reason: string;
  evidenceIds: string[];
  evidenceKinds: string[];
  decisionIds: string[];
  releaseIds: string[];
  timestamp: string;
}

export interface MovementValidationResult {
  allowed: boolean;
  reason: string;
  record: HealthMovementRecord | null;
}

/**
 * Enforce product law: if explanation cannot be generated, score must not change.
 */
export function validateHealthMovement(
  proposal: ProposedHealthMovement,
): MovementValidationResult {
  if (!proposal.reason.trim()) {
    return {
      allowed: false,
      reason: "Movement rejected: explanation/reason is required.",
      record: null,
    };
  }
  if (proposal.evidenceIds.length === 0) {
    return {
      allowed: false,
      reason: "Movement rejected: evidence IDs are required.",
      record: null,
    };
  }
  if (proposal.previousValue === proposal.currentValue) {
    return {
      allowed: false,
      reason: "Movement rejected: previous and current values are identical.",
      record: null,
    };
  }
  if (
    proposal.currentValue < 0 ||
    proposal.currentValue > 100 ||
    proposal.previousValue < 0 ||
    proposal.previousValue > 100
  ) {
    return {
      allowed: false,
      reason: "Movement rejected: scores must be within 0–100.",
      record: null,
    };
  }

  const confidence = resolveHealthConfidence({
    evidenceIds: proposal.evidenceIds,
    evidenceKinds: proposal.evidenceKinds,
    decisionIds: proposal.decisionIds,
  });
  if (!confidence) {
    return {
      allowed: false,
      reason:
        "Movement rejected: evidence quality insufficient for any confidence level.",
      record: null,
    };
  }

  const movement = proposal.currentValue - proposal.previousValue;
  const direction = movement > 0 ? "up" : movement < 0 ? "down" : "flat";

  const record: HealthMovementRecord = {
    id: `movement:${proposal.domainId}:${proposal.timestamp}`,
    domainId: proposal.domainId,
    previousValue: proposal.previousValue,
    currentValue: proposal.currentValue,
    movement,
    direction,
    reason: proposal.reason.trim(),
    evidenceIds: [...proposal.evidenceIds],
    decisionIds: [...proposal.decisionIds],
    releaseIds: [...proposal.releaseIds],
    timestamp: proposal.timestamp,
    confidence,
  };

  return { allowed: true, reason: "ok", record };
}

export function applyMovementToObservation(
  observation: HealthScoreObservation,
  record: HealthMovementRecord,
): HealthScoreObservation {
  return {
    ...observation,
    previousValue: record.previousValue,
    currentValue: record.currentValue,
    movement: record.movement,
    direction: record.direction,
    explanation: record.reason,
    evidenceIds: record.evidenceIds,
    decisionIds: record.decisionIds,
    releaseIds: record.releaseIds,
    confidence: record.confidence,
    observedAt: record.timestamp,
  };
}

export function createEmptyMovementLog(): HealthMovementRecord[] {
  return [];
}
