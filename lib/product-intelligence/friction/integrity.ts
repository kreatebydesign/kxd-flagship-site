/**
 * Founder Friction engine integrity (P0-F).
 */

import {
  FRICTION_CATEGORY_DEFINITIONS,
  FRICTION_FREQUENCY_DEFINITIONS,
  FRICTION_LIFECYCLE_DEFINITIONS,
  FRICTION_SEVERITY_DEFINITIONS,
  FRICTION_ALLOWED_TRANSITIONS,
} from "./registry";
import type { FounderFrictionIndex } from "./types";
import {
  FRICTION_CATEGORIES,
  FRICTION_EVIDENCE_KINDS,
  FRICTION_FREQUENCIES,
  FRICTION_LIFECYCLE_STATES,
  FRICTION_SEVERITIES,
} from "./types";
import { validateFrictionCreate, validateFrictionTransition } from "./rules";
import type { FounderFrictionObject } from "../contracts";

export interface FrictionEngineIntegrityReport {
  ok: boolean;
  issues: string[];
  checksPassed: string[];
}

export function verifyFounderFrictionEngineIntegrity(
  index: FounderFrictionIndex,
): FrictionEngineIntegrityReport {
  const issues: string[] = [];
  const checksPassed: string[] = [];

  if (index.schemaVersion !== "P0-F") {
    issues.push("schemaVersion must be P0-F");
  } else {
    checksPassed.push("Schema version is P0-F");
  }

  if (FRICTION_CATEGORY_DEFINITIONS.length !== FRICTION_CATEGORIES.length) {
    issues.push("category definitions incomplete");
  } else {
    checksPassed.push("Friction categories complete (closed vocabulary)");
  }

  if (FRICTION_SEVERITY_DEFINITIONS.length !== FRICTION_SEVERITIES.length) {
    issues.push("severity model incomplete");
  } else {
    checksPassed.push("Severity model complete");
  }

  if (FRICTION_FREQUENCY_DEFINITIONS.length !== FRICTION_FREQUENCIES.length) {
    issues.push("frequency model incomplete");
  } else {
    checksPassed.push("Frequency model complete");
  }

  if (FRICTION_LIFECYCLE_DEFINITIONS.length !== FRICTION_LIFECYCLE_STATES.length) {
    issues.push("lifecycle model incomplete");
  } else {
    checksPassed.push("Lifecycle model complete");
  }

  if (FRICTION_EVIDENCE_KINDS.length < 7) {
    issues.push("evidence kinds incomplete");
  } else {
    checksPassed.push("Evidence kinds complete");
  }

  if (FRICTION_ALLOWED_TRANSITIONS.length === 0) {
    issues.push("allowed transitions missing");
  } else {
    checksPassed.push("Lifecycle transitions defined");
  }

  if (index.frictions.length !== 0) {
    issues.push("P0-F must not populate friction observations");
  } else {
    checksPassed.push("Friction store empty — contracts only");
  }

  for (const linkage of index.futureLinkages) {
    if (linkage.implementationAuthorized !== false) {
      issues.push(`future linkage ${linkage.target} must remain unauthorized`);
    }
  }
  if (!issues.some((i) => i.includes("future linkage"))) {
    checksPassed.push("Future linkages prepared but not implemented");
  }

  // Self-check: create validation rejects anonymous friction.
  const anonymous = validateFrictionCreate({
    id: "friction:test",
    title: "Test",
    observation: "x",
    context: "y",
    category: "unknown",
    severity: "minor",
    frequency: "once",
    effort: "small",
    founderImpact: "a",
    clientImpact: "b",
    businessImpact: "c",
    operationalImpact: "d",
    technicalImpact: "e",
    emotionalImpact: "f",
    recommendedDirection: "simplify",
    evidenceIds: [],
    frictionEvidenceKinds: [],
    relatedInventoryIds: [],
    relatedDecisionIds: [],
    relatedRoadmapIds: [],
    relatedHealthDomainIds: [],
    relatedProductDnaIds: [],
    relatedTechnicalDebtIds: [],
    ownerRole: "founder",
    discoveredAt: "2026-08-02T00:00:00.000Z",
    summary: "test",
  });
  if (anonymous.ok) {
    issues.push("anonymous friction must be rejected");
  } else {
    checksPassed.push("Evidence rules enforced (anonymous rejected)");
  }

  // Self-check: transition without reason rejected.
  const stub = {
    detail: {
      frictionStatus: "observed",
      lifecycleTransitions: [],
      learning: null,
      resolvedAt: null,
    },
  } as unknown as FounderFrictionObject;
  const badTransition = validateFrictionTransition({
    friction: stub,
    to: "verified",
    reason: "",
    at: "2026-08-02T00:00:00.000Z",
    by: "test",
  });
  if (badTransition.ok) {
    issues.push("transition without reason must be rejected");
  } else {
    checksPassed.push("Lifecycle reason enforcement works");
  }

  if (!index.entryPoints.forHumans.length || !index.entryPoints.forCursor.length) {
    issues.push("entry points incomplete");
  } else {
    checksPassed.push("Founder Friction Index entry points present");
  }

  return {
    ok: issues.length === 0,
    issues,
    checksPassed,
  };
}
