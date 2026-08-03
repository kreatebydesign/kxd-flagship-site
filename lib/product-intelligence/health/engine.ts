/**
 * Load Platform Health Engine v1 (P0-E).
 * Contracts + unobserved score slots. No report generation. No invented scores.
 */

import { HEALTH_CONFIDENCE_RULES } from "./confidence";
import { HEALTH_DOMAIN_DEFINITIONS } from "./domains";
import { verifyPlatformHealthEngineIntegrity } from "./integrity";
import { createEmptyMovementLog } from "./movement";
import {
  buildHealthRelationshipBindings,
  buildReviewCadenceGuide,
} from "./relationships";
import { PLATFORM_HEALTH_REPORT_CONTRACT } from "./report";
import type {
  HealthScoreObservation,
  PlatformHealthEngine,
} from "./types";
import { PLATFORM_HEALTH_QUESTION } from "./types";
import { PLATFORM_HEALTH_WEIGHTING } from "./weighting";
import type { HealthEngineIntegrityReport } from "./integrity";

export interface PlatformHealthEngineResult {
  schemaVersion: "P0-E";
  engine: PlatformHealthEngine;
  integrity: HealthEngineIntegrityReport;
}

function createUnobservedSlots(): HealthScoreObservation[] {
  return HEALTH_DOMAIN_DEFINITIONS.map((domain) => ({
    domainId: domain.id,
    currentValue: null,
    previousValue: null,
    movement: null,
    direction: "unobserved",
    explanation: null,
    evidenceIds: [],
    decisionIds: [],
    releaseIds: [],
    confidence: null,
    reviewDate: null,
    observedAt: null,
  }));
}

/**
 * Load the permanent Platform Health Engine.
 * Scores remain unobserved until an authorized later scoring pass with evidence.
 */
export function loadPlatformHealthEngine(): PlatformHealthEngineResult {
  const loadedAt = new Date().toISOString();
  const engine: PlatformHealthEngine = {
    schemaVersion: "P0-E",
    loadedAt,
    permanentQuestion: PLATFORM_HEALTH_QUESTION,
    domains: HEALTH_DOMAIN_DEFINITIONS,
    weighting: PLATFORM_HEALTH_WEIGHTING,
    confidenceRules: HEALTH_CONFIDENCE_RULES,
    observations: createUnobservedSlots(),
    movementLog: createEmptyMovementLog(),
    relationshipBindings: buildHealthRelationshipBindings(),
    reviewCadenceGuide: buildReviewCadenceGuide(),
    reportContract: PLATFORM_HEALTH_REPORT_CONTRACT,
  };

  return {
    schemaVersion: "P0-E",
    engine,
    integrity: verifyPlatformHealthEngineIntegrity(engine),
  };
}
