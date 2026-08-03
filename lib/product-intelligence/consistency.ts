/**
 * Internal consistency checks for Product Intelligence contracts (P0-B).
 * No content validation — schema/graph integrity only.
 */

import { EVIDENCE_TYPES } from "./evidence";
import { PRODUCT_INTELLIGENCE_INDEX } from "./product-index";
import { PRODUCT_INTELLIGENCE_OBJECT_TYPES } from "./primitives";
import {
  listDuplicateDomainTypeAssignments,
  listOrphanObjectTypes,
  OBJECT_TYPE_REGISTRY,
  PRIMARY_OWNER_BY_TYPE,
} from "./registry";
import {
  ALLOWED_RELATIONSHIP_PATTERNS,
  CANONICAL_TRACE_CHAIN,
  isAllowedRelationship,
  relationshipTypesResolve,
} from "./relationships";
import {
  assertUpdateChannelAllowed,
  DEFAULT_UPDATE_CHANNEL_BY_TYPE,
  isProtectedObjectType,
  PROTECTED_OBJECT_TYPES,
} from "./update-engine";

export interface ConsistencyIssue {
  code: string;
  message: string;
}

export interface ConsistencyReport {
  ok: boolean;
  issues: ConsistencyIssue[];
  checksPassed: string[];
}

