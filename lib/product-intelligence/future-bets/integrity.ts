/**
 * Future Bets Engine integrity (P0-J).
 */

import {
  FUTURE_BET_CATEGORY_DEFINITIONS,
  FUTURE_BET_MATURITY_DEFINITIONS,
} from "./registry";
import {
  chronologyIsValid,
  findConflictingStrategicDirections,
  findDuplicateFutureBetIds,
  findDuplicateStrategicIdeas,
  findOrphanFutureBets,
  validateFutureBetCreate,
  validateFutureBetPromotion,
} from "./rules";
import type { FutureBetsIndex } from "./types";
import {
  FUTURE_BET_CATEGORIES,
  FUTURE_BET_MATURITIES,
} from "./types";

export interface FutureBetsEngineIntegrityReport {
  ok: boolean;
  issues: string[];
  checksPassed: string[];
}

export function verifyFutureBetsEngineIntegrity(
  index: FutureBetsIndex,
): FutureBetsEngineIntegrityReport {
  const issues: string[] = [];
  const checksPassed: string[] = [];

  if (index.schemaVersion !== "P0-J") {
    issues.push("schemaVersion must be P0-J");
  } else {
    checksPassed.push("Schema version is P0-J");
  }

  if (FUTURE_BET_CATEGORY_DEFINITIONS.length !== FUTURE_BET_CATEGORIES.length) {
    issues.push("category definitions incomplete");
  } else {
    checksPassed.push("Future Bet categories complete");
  }

  if (FUTURE_BET_MATURITY_DEFINITIONS.length !== FUTURE_BET_MATURITIES.length) {
    issues.push("maturity model incomplete");
  } else {
    checksPassed.push("Maturity model complete");
  }

  if (FUTURE_BET_MATURITY_DEFINITIONS.some((m) => m.isRoadmap !== false)) {
    issues.push("no maturity state may be roadmap");
  } else {
    checksPassed.push("No maturity state is roadmap");
  }

  if (index.entries.length !== 0) {
    issues.push("P0-J must not populate Future Bets");
  } else {
    checksPassed.push("Future Bets store empty — contracts only");
  }

  if (index.timeline.orderedEntryIds.length !== 0) {
    issues.push("P0-J must not generate populated Future Bets timeline");
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

  const dupes = findDuplicateFutureBetIds(index.entries);
  const ideas = findDuplicateStrategicIdeas(index.entries);
  const conflicts = findConflictingStrategicDirections(index.entries);
  const orphans = findOrphanFutureBets(index.entries);
  if (dupes.length || ideas.length || conflicts.length || orphans.length) {
    issues.push("integrity violation on empty/populated entries");
  } else {
    checksPassed.push(
      "No duplicate Future Bets / no conflicting directions / no orphans",
    );
  }

  if (!chronologyIsValid(index.entries)) {
    issues.push("chronology invalid");
  } else {
    checksPassed.push("Chronology valid");
  }

  const incomplete = validateFutureBetCreate({
    id: "bet:test",
    title: "Test",
    category: "ai",
    maturity: "observation",
    strategicIdea: "x",
    opportunity: "y",
    problemAddressed: "z",
    whyKxdBelievesInIt: "a",
    expectedLongTermValue: "b",
    belief: "c",
    valueHypothesis: "d",
    evidenceIds: [],
    relatedProductDnaIds: [],
    relatedDecisionIds: [],
    relatedEvolutionIds: [],
    relatedHealthDomainIds: [],
    relatedInventoryIds: [],
    betConfidence: "long_term",
    reviewPolicy: "annual",
    recordedAt: "2026-08-02T00:00:00.000Z",
    ownerRole: "cpo",
    summary: "test",
  });
  if (incomplete.ok) {
    issues.push("incomplete Future Bet create must be rejected");
  } else {
    checksPassed.push("Evidence + DNA + Decision + Evolution linkage enforced");
  }

  const autoRoadmap = validateFutureBetPromotion({
    futureBetId: "bet:test",
    target: "roadmap_item",
    evidenceIds: ["ev:1"],
    decisionId: "decision:x",
    reviewed: true,
    approved: true,
  });
  if (autoRoadmap.ok) {
    issues.push("direct roadmap promotion must be rejected");
  } else {
    checksPassed.push("Promotion rules forbid automatic/direct roadmap entry");
  }

  if (!index.promotionRequirements.neverAutoPromotesToRoadmap) {
    issues.push("promotion requirements must forbid auto-roadmap");
  } else {
    checksPassed.push("Promotion requirements recorded");
  }

  if (!index.entryPoints.forHumans.length || !index.entryPoints.forCursor.length) {
    issues.push("entry points incomplete");
  } else {
    checksPassed.push("Future Bets Index entry points present");
  }

  if (!/not.*roadmap|never.*roadmap|protected conviction/i.test(index.law.join(" "))) {
    issues.push("Future Bets law must separate vision from commitment");
  } else {
    checksPassed.push("Future Bets law recorded");
  }

  return {
    ok: issues.length === 0,
    issues,
    checksPassed,
  };
}
