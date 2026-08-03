/**
 * Query validation, relationship resolution, evidence + confidence (P0-K).
 *
 * Structured resolution only — no AI, chat, NLP, or free-form search.
 */

import type { ProductIntelligenceObject } from "../contracts";
import type { ConfidenceLevel } from "../primitives";
import type { ProductIntelligenceRelationship } from "../relationships";
import { isAllowedRelationship, isRelationshipKind } from "../relationships";
import type {
  ProductIntelligenceQuery,
  ProductIntelligenceQueryAnswer,
  QueryResultPath,
  QueryTargetDomain,
  QueryValidationResult,
} from "./types";
import {
  QUERY_DOMAIN_OBJECT_TYPES,
  QUERY_FAMILIES,
  QUERY_TARGET_DOMAINS,
} from "./types";

export const DEFAULT_QUERY_MAX_DEPTH = 4;
export const MAX_QUERY_MAX_DEPTH = 8;

export interface QueryResolutionContext {
  objects: ProductIntelligenceObject[];
  relationships: ProductIntelligenceRelationship[];
}

export function validateProductIntelligenceQuery(
  query: ProductIntelligenceQuery,
): QueryValidationResult {
  const issues: string[] = [];

  if (!query.id.trim()) issues.push("id required");
  if (!(QUERY_FAMILIES as readonly string[]).includes(query.family)) {
    issues.push("family must be from closed vocabulary");
  }
  if (!(QUERY_TARGET_DOMAINS as readonly string[]).includes(query.targetDomain)) {
    issues.push("targetDomain must be from closed vocabulary");
  }
  if (
    query.relationshipKind !== null &&
    !isRelationshipKind(query.relationshipKind)
  ) {
    issues.push("relationshipKind must be a known RelationshipKind or null");
  }
  if (!Number.isInteger(query.maxDepth) || query.maxDepth < 1) {
    issues.push("maxDepth must be a positive integer");
  } else if (query.maxDepth > MAX_QUERY_MAX_DEPTH) {
    issues.push(`maxDepth must be <= ${MAX_QUERY_MAX_DEPTH}`);
  }

  if (
    (query.family === "relationship" || query.family === "dependency") &&
    !query.subjectObjectId &&
    !query.subjectTitleToken
  ) {
    issues.push(
      "relationship/dependency queries require subjectObjectId or subjectTitleToken",
    );
  }

  return { ok: issues.length === 0, issues };
}

export function createStructuredQuery(
  partial: Omit<ProductIntelligenceQuery, "maxDepth"> & { maxDepth?: number },
): ProductIntelligenceQuery {
  const query: ProductIntelligenceQuery = {
    id: partial.id,
    family: partial.family,
    targetDomain: partial.targetDomain,
    subjectObjectId: partial.subjectObjectId,
    subjectTitleToken: partial.subjectTitleToken,
    relationshipKind: partial.relationshipKind,
    maxDepth: partial.maxDepth ?? DEFAULT_QUERY_MAX_DEPTH,
  };
  const validation = validateProductIntelligenceQuery(query);
  if (!validation.ok) {
    throw new Error(`Invalid query: ${validation.issues.join("; ")}`);
  }
  return query;
}

/**
 * Catalog of structured queries that answer permanent Product Intelligence questions.
 * Contracts only — not executed as a population batch.
 */
export function createQueryCatalog(): ProductIntelligenceQuery[] {
  return [
    createStructuredQuery({
      id: "query:why-kxd-works-this-way",
      family: "why",
      targetDomain: "decisions",
      subjectObjectId: null,
      subjectTitleToken: null,
      relationshipKind: null,
    }),
    createStructuredQuery({
      id: "query:which-decisions-relate-to-today",
      family: "relationship",
      targetDomain: "decisions",
      subjectObjectId: null,
      subjectTitleToken: "Today",
      relationshipKind: "affects",
    }),
    createStructuredQuery({
      id: "query:what-depends-on-shared-core",
      family: "dependency",
      targetDomain: "inventory",
      subjectObjectId: null,
      subjectTitleToken: "Shared Core",
      relationshipKind: "depends_on",
    }),
    createStructuredQuery({
      id: "query:which-future-bets-affect-ai",
      family: "strategy",
      targetDomain: "future_bets",
      subjectObjectId: null,
      subjectTitleToken: "AI",
      relationshipKind: "related_to",
    }),
    createStructuredQuery({
      id: "query:why-native-storage-rejected",
      family: "why",
      targetDomain: "product_kill_list",
      subjectObjectId: null,
      subjectTitleToken: "native storage",
      relationshipKind: null,
    }),
    createStructuredQuery({
      id: "query:hall-of-fame-changed-founder-experience",
      family: "history",
      targetDomain: "hall_of_fame",
      subjectObjectId: null,
      subjectTitleToken: "Founder Experience",
      relationshipKind: "related_to",
    }),
    createStructuredQuery({
      id: "query:identity-product-dna",
      family: "identity",
      targetDomain: "product_dna",
      subjectObjectId: null,
      subjectTitleToken: null,
      relationshipKind: null,
    }),
    createStructuredQuery({
      id: "query:platform-health-overview",
      family: "health",
      targetDomain: "platform_health",
      subjectObjectId: null,
      subjectTitleToken: null,
      relationshipKind: null,
    }),
  ];
}

