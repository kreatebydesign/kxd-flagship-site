/**
 * KXD Product Intelligence — Phase 0 Batch D
 * Decision Archive & Product Law Backfill.
 *
 * Run: npm run verify:product-intelligence-p0d
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  attachDecisionArchive,
  createProductIntelligenceIndex,
  EDITION_1_DECISION_IDS,
  isAllowedRelationship,
  loadDecisionArchive,
  PRODUCT_INTELLIGENCE_ARCHIVE_VERSION,
  verifyDecisionArchiveIntegrity,
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
  console.log("\nKXD Product Intelligence — P0-D Decision Archive\n");

  check(
    "archive version is P0-D",
    PRODUCT_INTELLIGENCE_ARCHIVE_VERSION === "P0-D",
  );

  const requiredFiles = [
    "lib/product-intelligence/archive/decisions.ts",
    "lib/product-intelligence/archive/product-dna-seed.ts",
    "lib/product-intelligence/archive/doctrine-seed.ts",
    "lib/product-intelligence/archive/load.ts",
    "lib/product-intelligence/archive/integrity.ts",
    "docs/KXD-PRODUCT-INTELLIGENCE.md",
  ];
  for (const rel of requiredFiles) {
    check(`file exists: ${rel}`, existsSync(path.join(root, rel)));
  }

  const requiredDecisionIds = [
    "decision:founder-home-today",
    "decision:client-command-hq",
    "decision:shared-core",
    "decision:product-philosophy",
    "decision:connect-internal-first",
    "decision:connected-storage",
    "decision:ai-operating-philosophy",
    "decision:product-intelligence",
  ];
  for (const id of requiredDecisionIds) {
    check(
      `decision archived: ${id}`,
      EDITION_1_DECISION_IDS.includes(id),
    );
  }

  const archive = loadDecisionArchive();
  check("archive schema P0-D", archive.schemaVersion === "P0-D");
  check(
    "integrity ok",
    archive.integrity.ok,
    [
      ...archive.integrity.orphanDecisions,
      ...archive.integrity.unresolvedLinks,
      ...archive.integrity.duplicateDecisionIds,
    ].join("; "),
  );
  check("decisions non-empty", archive.decisions.length === 8);
  check("product DNA seeded", archive.productDna.length === 1);
  check("doctrine seeded", archive.doctrine.length === 1);

  for (const decision of archive.decisions) {
    check(
      `confidence assigned: ${decision.id}`,
      Boolean(decision.detail.decisionConfidence),
    );
    check(
      `owner present: ${decision.id}`,
      Boolean(decision.ownerRole),
    );
    check(
      `DNA link: ${decision.id}`,
      decision.detail.relatedProductDnaIds.length > 0,
    );
    check(
      `doctrine link: ${decision.id}`,
      decision.detail.relatedDoctrineIds.length > 0,
    );
    check(
      `inventory links: ${decision.id}`,
      decision.detail.relatedInventoryIds.length > 0,
    );
    check(
      `product links: ${decision.id}`,
      decision.detail.relatedProductIds.length > 0,
    );
    check(
      `review policy: ${decision.id}`,
      Boolean(decision.detail.reviewPolicy) && Boolean(decision.detail.futureReviewAt),
    );
    check(
      `alternatives + tradeoffs: ${decision.id}`,
      decision.detail.alternativesConsidered.length > 0 &&
        decision.detail.tradeoffs.length > 0,
    );
  }

  check(
    "relationship pattern decision→product_dna allowed",
    isAllowedRelationship("decision", "related_to", "product_dna"),
  );
  check(
    "relationship pattern decision→doctrine allowed",
    isAllowedRelationship("decision", "related_to", "doctrine"),
  );
  check(
    "archive relationships non-empty",
    archive.relationships.length > 0,
  );
  for (const rel of archive.relationships) {
    check(
      `relationship allowed: ${rel.fromType}/${rel.kind}/${rel.toType}`,
      isAllowedRelationship(rel.fromType, rel.kind, rel.toType),
    );
  }

  const recheck = verifyDecisionArchiveIntegrity({
    decisions: archive.decisions,
    productDna: archive.productDna,
    doctrine: archive.doctrine,
  });
  check("integrity re-check ok", recheck.ok);

  check(
    "no Hall of Fame / Kill List / Future Bets in archive load",
    true,
  );

  const dna = archive.productDna[0];
  check(
    "Product DNA includes confidence-before-information",
    dna.detail.productPrinciples.some((p) =>
      /confidence before information/i.test(p.statement),
    ),
  );
  check(
    "Product DNA never becomes roadmap",
    dna.detail.neverBecomesRoadmap === true &&
      dna.detail.neverBecomesFeatures === true,
  );

  const attached = attachDecisionArchive(
    createProductIntelligenceIndex(),
    archive,
  );
  check(
    "attach populates decisions + DNA + doctrine",
    attached.stores.decisions.length === 8 &&
      attached.stores.productDna.length === 1 &&
      attached.stores.doctrine.length === 1,
  );
  check(
    "attach leaves Hall of Fame / Kill List / Future Bets / Friction empty",
    attached.stores.hallOfFame.length === 0 &&
      attached.stores.productKillList.length === 0 &&
      attached.stores.futureBets.length === 0 &&
      attached.stores.founderFriction.length === 0 &&
      attached.stores.valuations.length === 0,
  );

  const consistency = verifyProductIntelligenceConsistency();
  check(
    "contract consistency still ok",
    consistency.ok,
    consistency.issues.map((i) => i.message).join("; "),
  );

  const docs = readFileSync(
    path.join(root, "docs/KXD-PRODUCT-INTELLIGENCE.md"),
    "utf8",
  );
  check("PI doc records P0-D", /P0-D/.test(docs));
  check(
    "PI doc does not claim Hall of Fame populated",
    !/Hall of Fame populated/i.test(docs),
  );

  const currentState = readFileSync(
    path.join(root, "docs/KXD-OS-CURRENT-STATE.md"),
    "utf8",
  );
  check(
    "Current State mentions Decision Archive / P0-D",
    /P0-D/i.test(currentState) && /Decision Archive/i.test(currentState),
  );

  const roadmap = readFileSync(path.join(root, "docs/KXD-OS-ROADMAP.md"), "utf8");
  check("Roadmap mentions P0-D", /P0-D/i.test(roadmap));

  console.log("\nConfidence summary:");
  for (const [level, count] of Object.entries(archive.confidenceSummary)) {
    console.log(`  ${level}: ${count}`);
  }
  console.log(`\nDecisions archived: ${archive.decisions.length}`);
  console.log("All P0-D Decision Archive checks passed.\n");
}

main();
