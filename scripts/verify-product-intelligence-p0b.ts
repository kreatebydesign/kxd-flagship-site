/**
 * KXD Product Intelligence — Phase 0 Batch B
 * Object contracts & system foundations.
 *
 * Run: npm run verify:product-intelligence-p0b
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  assertUpdateChannelAllowed,
  CANONICAL_TRACE_CHAIN,
  createEmptyEvidenceRegistry,
  createProductIntelligenceIndex,
  DEFAULT_UPDATE_CHANNEL_BY_TYPE,
  EMPTY_FUTURE_BET_FLAGS,
  EMPTY_PRODUCT_DNA_DETAIL,
  EVIDENCE_TYPES,
  isAllowedRelationship,
  listOrphanObjectTypes,
  OBJECT_TYPE_REGISTRY,
  PRIMARY_OWNER_BY_TYPE,
  PRODUCT_INTELLIGENCE_ARCHITECTURE_VERSION,
  PRODUCT_INTELLIGENCE_CONTRACTS_VERSION,
  PRODUCT_INTELLIGENCE_INDEX,
  PRODUCT_INTELLIGENCE_MISSION,
  PRODUCT_INTELLIGENCE_OBJECT_TYPES,
  PROTECTED_OBJECT_TYPES,
  verifyProductIntelligenceConsistency,
} from "../lib/product-intelligence/index.ts";

const root = process.cwd();

function check(label: string, pass: boolean, detail?: string) {
  console.log(
    pass ? `  ✔ ${label}` : `  ✘ ${label}${detail ? ` — ${detail}` : ""}`,
  );
  assert.ok(pass, detail ? `${label}: ${detail}` : label);
}

function main() {
  console.log("\nKXD Product Intelligence — P0-B contracts & foundations\n");

  const requiredFiles = [
    "lib/product-intelligence/index.ts",
    "lib/product-intelligence/law.ts",
    "lib/product-intelligence/primitives.ts",
    "lib/product-intelligence/evidence.ts",
    "lib/product-intelligence/relationships.ts",
    "lib/product-intelligence/versioning.ts",
    "lib/product-intelligence/update-engine.ts",
    "lib/product-intelligence/contracts.ts",
    "lib/product-intelligence/registry.ts",
    "lib/product-intelligence/product-index.ts",
    "lib/product-intelligence/consistency.ts",
    "docs/KXD-PRODUCT-INTELLIGENCE.md",
  ];

  for (const rel of requiredFiles) {
    check(`file exists: ${rel}`, existsSync(path.join(root, rel)));
  }

  check(
    "architecture version is P0-A (immutable law)",
    PRODUCT_INTELLIGENCE_ARCHITECTURE_VERSION === "P0-A",
  );
  check(
    "contracts version is P0-B",
    PRODUCT_INTELLIGENCE_CONTRACTS_VERSION === "P0-B",
  );
  check(
    "mission question present",
    PRODUCT_INTELLIGENCE_MISSION.includes("without relying on conversation history"),
  );

  const requiredTypes = [
    "doctrine",
    "product_dna",
    "vision",
    "product_inventory",
    "architecture",
    "experience",
    "design_system",
    "evidence",
    "decision",
    "founder_friction",
    "competitive_insight",
    "roadmap_item",
    "technical_debt",
    "release",
    "product_evolution",
    "score",
    "valuation",
    "health_snapshot",
    "hall_of_fame",
    "product_kill_list",
    "future_bet",
  ];
  for (const type of requiredTypes) {
    check(
      `object type registered: ${type}`,
      (PRODUCT_INTELLIGENCE_OBJECT_TYPES as readonly string[]).includes(type),
    );
  }

  check("no orphan object types", listOrphanObjectTypes().length === 0);
  check(
    "registry entry per object type",
    OBJECT_TYPE_REGISTRY.length === PRODUCT_INTELLIGENCE_OBJECT_TYPES.length,
  );

  for (const type of PRODUCT_INTELLIGENCE_OBJECT_TYPES) {
    check(`owner present for ${type}`, Boolean(PRIMARY_OWNER_BY_TYPE[type]));
  }

  for (const type of PROTECTED_OBJECT_TYPES) {
    check(
      `${type} default channel is protected`,
      DEFAULT_UPDATE_CHANNEL_BY_TYPE[type] === "protected",
    );
    check(
      `${type} rejects automatic updates`,
      assertUpdateChannelAllowed(type, "automatic").allowed === false,
    );
  }

  check(
    "Product DNA empty detail flags never-roadmap / never-features",
    EMPTY_PRODUCT_DNA_DETAIL.neverBecomesRoadmap === true &&
      EMPTY_PRODUCT_DNA_DETAIL.neverBecomesFeatures === true &&
      EMPTY_PRODUCT_DNA_DETAIL.coreBeliefs.length === 0,
  );

  check(
    "Future Bet structural flags (not approved, not scheduled, no auto-promote)",
    EMPTY_FUTURE_BET_FLAGS.approved === false &&
      EMPTY_FUTURE_BET_FLAGS.scheduled === false &&
      EMPTY_FUTURE_BET_FLAGS.neverAutoPromotesToRoadmap === true,
  );

  const evidenceRequired = [
    "commit",
    "verifier",
    "release",
    "ux_observation",
    "founder_observation",
    "competitive_review",
    "architecture_review",
    "roadmap_decision",
  ];
  for (const type of evidenceRequired) {
    check(
      `evidence type: ${type}`,
      (EVIDENCE_TYPES as readonly string[]).includes(type),
    );
  }
  check(
    "empty evidence registry",
    createEmptyEvidenceRegistry().records.length === 0,
  );

  check(
    "canonical trace allows friction → decision",
    isAllowedRelationship("founder_friction", "promotes_to", "decision"),
  );
  check(
    "canonical trace allows decision → roadmap",
    isAllowedRelationship("decision", "promotes_to", "roadmap_item"),
  );
  check(
    "canonical trace allows roadmap → release",
    isAllowedRelationship("roadmap_item", "implements", "release"),
  );
  check(
    "canonical trace allows release → valuation",
    isAllowedRelationship("release", "moves", "valuation"),
  );
  check(
    "canonical trace allows valuation → hall of fame",
    isAllowedRelationship("valuation", "commemorates", "hall_of_fame"),
  );
  check(
    "canonical chain length",
    CANONICAL_TRACE_CHAIN.length === 6,
  );

  const index = createProductIntelligenceIndex();
  const storeCount = Object.values(index.stores).reduce(
    (sum, bucket) => sum + bucket.length,
    0,
  );
  check("root index stores empty", storeCount === 0);
  check(
    "singleton index matches empty stores",
    Object.values(PRODUCT_INTELLIGENCE_INDEX.stores).every(
      (bucket) => bucket.length === 0,
    ),
  );
  check(
    "entry points defined for humans / Cursor / future AI",
    Boolean(index.entryPoints.forHumans.startAt) &&
      Boolean(index.entryPoints.forCursor.instruction) &&
      Boolean(index.entryPoints.forFutureAi.promptContract),
  );

  const report = verifyProductIntelligenceConsistency();
  for (const passed of report.checksPassed) {
    check(passed, true);
  }
  check(
    "consistency report ok",
    report.ok,
    report.issues.map((issue) => issue.message).join("; "),
  );

  const archDoc = readFileSync(
    path.join(root, "docs/KXD-PRODUCT-INTELLIGENCE.md"),
    "utf8",
  );
  check("architecture doc records P0-A", /P0-A/.test(archDoc));
  check("architecture doc records P0-B complete", /P0-B/.test(archDoc));
  check(
    "architecture doc does not claim populated inventory",
    !/Hall of Fame populated|Kill List populated|Future Bets populated/i.test(
      archDoc,
    ),
  );

  const currentState = readFileSync(
    path.join(root, "docs/KXD-OS-CURRENT-STATE.md"),
    "utf8",
  );
  check(
    "Current State mentions Product Intelligence P0-B",
    /Product Intelligence/i.test(currentState) && /P0-B/i.test(currentState),
  );

  const roadmap = readFileSync(
    path.join(root, "docs/KXD-OS-ROADMAP.md"),
    "utf8",
  );
  check(
    "Roadmap mentions Product Intelligence P0-B",
    /Product Intelligence/i.test(roadmap) && /P0-B/i.test(roadmap),
  );

  console.log("\nAll P0-B contract checks passed.\n");
}

main();