function pathSignature(objectIds: string[], relationshipIds: string[]): string {
  return `${objectIds.join(">")}|${relationshipIds.join(",")}`;
}

function collectObjectsByDomain(
  objects: ProductIntelligenceObject[],
  domain: QueryTargetDomain,
): ProductIntelligenceObject[] {
  const types = new Set(QUERY_DOMAIN_OBJECT_TYPES[domain]);
  return objects.filter((obj) => types.has(obj.type));
}

function resolveSubjectObjects(
  context: QueryResolutionContext,
  query: ProductIntelligenceQuery,
): ProductIntelligenceObject[] {
  if (query.subjectObjectId) {
    return context.objects.filter((obj) => obj.id === query.subjectObjectId);
  }
  if (query.subjectTitleToken) {
    const token = query.subjectTitleToken.trim().toLowerCase();
    // Exact title match only — not search, not NLP, not fuzzy chat.
    return context.objects.filter(
      (obj) => obj.title.trim().toLowerCase() === token,
    );
  }
  return [];
}

/**
 * Traverse relationships with cycle prevention and duplicate-path rejection.
 */
export function resolveRelationshipPaths(
  context: QueryResolutionContext,
  seeds: ProductIntelligenceObject[],
  targetDomain: QueryTargetDomain,
  relationshipKind: ProductIntelligenceQuery["relationshipKind"],
  maxDepth: number,
): { paths: QueryResultPath[]; issues: string[] } {
  const targetTypes = new Set(QUERY_DOMAIN_OBJECT_TYPES[targetDomain]);
  const paths: QueryResultPath[] = [];
  const seenSignatures = new Set<string>();
  const issues: string[] = [];
  const objectById = new Map(context.objects.map((o) => [o.id, o]));

  type Frame = {
    objectId: string;
    depth: number;
    pathObjectIds: string[];
    pathRelationshipIds: string[];
    visited: Set<string>;
  };

  const stack: Frame[] = seeds.map((seed) => ({
    objectId: seed.id,
    depth: 0,
    pathObjectIds: [seed.id],
    pathRelationshipIds: [],
    visited: new Set([seed.id]),
  }));

  while (stack.length > 0) {
    const frame = stack.pop()!;
    const current = objectById.get(frame.objectId);

    if (current && targetTypes.has(current.type) && frame.pathObjectIds.length > 0) {
      // Subject alone matching target is valid for domain listing; for
      // relationship walks require at least one edge unless seed is target.
      const hasEdge = frame.pathRelationshipIds.length > 0;
      const seedIsTarget = seeds.some((s) => s.id === current.id);
      if (hasEdge || (seedIsTarget && targetTypes.has(current.type))) {
        const signature = pathSignature(
          frame.pathObjectIds,
          frame.pathRelationshipIds,
        );
        if (!seenSignatures.has(signature)) {
          seenSignatures.add(signature);
          paths.push({
            objectIds: [...frame.pathObjectIds],
            relationshipIds: [...frame.pathRelationshipIds],
            signature,
          });
        }
      }
    }

    if (frame.depth >= maxDepth) continue;

    for (const edge of context.relationships) {
      let nextId: string | null = null;

      if (edge.fromId === frame.objectId) {
        nextId = edge.toId;
      } else if (edge.toId === frame.objectId) {
        // Undirected walk for relationship/dependency resolution.
        nextId = edge.fromId;
      } else {
        continue;
      }

      if (relationshipKind !== null && edge.kind !== relationshipKind) {
        continue;
      }

      // Validate the stored directed pattern — reverse walk still requires a legal edge.
      if (!isAllowedRelationship(edge.fromType, edge.kind, edge.toType)) {
        issues.push(`broken relationship pattern: ${edge.id}`);
        continue;
      }

      if (!objectById.has(nextId)) {
        issues.push(`orphan relationship endpoint: ${edge.id} → ${nextId}`);
        continue;
      }

      if (frame.visited.has(nextId)) {
        // Circular traversal — stop this branch.
        continue;
      }

      const nextVisited = new Set(frame.visited);
      nextVisited.add(nextId);
      stack.push({
        objectId: nextId,
        depth: frame.depth + 1,
        pathObjectIds: [...frame.pathObjectIds, nextId],
        pathRelationshipIds: [...frame.pathRelationshipIds, edge.id],
        visited: nextVisited,
      });
    }
  }

  return { paths, issues: [...new Set(issues)] };
}

