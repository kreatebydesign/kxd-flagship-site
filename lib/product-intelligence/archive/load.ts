/**
 * Load Decision Archive (P0-D).
 */

import type { DecisionObject, DoctrineObject, ProductDnaObject } from "../contracts";
import type { ProductIntelligenceRelationship } from "../relationships";
import { EDITION_1_DECISIONS } from "./decisions";
import { EDITION_1_DOCTRINE } from "./doctrine-seed";
import {
  verifyDecisionArchiveIntegrity,
  type DecisionArchiveIntegrityReport,
} from "./integrity";
import { EDITION_1_PRODUCT_DNA } from "./product-dna-seed";

export interface DecisionArchiveResult {
  schemaVersion: "P0-D";
  loadedAt: string;
  productDna: ProductDnaObject[];
  doctrine: DoctrineObject[];
  decisions: DecisionObject[];
  relationships: ProductIntelligenceRelationship[];
  integrity: DecisionArchiveIntegrityReport;
  confidenceSummary: Record<string, number>;
}

function buildArchiveRelationships(
  decisions: DecisionObject[],
  loadedAt: string,
): ProductIntelligenceRelationship[] {
  const relationships: ProductIntelligenceRelationship[] = [];
  let i = 0;
  for (const decision of decisions) {
    for (const dnaId of decision.detail.relatedProductDnaIds) {
      relationships.push({
        id: `rel:decision-dna:${i++}`,
        kind: "related_to",
        fromId: decision.id,
        fromType: "decision",
        toId: dnaId,
        toType: "product_dna",
        note: "decision_to_product_dna",
        createdAt: loadedAt,
        evidenceIds: [],
      });
    }
    for (const doctrineId of decision.detail.relatedDoctrineIds) {
      relationships.push({
        id: `rel:decision-doctrine:${i++}`,
        kind: "related_to",
        fromId: decision.id,
        fromType: "decision",
        toId: doctrineId,
        toType: "doctrine",
        note: "decision_to_doctrine",
        createdAt: loadedAt,
        evidenceIds: [],
      });
    }
    for (const productId of decision.detail.relatedProductIds) {
      relationships.push({
        id: `rel:decision-product:${i++}`,
        kind: "affects",
        fromId: decision.id,
        fromType: "decision",
        toId: `product:${productId}`,
        toType: "product_inventory",
        note: "decision_affects_product",
        createdAt: loadedAt,
        evidenceIds: [],
      });
    }
  }
  return relationships;
}

export function loadDecisionArchive(): DecisionArchiveResult {
  const loadedAt = new Date().toISOString();
  const productDna = [EDITION_1_PRODUCT_DNA];
  const doctrine = [EDITION_1_DOCTRINE];
  const decisions = [...EDITION_1_DECISIONS];
  const relationships = buildArchiveRelationships(decisions, loadedAt);
  const integrity = verifyDecisionArchiveIntegrity({
    decisions,
    productDna,
    doctrine,
  });

  const confidenceSummary: Record<string, number> = {
    permanent: 0,
    long_term: 0,
    experimental: 0,
    temporary: 0,
  };
  for (const decision of decisions) {
    confidenceSummary[decision.detail.decisionConfidence] += 1;
  }

  return {
    schemaVersion: "P0-D",
    loadedAt,
    productDna,
    doctrine,
    decisions,
    relationships,
    integrity,
    confidenceSummary,
  };
}
