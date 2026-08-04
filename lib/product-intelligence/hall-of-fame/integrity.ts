/**
 * Hall of Fame Engine integrity (P0-H).
 */

import {
  HALL_OF_FAME_CATEGORY_DEFINITIONS,
  HALL_OF_FAME_QUALIFICATION_DEFINITIONS,
} from "./registry";
import {
  chronologyIsValid,
  findDuplicateHallOfFameIds,
  findDuplicateHallOfFameSignatures,
  findOrphanHallOfFameEntries,
  validateHallOfFameCreate,
} from "./rules";
import type { HallOfFameIndex } from "./types";
import {
  HALL_OF_FAME_CATEGORIES,
  HALL_OF_FAME_QUALIFICATION_CLASSES,
} from "./types";

export interface HallOfFameEngineIntegrityReport {
  ok: boolean;
  issues: string[];
  checksPassed: string[];
}

export function verifyHallOfFameEngineIntegrity(
  index: HallOfFameIndex,
): HallOfFameEngineIntegrityReport {
  const issues: string[] = [];
  const checksPassed: string[] = [];

  if (index.schemaVersion !== "P0-H") {
    issues.push("schemaVersion must be P0-H");
  } else {
    checksPassed.push("Schema version is P0-H");
  }

  if (HALL_OF_FAME_CATEGORY_DEFINITIONS.length !== HALL_OF_FAME_CATEGORIES.length) {
    issues.push("category definitions incomplete");
  } else {
    checksPassed.push("Hall of Fame categories complete");
  }

  if (
    HALL_OF_FAME_QUALIFICATION_DEFINITIONS.length !==
    HALL_OF_FAME_QUALIFICATION_CLASSES.length
  ) {
    issues.push("qualification rules incomplete");
  } else {
    checksPassed.push("Qualification rules complete");
  }

  if (index.entries.length !== 0) {
    issues.push("P0-H must not populate Hall of Fame entries");
  } else {
    checksPassed.push("Hall of Fame store empty — contracts only");
  }

  if (index.timeline.orderedEntryIds.length !== 0) {
    issues.push("P0-H must not generate populated Hall of Fame timeline");
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

  const dupes = findDuplicateHallOfFameIds(index.entries);
  const signatures = findDuplicateHallOfFameSignatures(index.entries);
  const orphans = findOrphanHallOfFameEntries(index.entries);
  if (dupes.length || signatures.length || orphans.length) {
    issues.push("integrity violation on empty/populated entries");
  } else {
    checksPassed.push("No duplicate Hall of Fame pathways / no orphan entries");
  }

  if (!chronologyIsValid(index.entries)) {
    issues.push("chronology invalid");
  } else {
    checksPassed.push("Chronology valid");
  }

  const rejected = validateHallOfFameCreate({
    id: "fame:test",
    title: "Test",
    category: "product",
    qualificationClass: "new_product_law",
    milestone: "x",
    whyItMattered: "y",
    whatChanged: "z",
    longTermImpact: "a",
    lessonsLearned: "b",
    whatItTeaches: "c",
    milestoneDate: "2026-08-02T00:00:00.000Z",
    evidenceIds: [],
    relatedDecisionIds: [],
    relatedEvolutionIds: [],
    relatedReleaseIds: [],
    relatedProductDnaIds: [],
    relatedInventoryIds: [],
    relatedHealthDomainIds: [],
    whatFutureBuildersShouldRemember: "d",
    whatShouldNeverBeForgotten: "e",
    whyThisChangedKxdForever: "f",
    fameConfidence: "permanent",
    reviewPolicy: "annual",
    ownerRole: "cpo",
    summary: "test",
  });
  if (rejected.ok) {
    issues.push("incomplete Hall of Fame create must be rejected");
  } else {
    checksPassed.push(
      "Evidence + Decision + Evolution linkage rules enforced",
    );
  }

  if (!index.entryPoints.forHumans.length || !index.entryPoints.forCursor.length) {
    issues.push("entry points incomplete");
  } else {
    checksPassed.push("Hall of Fame Index entry points present");
  }

  if (!/earned/i.test(index.law.join(" "))) {
    issues.push("Hall of Fame law must state entries are earned");
  } else {
    checksPassed.push("Hall of Fame law recorded");
  }

  return {
    ok: issues.length === 0,
    issues,
    checksPassed,
  };
}