function unique(ids: string[]): string[] {
  return [...new Set(ids)];
}

function deriveConfidence(
  evidenceCount: number,
  resultCount: number,
): ConfidenceLevel | "insufficient" {
  if (resultCount === 0 || evidenceCount === 0) return "insufficient";
  if (evidenceCount >= 3) return "observed";
  if (evidenceCount >= 1) return "inferred";
  return "insufficient";
}

function collectRelatedIds(
  objects: ProductIntelligenceObject[],
  resultIds: string[],
  relationships: ProductIntelligenceRelationship[],
): {
  decisions: string[];
  evolution: string[];
  health: string[];
  evidence: string[];
} {
  const byId = new Map(objects.map((o) => [o.id, o]));
  const resultSet = new Set(resultIds);
  const decisions: string[] = [];
  const evolution: string[] = [];
  const health: string[] = [];
  const evidence: string[] = [];

  for (const id of resultIds) {
    const obj = byId.get(id);
    if (!obj) continue;
    evidence.push(...obj.evidenceIds);
    if (obj.type === "decision") decisions.push(obj.id);
    if (obj.type === "product_evolution") evolution.push(obj.id);
    if (obj.type === "health_snapshot" || obj.type === "score") health.push(obj.id);
  }

  for (const edge of relationships) {
    const touchesResult =
      resultSet.has(edge.fromId) || resultSet.has(edge.toId);
    if (!touchesResult) continue;
    evidence.push(...edge.evidenceIds);
    for (const end of [edge.fromId, edge.toId]) {
      if (resultSet.has(end)) continue;
      const obj = byId.get(end);
      if (!obj) continue;
      if (obj.type === "decision") decisions.push(obj.id);
      if (obj.type === "product_evolution") evolution.push(obj.id);
      if (obj.type === "health_snapshot" || obj.type === "score") {
        health.push(obj.id);
      }
      evidence.push(...obj.evidenceIds);
    }
  }

  return {
    decisions: unique(decisions),
    evolution: unique(evolution),
    health: unique(health),
    evidence: unique(evidence),
  };
}

/**
 * Resolve a structured query against a Product Intelligence graph.
 * Returns unsupported/rejected when evidence cannot support the answer.
 */