export function verifyProductIntelligenceConsistency(): ConsistencyReport {
  const issues: ConsistencyIssue[] = [];
  const checksPassed: string[] = [];

  const orphans = listOrphanObjectTypes();
  if (orphans.length > 0) {
    issues.push({
      code: "orphan_object_type",
      message: `Object types missing exactly-one domain: ${orphans.join(", ")}`,
    });
  } else {
    checksPassed.push("No orphan object types");
  }

  const duplicates = listDuplicateDomainTypeAssignments();
  if (duplicates.length > 0) {
    issues.push({
      code: "duplicate_domain_assignment",
      message: `Object types in multiple domains: ${duplicates.join(", ")}`,
    });
  } else {
    checksPassed.push("No duplicate intelligence domain assignments");
  }

  if (OBJECT_TYPE_REGISTRY.length !== PRODUCT_INTELLIGENCE_OBJECT_TYPES.length) {
    issues.push({
      code: "registry_length_mismatch",
      message: "OBJECT_TYPE_REGISTRY length does not match object type union.",
    });
  } else {
    checksPassed.push("Object type registry covers all types");
  }

  for (const type of PRODUCT_INTELLIGENCE_OBJECT_TYPES) {
    if (!PRIMARY_OWNER_BY_TYPE[type]) {
      issues.push({
        code: "missing_owner",
        message: `No primary owner for ${type}`,
      });
    }
  }
  if (!issues.some((issue) => issue.code === "missing_owner")) {
    checksPassed.push("Every object type has a primary owner role");
  }

  for (const type of PROTECTED_OBJECT_TYPES) {
    if (DEFAULT_UPDATE_CHANNEL_BY_TYPE[type] !== "protected") {
      issues.push({
        code: "protected_channel",
        message: `${type} default channel must be protected`,
      });
    }
    const auto = assertUpdateChannelAllowed(type, "automatic");
    if (auto.allowed) {
      issues.push({
        code: "protected_auto_allowed",
        message: `${type} must reject automatic updates`,
      });
    }
  }
  if (
    !issues.some(
      (issue) =>
        issue.code === "protected_channel" ||
        issue.code === "protected_auto_allowed",
    )
  ) {
    checksPassed.push(
      "Doctrine, Product DNA, and Vision are protected from automatic change",
    );
  }

  for (const pattern of ALLOWED_RELATIONSHIP_PATTERNS) {
    if (!relationshipTypesResolve(pattern.from, pattern.to)) {
      issues.push({
        code: "relationship_unresolved_type",
        message: `${pattern.from} → ${pattern.to} includes unknown type`,
      });
    }
    if (!isAllowedRelationship(pattern.from, pattern.kind, pattern.to)) {
      issues.push({
        code: "relationship_self_inconsistent",
        message: `Pattern not recognized by isAllowedRelationship: ${pattern.from}/${pattern.kind}/${pattern.to}`,
      });
    }
  }
  if (
    !issues.some(
      (issue) =>
        issue.code === "relationship_unresolved_type" ||
        issue.code === "relationship_self_inconsistent",
    )
  ) {
    checksPassed.push("Relationship patterns resolve to known object types");
  }

  for (const type of CANONICAL_TRACE_CHAIN) {
    if (!(PRODUCT_INTELLIGENCE_OBJECT_TYPES as readonly string[]).includes(type)) {
      issues.push({
        code: "trace_chain_orphan",
        message: `Canonical trace type missing from registry: ${type}`,
      });
    }
  }
  if (!issues.some((issue) => issue.code === "trace_chain_orphan")) {
    checksPassed.push("Canonical friction→decision→roadmap→release→valuation→fame chain resolves");
  }

  if (EVIDENCE_TYPES.length < 8) {
    issues.push({
      code: "evidence_types_incomplete",
      message: "Evidence type vocabulary incomplete relative to P0-B requirements",
    });
  } else {
    checksPassed.push("Evidence Registry type vocabulary present");
  }

  const index = PRODUCT_INTELLIGENCE_INDEX;
  if (index.meta.architectureVersion !== "P0-A") {
    issues.push({
      code: "architecture_drift",
      message: "Index architectureVersion must remain P0-A",
    });
  }
  if (index.meta.contractsVersion !== "P0-B") {
    issues.push({
      code: "contracts_version",
      message: "Index contractsVersion must be P0-B",
    });
  }
  if (index.meta.inventoryVersion !== "P0-C") {
    issues.push({
      code: "inventory_version",
      message: "Index inventoryVersion must be P0-C",
    });
  } else {
    checksPassed.push("Inventory engine version is P0-C");
  }
  if (index.meta.archiveVersion !== "P0-D") {
    issues.push({
      code: "archive_version",
      message: "Index archiveVersion must be P0-D",
    });
  } else {
    checksPassed.push("Decision Archive version is P0-D");
  }
  if (index.meta.healthVersion !== "P0-E") {
    issues.push({
      code: "health_version",
      message: "Index healthVersion must be P0-E",
    });
  } else {
    checksPassed.push("Platform Health Engine version is P0-E");
  }
  if (index.meta.frictionVersion !== "P0-F") {
    issues.push({
      code: "friction_version",
      message: "Index frictionVersion must be P0-F",
    });
  } else {
    checksPassed.push("Founder Friction Engine version is P0-F");
  }

  // Later-batch stores must stay empty on the default singleton.
  // founderFriction remains empty until authorized observation capture (contracts only in P0-F).
  const protectedEmptyStores: Array<keyof typeof index.stores> = [
    "vision",
    "hallOfFame",
    "productKillList",
    "futureBets",
    "valuations",
    "founderFriction",
    "competitiveInsights",
  ];
  for (const key of protectedEmptyStores) {
    if (index.stores[key].length > 0) {
      issues.push({
        code: "premature_population",
        message: `Store ${key} must remain empty until an authorized later batch`,
      });
    }
  }
  if (index.evidenceRegistry.records.length !== 0) {
    issues.push({
      code: "premature_evidence",
      message: "Evidence registry population is not part of P0-F",
    });
  }
  if (!issues.some((issue) => issue.code.startsWith("premature_"))) {
    checksPassed.push(
      "Later-batch stores empty — no Hall of Fame / Kill List / Future Bets / Friction observations / Competitive / valuation population",
    );
  }

  // Default singleton has no attached inventory/archive; attach is explicit.
  if (
    index.automaticInventory === null &&
    index.stores.productInventory.length !== 0
  ) {
    issues.push({
      code: "inventory_attach_mismatch",
      message: "productInventory populated without automaticInventory attach",
    });
  } else {
    checksPassed.push("Inventory attach state is consistent");
  }
  if (
    index.decisionArchive === null &&
    (index.stores.decisions.length !== 0 ||
      index.stores.productDna.length !== 0 ||
      index.stores.doctrine.length !== 0)
  ) {
    issues.push({
      code: "archive_attach_mismatch",
      message:
        "decisions/productDna/doctrine populated without decisionArchive attach",
    });
  } else {
    checksPassed.push("Decision Archive attach state is consistent");
  }
  if (
    index.founderFrictionEngine === null &&
    index.stores.founderFriction.length !== 0
  ) {
    issues.push({
      code: "friction_attach_mismatch",
      message: "founderFriction populated without founderFrictionEngine attach",
    });
  } else {
    checksPassed.push("Founder Friction attach state is consistent");
  }

  if (!isProtectedObjectType("product_dna")) {
    issues.push({
      code: "dna_not_protected",
      message: "product_dna must be protected",
    });
  } else {
    checksPassed.push("Product DNA is protected and harder-change class");
  }

  return {
    ok: issues.length === 0,
    issues,
    checksPassed,
  };
}
