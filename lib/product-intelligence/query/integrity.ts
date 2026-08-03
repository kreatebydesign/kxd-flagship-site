/**
 * Query Engine integrity (P0-K).
 */

import {
  QUERY_FAMILY_DEFINITIONS,
  QUERY_TARGET_DOMAIN_DEFINITIONS,
} from "./registry";
import {
  createQueryCatalog,
  findCircularPaths,
  findDuplicateResultPaths,
  resolveProductIntelligenceQuery,
  validateProductIntelligenceQuery,
} from "./rules";
import type { QueryEngineIndex } from "./types";
import {
  QUERY_FAMILIES,
  QUERY_TARGET_DOMAINS,
} from "./types";

export interface QueryEngineIntegrityReport {
  ok: boolean;
  issues: string[];
  checksPassed: string[];
}

export function verifyQueryEngineIntegrity(
  index: QueryEngineIndex,
): QueryEngineIntegrityReport {
  const issues: string[] = [];
  const checksPassed: string[] = [];

  if (index.schemaVersion !== "P0-K") {
    issues.push("schemaVersion must be P0-K");
  } else {
    checksPassed.push("Schema version is P0-K");
  }

  if (QUERY_FAMILY_DEFINITIONS.length !== QUERY_FAMILIES.length) {
    issues.push("query family definitions incomplete");
  } else {
    checksPassed.push("Query families complete (10)");
  }

  if (QUERY_TARGET_DOMAIN_DEFINITIONS.length !== QUERY_TARGET_DOMAINS.length) {
    issues.push("target domain definitions incomplete");
  } else {
    checksPassed.push("Query target domains complete (10)");
  }

  if (QUERY_FAMILY_DEFINITIONS.some((f) => !QUERY_FAMILIES.includes(f.id))) {
    issues.push("unknown query family in registry");
  }

  if (
    QUERY_TARGET_DOMAIN_DEFINITIONS.some(
      (d) => !QUERY_TARGET_DOMAINS.includes(d.id),
    )
  ) {
    issues.push("unknown target domain in registry");
  }

  if (index.executedQueryLog.length !== 0) {
    issues.push("P0-K must not populate executed query log");
  } else {
    checksPassed.push("Executed query log empty — architecture only");
  }

  for (const linkage of index.futureLinkages) {
    if (linkage.implementationAuthorized !== false) {
      issues.push(`future linkage ${linkage.target} must remain unauthorized`);
    }
  }
  if (!issues.some((i) => i.includes("future linkage"))) {
    checksPassed.push("Future linkages prepared but not implemented");
  }

  const catalog = createQueryCatalog();
  if (catalog.length === 0) {
    issues.push("query catalog must include structured example queries");
  } else {
    checksPassed.push("Structured query catalog present");
  }

  for (const query of catalog) {
    const validation = validateProductIntelligenceQuery(query);
    if (!validation.ok) {
      issues.push(`catalog query ${query.id} invalid: ${validation.issues.join("; ")}`);
    }
  }
  if (!issues.some((i) => i.startsWith("catalog query"))) {
    checksPassed.push("Catalog queries validate against contracts");
  }

  const whyQuery = catalog.find((q) => q.id === "query:why-kxd-works-this-way");
  if (
    !whyQuery ||
    whyQuery.family !== "why" ||
    whyQuery.targetDomain !== "decisions"
  ) {
    issues.push("permanent Why query must target decisions");
  } else {
    checksPassed.push("Permanent Why-query contract present");
  }

  // Integrity: empty graph must not invent orphan answers.
  const emptyAnswer = resolveProductIntelligenceQuery(whyQuery!, {
    objects: [],
    relationships: [],
  });
  if (emptyAnswer.status === "resolved") {
    issues.push("empty graph must not resolve answers");
  } else if (emptyAnswer.evidenceIds.length > 0) {
    issues.push("empty graph must not invent evidence");
  } else {
    checksPassed.push("Empty graph yields empty/unsupported — no orphan answers");
  }

  // Reject free-form family.
  const freeForm = validateProductIntelligenceQuery({
    id: "query:bad",
    family: "why",
    targetDomain: "decisions",
    subjectObjectId: null,
    subjectTitleToken: null,
    relationshipKind: null,
    maxDepth: 0,
  });
  if (freeForm.ok) {
    issues.push("invalid maxDepth must be rejected");
  } else {
    checksPassed.push("Invalid query shapes rejected");
  }

  const dupes = findDuplicateResultPaths([
    { objectIds: ["a", "b"], relationshipIds: ["r1"], signature: "a>b|r1" },
    { objectIds: ["a", "b"], relationshipIds: ["r1"], signature: "a>b|r1" },
  ]);
  const circles = findCircularPaths([
    {
      objectIds: ["a", "b", "a"],
      relationshipIds: ["r1", "r2"],
      signature: "a>b>a|r1,r2",
    },
  ]);
  if (dupes.length === 0 || circles.length === 0) {
    issues.push("duplicate/circular path detectors must fire on fixtures");
  } else {
    checksPassed.push("Duplicate path + circular traversal detectors present");
  }

  if (!index.entryPoints.forHumans.length || !index.entryPoints.forCursor.length) {
    issues.push("entry points incomplete");
  } else {
    checksPassed.push("Query Engine Index entry points present");
  }

  if (!/not.*(ai|chat|natural language)|structured query/i.test(index.law.join(" "))) {
    issues.push("Query Engine law must forbid AI/chat/NL as the query layer");
  } else {
    checksPassed.push("Query Engine law recorded");
  }

  if (
    index.permanentQuestion !== "Why does KXD work this way?"
  ) {
    issues.push("permanent question must be Why does KXD work this way?");
  } else {
    checksPassed.push("Permanent Query Engine question present");
  }

  return {
    ok: issues.length === 0,
    issues,
    checksPassed,
  };
}
