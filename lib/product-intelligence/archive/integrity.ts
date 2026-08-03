/**
 * Decision Archive integrity (P0-D).
 */

import type { DecisionConfidenceClass, DecisionObject } from "../contracts";
import type { DoctrineObject } from "../contracts";
import type { ProductDnaObject } from "../contracts";
import { DOCTRINE_OBJECT_ID } from "./doctrine-seed";
import { PRODUCT_DNA_OBJECT_ID } from "./product-dna-seed";

export interface DecisionArchiveIntegrityReport {
  ok: boolean;
  orphanDecisions: string[];
  duplicateDecisionIds: string[];
  missingConfidence: string[];
  unresolvedLinks: string[];
  checksPassed: string[];
}

const VALID_CONFIDENCE = new Set<DecisionConfidenceClass>([
  "permanent",
  "long_term",
  "experimental",
  "temporary",
]);

export function verifyDecisionArchiveIntegrity(input: {
  decisions: DecisionObject[];
  productDna: ProductDnaObject[];
  doctrine: DoctrineObject[];
}): DecisionArchiveIntegrityReport {
  const checksPassed: string[] = [];
  const orphanDecisions: string[] = [];
  const duplicateDecisionIds: string[] = [];
  const missingConfidence: string[] = [];
  const unresolvedLinks: string[] = [];

  const ids = input.decisions.map((d) => d.id);
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) duplicateDecisionIds.push(id);
    seen.add(id);
  }
  if (duplicateDecisionIds.length === 0) {
    checksPassed.push("No duplicate decision IDs");
  }

  const dnaIds = new Set(input.productDna.map((d) => d.id));
  const doctrineIds = new Set(input.doctrine.map((d) => d.id));

  if (!dnaIds.has(PRODUCT_DNA_OBJECT_ID)) {
    unresolvedLinks.push(`missing-product-dna:${PRODUCT_DNA_OBJECT_ID}`);
  }
  if (!doctrineIds.has(DOCTRINE_OBJECT_ID)) {
    unresolvedLinks.push(`missing-doctrine:${DOCTRINE_OBJECT_ID}`);
  }

  for (const decision of input.decisions) {
    const detail = decision.detail;
    if (!decision.ownerRole) {
      orphanDecisions.push(decision.id);
    }
    if (!VALID_CONFIDENCE.has(detail.decisionConfidence)) {
      missingConfidence.push(decision.id);
    }
    if (
      !detail.context ||
      !detail.problem ||
      !detail.reason ||
      detail.alternativesConsidered.length === 0 ||
      detail.tradeoffs.length === 0 ||
      !detail.successMetric ||
      !detail.reviewPolicy
    ) {
      orphanDecisions.push(`${decision.id}:incomplete-fields`);
    }
    for (const dnaId of detail.relatedProductDnaIds) {
      if (!dnaIds.has(dnaId)) {
        unresolvedLinks.push(`${decision.id}->dna:${dnaId}`);
      }
    }
    for (const doctrineId of detail.relatedDoctrineIds) {
      if (!doctrineIds.has(doctrineId)) {
        unresolvedLinks.push(`${decision.id}->doctrine:${doctrineId}`);
      }
    }
    if (detail.relatedProductIds.length === 0) {
      unresolvedLinks.push(`${decision.id}:no-related-products`);
    }
    if (detail.relatedInventoryIds.length === 0) {
      unresolvedLinks.push(`${decision.id}:no-inventory-links`);
    }
    if (!detail.sourceRefs.length) {
      unresolvedLinks.push(`${decision.id}:no-source-refs`);
    }
  }

  if (orphanDecisions.length === 0) {
    checksPassed.push("No orphan or incomplete decisions");
  }
  if (missingConfidence.length === 0) {
    checksPassed.push("Every decision has confidence class");
  }
  if (unresolvedLinks.length === 0) {
    checksPassed.push("Decision DNA/Doctrine/product/inventory links resolve");
  }

  const permanentCount = input.decisions.filter(
    (d) => d.detail.decisionConfidence === "permanent",
  ).length;
  if (permanentCount > 0 && permanentCount <= Math.ceil(input.decisions.length * 0.75)) {
    checksPassed.push("Permanent confidence used with restraint");
  } else if (permanentCount === 0) {
    checksPassed.push("Permanent confidence unused (allowed)");
  } else {
    unresolvedLinks.push(`too-many-permanent:${permanentCount}`);
  }

  return {
    ok:
      orphanDecisions.length === 0 &&
      duplicateDecisionIds.length === 0 &&
      missingConfidence.length === 0 &&
      unresolvedLinks.length === 0,
    orphanDecisions,
    duplicateDecisionIds,
    missingConfidence,
    unresolvedLinks,
    checksPassed,
  };
}
