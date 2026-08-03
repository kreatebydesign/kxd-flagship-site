/**
 * Platform Health Engine integrity (P0-E).
 */

import {
  HEALTH_DOMAIN_DEFINITIONS,
  listOrphanHealthDomainIds,
} from "./domains";
import {
  assertCategoryDomainWeightsSumTo100,
  assertCategoryWeightsSumTo100,
} from "./weighting";
import type { PlatformHealthEngine } from "./types";
import { HEALTH_DOMAIN_IDS } from "./types";

export interface HealthEngineIntegrityReport {
  ok: boolean;
  orphanDomains: string[];
  weightIssues: string[];
  observationIssues: string[];
  checksPassed: string[];
}

export function verifyPlatformHealthEngineIntegrity(
  engine: PlatformHealthEngine,
): HealthEngineIntegrityReport {
  const checksPassed: string[] = [];
  const orphanDomains = listOrphanHealthDomainIds().map(String);
  const weightIssues: string[] = [];
  const observationIssues: string[] = [];

  if (orphanDomains.length === 0) {
    checksPassed.push("No orphan health domains");
  }

  if (HEALTH_DOMAIN_DEFINITIONS.length !== HEALTH_DOMAIN_IDS.length) {
    orphanDomains.push("definition-count-mismatch");
  } else {
    checksPassed.push("Domain definition count matches registry");
  }

  if (!assertCategoryWeightsSumTo100()) {
    weightIssues.push("category weights must sum to 100");
  } else {
    checksPassed.push("Category weights sum to 100");
  }

  for (const issue of assertCategoryDomainWeightsSumTo100()) {
    weightIssues.push(issue);
  }
  if (weightIssues.length === 0) {
    checksPassed.push("Per-category domain weights sum to 100");
  }

  if (engine.reportContract.generationAuthorized !== false) {
    observationIssues.push("report generation must remain unauthorized in P0-E");
  } else {
    checksPassed.push("Report contract forbids generation in P0-E");
  }

  if (engine.weighting.forbidsCommitCountAsEvidence !== true) {
    observationIssues.push("commit counts must be forbidden as evidence");
  }
  if (engine.weighting.forbidsFeatureCountAsEvidence !== true) {
    observationIssues.push("feature counts must be forbidden as evidence");
  }
  if (
    engine.weighting.forbidsCommitCountAsEvidence &&
    engine.weighting.forbidsFeatureCountAsEvidence
  ) {
    checksPassed.push("Commit/feature counts forbidden as evidence");
  }

  // P0-E: observations exist as unobserved slots — no invented scores.
  for (const observation of engine.observations) {
    if (
      observation.currentValue !== null &&
      (!observation.explanation || observation.evidenceIds.length === 0)
    ) {
      observationIssues.push(
        `${observation.domainId}: scored without explanation/evidence`,
      );
    }
    if (observation.currentValue === null && observation.direction !== "unobserved") {
      observationIssues.push(
        `${observation.domainId}: null value must be unobserved`,
      );
    }
  }
  if (observationIssues.length === 0) {
    checksPassed.push("Observations obey evidence/explanation law");
  }

  if (engine.movementLog.length !== 0) {
    // Empty is expected for P0-E architecture; non-empty must be fully traced.
    for (const movement of engine.movementLog) {
      if (!movement.reason || movement.evidenceIds.length === 0) {
        observationIssues.push(`${movement.id}: movement missing reason/evidence`);
      }
    }
  } else {
    checksPassed.push("Movement log empty — architecture only (no fake movements)");
  }

  if (engine.relationshipBindings.length !== HEALTH_DOMAIN_DEFINITIONS.length) {
    observationIssues.push("relationship bindings missing for some domains");
  } else {
    checksPassed.push("Every domain has relationship bindings");
  }

  return {
    ok:
      orphanDomains.length === 0 &&
      weightIssues.length === 0 &&
      observationIssues.length === 0,
    orphanDomains,
    weightIssues,
    observationIssues,
    checksPassed,
  };
}
