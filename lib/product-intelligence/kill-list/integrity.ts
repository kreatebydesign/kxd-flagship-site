/**
 * Product Kill List Engine integrity (P0-I).
 */

import {
  PRODUCT_KILL_LIST_CATEGORY_DEFINITIONS,
  PRODUCT_KILL_LIST_QUALIFICATION_DEFINITIONS,
} from "./registry";
import {
  chronologyIsValid,
  findDuplicateKillListIds,
  findDuplicateRejectedConcepts,
  findOrphanKillListEntries,
  validateProductKillListCreate,
} from "./rules";
import type { ProductKillListIndex } from "./types";
import {
  PRODUCT_KILL_LIST_CATEGORIES,
  PRODUCT_KILL_LIST_QUALIFICATION_CLASSES,
} from "./types";

export interface ProductKillListEngineIntegrityReport {
  ok: boolean;
  issues: string[];
  checksPassed: string[];
}

export function verifyProductKillListEngineIntegrity(
  index: ProductKillListIndex,
): ProductKillListEngineIntegrityReport {
  const issues: string[] = [];
  const checksPassed: string[] = [];

  if (index.schemaVersion !== "P0-I") {
    issues.push("schemaVersion must be P0-I");
  } else {
    checksPassed.push("Schema version is P0-I");
  }

  if (
    PRODUCT_KILL_LIST_CATEGORY_DEFINITIONS.length !==
    PRODUCT_KILL_LIST_CATEGORIES.length
  ) {
    issues.push("category definitions incomplete");
  } else {
    checksPassed.push("Kill List categories complete");
  }

  if (
    PRODUCT_KILL_LIST_QUALIFICATION_DEFINITIONS.length !==
    PRODUCT_KILL_LIST_QUALIFICATION_CLASSES.length
  ) {
    issues.push("qualification rules incomplete");
  } else {
    checksPassed.push("Qualification rules complete");
  }

  if (index.entries.length !== 0) {
    issues.push("P0-I must not populate Product Kill List entries");
  } else {
    checksPassed.push("Kill List store empty — contracts only");
  }

  if (index.timeline.orderedEntryIds.length !== 0) {
    issues.push("P0-I must not generate populated Kill List timeline");
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

  const dupes = findDuplicateKillListIds(index.entries);
  const concepts = findDuplicateRejectedConcepts(index.entries);
  const orphans = findOrphanKillListEntries(index.entries);
  if (dupes.length || concepts.length || orphans.length) {
    issues.push("integrity violation on empty/populated entries");
  } else {
    checksPassed.push("No duplicate rejected concepts / no orphan entries");
  }

  if (!chronologyIsValid(index.entries)) {
    issues.push("chronology invalid");
  } else {
    checksPassed.push("Chronology valid");
  }

  const rejected = validateProductKillListCreate({
    id: "kill:test",
    title: "Test",
    category: "product",
    qualificationClass: "identity_boundary",
    rejectedConcept: "x",
    problemAttemptedToSolve: "y",
    reasonRejected: "z",
    alternativesConsidered: [],
    chosenDirection: "a",
    tradeoffsAccepted: "b",
    longTermProductImpact: "c",
    decisionDate: "2026-08-02T00:00:00.000Z",
    evidenceIds: [],
    relatedDecisionIds: [],
    relatedProductDnaIds: [],
    relatedEvolutionIds: [],
    relatedInventoryIds: [],
    relatedHealthDomainIds: [],
    relatedFutureBetId: null,
    reconsiderAt: null,
    whatKxdProtects: "d",
    whatKxdRefusesToBecome: "e",
    whyRejectionStrengthensProduct: "f",
    killConfidence: "permanent",
    reviewPolicy: "annual",
    ownerRole: "cpo",
    summary: "test",
  });
  if (rejected.ok) {
    issues.push("incomplete Kill List create must be rejected");
  } else {
    checksPassed.push(
      "Evidence + Decision + DNA + Evolution + Inventory linkage rules enforced",
    );
  }

  if (!index.entryPoints.forHumans.length || !index.entryPoints.forCursor.length) {
    issues.push("entry points incomplete");
  } else {
    checksPassed.push("Product Kill List Index entry points present");
  }

  if (!/refuse|refuses|intentionally/i.test(index.law.join(" "))) {
    issues.push("Kill List law must state intentional refusal");
  } else {
    checksPassed.push("Product Kill List law recorded");
  }

  return {
    ok: issues.length === 0,
    issues,
    checksPassed,
  };
}
