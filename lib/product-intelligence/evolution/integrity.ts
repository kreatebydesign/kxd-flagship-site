/**
 * Product Evolution Ledger integrity (P0-G).
 */

import { PRODUCT_EVOLUTION_TYPE_DEFINITIONS } from "./registry";
import {
  chronologyIsValid,
  findDuplicateEvolutionIds,
  findDuplicateMilestoneSignatures,
  findOrphanEvolutionEntries,
  validateEvolutionCreate,
  validateReleaseLinks,
} from "./rules";
import type { ProductEvolutionIndex } from "./types";
import { PRODUCT_EVOLUTION_TYPES } from "./types";

export interface EvolutionEngineIntegrityReport {
  ok: boolean;
  issues: string[];
  checksPassed: string[];
}

export function verifyProductEvolutionEngineIntegrity(
  index: ProductEvolutionIndex,
): EvolutionEngineIntegrityReport {
  const issues: string[] = [];
  const checksPassed: string[] = [];

  if (index.schemaVersion !== "P0-G") {
    issues.push("schemaVersion must be P0-G");
  } else {
    checksPassed.push("Schema version is P0-G");
  }

  if (
    PRODUCT_EVOLUTION_TYPE_DEFINITIONS.length !== PRODUCT_EVOLUTION_TYPES.length
  ) {
    issues.push("evolution type definitions incomplete");
  } else {
    checksPassed.push("Evolution types complete (closed vocabulary)");
  }

  if (index.entries.length !== 0) {
    issues.push("P0-G must not populate evolution ledger entries");
  } else {
    checksPassed.push("Evolution entries empty — contracts only");
  }

  if (index.releases.length !== 0) {
    issues.push("P0-G must not populate release stubs in evolution index");
  } else {
    checksPassed.push("Release stubs empty — contracts only");
  }

  if (index.timeline.orderedEntryIds.length !== 0) {
    issues.push("P0-G must not generate populated timeline");
  } else {
    checksPassed.push("Timeline empty — chronology model present only");
  }

  for (const linkage of index.futureLinkages) {
    if (linkage.implementationAuthorized !== false) {
      issues.push(`future linkage ${linkage.target} must remain unauthorized`);
    }
  }
  if (!issues.some((i) => i.includes("future linkage"))) {
    checksPassed.push("Future linkages prepared but not implemented");
  }

  const dupes = findDuplicateEvolutionIds(index.entries);
  const signatures = findDuplicateMilestoneSignatures(index.entries);
  const orphans = findOrphanEvolutionEntries(index.entries);
  if (dupes.length || signatures.length || orphans.length) {
    issues.push("integrity violation on empty/populated entries");
  } else {
    checksPassed.push("No duplicate milestones / no orphan evolution entries");
  }

  if (!chronologyIsValid(index.entries)) {
    issues.push("chronology invalid");
  } else {
    checksPassed.push("Chronology valid");
  }

  // Self-check: milestone without evidence rejected.
  const noEvidence = validateEvolutionCreate({
    id: "evolution:test",
    title: "Test",
    evolutionType: "product_milestone",
    summary: "x",
    detailedReasoning: "y",
    milestoneDate: "2026-08-02T00:00:00.000Z",
    evidenceIds: [],
    relatedReleaseIds: [],
    relatedCommitShas: [],
    relatedVerifierIds: [],
    relatedInventoryIds: [],
    relatedDecisionIds: [],
    relatedProductDnaIds: [],
    relatedHealthMovementIds: [],
    relatedFrictionIds: [],
    gitEvidence: [],
    ownerRole: "cpo",
    objectSummary: "test",
  });
  if (noEvidence.ok) {
    issues.push("evolution without evidence must be rejected");
  } else {
    checksPassed.push("Evidence rules enforced for milestones");
  }

  // Self-check: isolated release rejected.
  const orphanRelease = validateReleaseLinks({
    id: "release:test",
    releaseKey: "test",
    relatedDecisionIds: [],
    relatedInventoryIds: [],
    relatedVerifierIds: [],
    relatedHealthDomainIds: [],
    relatedEvolutionIds: [],
    evidenceIds: [],
  });
  if (orphanRelease.ok) {
    issues.push("orphan release must be rejected");
  } else {
    checksPassed.push("Release relationship isolation forbidden");
  }

  if (!index.entryPoints.forHumans.length || !index.entryPoints.forCursor.length) {
    issues.push("entry points incomplete");
  } else {
    checksPassed.push("Product Evolution Index entry points present");
  }

  if (
    !/deliberate product decisions/i.test(index.law.join(" "))
  ) {
    issues.push("Product Evolution law missing deliberate-decisions statement");
  } else {
    checksPassed.push("Product Evolution law recorded");
  }

  return {
    ok: issues.length === 0,
    issues,
    checksPassed,
  };
}