export function resolveProductIntelligenceQuery(
  query: ProductIntelligenceQuery,
  context: QueryResolutionContext,
): ProductIntelligenceQueryAnswer {
  const validation = validateProductIntelligenceQuery(query);
  if (!validation.ok) {
    return {
      queryId: query.id,
      family: query.family,
      targetDomain: query.targetDomain,
      status: "rejected",
      resultObjectIds: [],
      resultPaths: [],
      evidenceIds: [],
      evidenceCount: 0,
      confidence: "insufficient",
      relatedDecisionIds: [],
      relatedEvolutionIds: [],
      relatedHealthIds: [],
      issues: validation.issues,
      evidenceBound: true,
    };
  }

  const domainObjects = collectObjectsByDomain(
    context.objects,
    query.targetDomain,
  );
  const needsSubject =
    query.family === "relationship" || query.family === "dependency";

  let resultObjectIds: string[] = [];
  let resultPaths: QueryResultPath[] = [];
  const issues: string[] = [];

  if (needsSubject) {
    const subjects = resolveSubjectObjects(context, query);
    if (subjects.length === 0) {
      return {
        queryId: query.id,
        family: query.family,
        targetDomain: query.targetDomain,
        status: "empty",
        resultObjectIds: [],
        resultPaths: [],
        evidenceIds: [],
        evidenceCount: 0,
        confidence: "insufficient",
        relatedDecisionIds: [],
        relatedEvolutionIds: [],
        relatedHealthIds: [],
        issues: ["subject not found in Product Intelligence graph"],
        evidenceBound: true,
      };
    }

    const resolved = resolveRelationshipPaths(
      context,
      subjects,
      query.targetDomain,
      query.relationshipKind,
      query.maxDepth,
    );
    issues.push(...resolved.issues);
    resultPaths = resolved.paths.filter((path) => {
      const terminal = path.objectIds[path.objectIds.length - 1];
      return domainObjects.some((obj) => obj.id === terminal);
    });
    // Deduplicate paths already handled; extract unique terminals in target domain.
    resultObjectIds = unique(
      resultPaths
        .map((p) => p.objectIds[p.objectIds.length - 1])
        .filter((id): id is string => Boolean(id)),
    );
  } else if (query.subjectObjectId || query.subjectTitleToken) {
    const subjects = resolveSubjectObjects(context, query);
    const matched = domainObjects.filter((obj) =>
      subjects.some(
        (s) =>
          s.id === obj.id ||
          s.relatedObjectIds.includes(obj.id) ||
          obj.relatedObjectIds.includes(s.id),
      ),
    );
    if (matched.length === 0 && subjects.length > 0) {
      // Exact domain objects matching subject id or exact title token.
      const token = (query.subjectTitleToken ?? "").trim().toLowerCase();
      resultObjectIds = domainObjects
        .filter(
          (obj) =>
            (query.subjectObjectId && obj.id === query.subjectObjectId) ||
            (token && obj.title.trim().toLowerCase() === token),
        )
        .map((o) => o.id);
    } else {
      resultObjectIds = matched.map((o) => o.id);
    }
    resultPaths = resultObjectIds.map((id) => ({
      objectIds: [id],
      relationshipIds: [],
      signature: pathSignature([id], []),
    }));
  } else {
    resultObjectIds = domainObjects.map((o) => o.id);
    resultPaths = resultObjectIds.map((id) => ({
      objectIds: [id],
      relationshipIds: [],
      signature: pathSignature([id], []),
    }));
  }

  const related = collectRelatedIds(
    context.objects,
    resultObjectIds,
    context.relationships,
  );

  if (resultObjectIds.length === 0) {
    return {
      queryId: query.id,
      family: query.family,
      targetDomain: query.targetDomain,
      status: "empty",
      resultObjectIds: [],
      resultPaths: [],
      evidenceIds: [],
      evidenceCount: 0,
      confidence: "insufficient",
      relatedDecisionIds: [],
      relatedEvolutionIds: [],
      relatedHealthIds: [],
      issues,
      evidenceBound: true,
    };
  }

  // Evidence law: every answer must include supporting evidence references.
  if (related.evidence.length === 0) {
    return {
      queryId: query.id,
      family: query.family,
      targetDomain: query.targetDomain,
      status: "unsupported",
      resultObjectIds: [],
      resultPaths: [],
      evidenceIds: [],
      evidenceCount: 0,
      confidence: "insufficient",
      relatedDecisionIds: related.decisions,
      relatedEvolutionIds: related.evolution,
      relatedHealthIds: related.health,
      issues: [
        ...issues,
        "no supporting evidence references — unsupported response rejected",
      ],
      evidenceBound: true,
    };
  }

  return {
    queryId: query.id,
    family: query.family,
    targetDomain: query.targetDomain,
    status: "resolved",
    resultObjectIds,
    resultPaths,
    evidenceIds: related.evidence,
    evidenceCount: related.evidence.length,
    confidence: deriveConfidence(related.evidence.length, resultObjectIds.length),
    relatedDecisionIds: related.decisions,
    relatedEvolutionIds: related.evolution,
    relatedHealthIds: related.health,
    issues,
    evidenceBound: true,
  };
}

/**
 * Detect duplicate path signatures in an answer.
 */
export function findDuplicateResultPaths(
  paths: QueryResultPath[],
): string[] {
  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const path of paths) {
    if (seen.has(path.signature)) dupes.push(path.signature);
    else seen.add(path.signature);
  }
  return dupes;
}

/**
 * Detect circular object sequences in paths (should never appear if resolver used).
 */
export function findCircularPaths(paths: QueryResultPath[]): string[] {
  return paths
    .filter((path) => {
      const set = new Set(path.objectIds);
      return set.size !== path.objectIds.length;
    })
    .map((p) => p.signature);
}
