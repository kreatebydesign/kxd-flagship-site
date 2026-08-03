/**
 * KXD Product Intelligence — Phase 0 Batch G
 * Product Evolution Ledger (contracts only).
 *
 * Run: npm run verify:product-intelligence-p0g
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  attachProductEvolutionEngine,
  buildEvolutionTimeline,
  createProductEvolutionObject,
  createProductIntelligenceIndex,
  EDITION_1_DOCTRINE,
  loadProductEvolutionEngine,
  PRODUCT_EVOLUTION_DEFINING_MOMENTS_QUESTION,
  PRODUCT_EVOLUTION_LAW,
  PRODUCT_EVOLUTION_QUESTION,
  PRODUCT_EVOLUTION_TYPE_DEFINITIONS,
  PRODUCT_EVOLUTION_TYPES,
  PRODUCT_INTELLIGENCE_EVOLUTION_VERSION,
  validateEvolutionCreate,
  validateReleaseLinks,
  verifyProductEvolutionEngineIntegrity,
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
  console.log("\nKXD Product Intelligence — P0-G Product Evolution Ledger\n");

  check(
    "evolution version is P0-G",
    PRODUCT_INTELLIGENCE_EVOLUTION_VERSION === "P0-G",
  );

  const requiredFiles = [
    "lib/product-intelligence/evolution/engine.ts",
    "lib/product-intelligence/evolution/registry.ts",
    "lib/product-intelligence/evolution/rules.ts",
    "lib/product-intelligence/evolution/types.ts",
    "lib/product-intelligence/evolution/integrity.ts",
    "lib/product-intelligence/evolution/index.ts",
    "docs/KXD-PRODUCT-INTELLIGENCE.md",
  ];
  for (const rel of requiredFiles) {
    check(`file exists: ${rel}`, existsSync(path.join(root, rel)));
  }

  check(
    "permanent evolution question present",
    PRODUCT_EVOLUTION_QUESTION === "How did KXD OS become what it is today?",
  );
  check(
    "defining moments question present",
    /defining moments/i.test(PRODUCT_EVOLUTION_DEFINING_MOMENTS_QUESTION),
  );
  check(
    "evolution law deliberate decisions",
    PRODUCT_EVOLUTION_LAW.some((l) =>
      /deliberate product decisions/i.test(l),
    ),
  );

  check("evolution types = 10", PRODUCT_EVOLUTION_TYPES.length === 10);
  check(
    "type definitions match vocabulary",
    PRODUCT_EVOLUTION_TYPE_DEFINITIONS.length === PRODUCT_EVOLUTION_TYPES.length,
  );

  const requiredTypes = [
    "product_milestone",
    "architecture_milestone",
    "ux_milestone",
    "platform_milestone",
    "infrastructure_milestone",
    "ai_milestone",
    "commercial_milestone",
    "integration_milestone",
    "deployment_milestone",
    "verification_milestone",
  ];
  for (const id of requiredTypes) {
    check(
      `type: ${id}`,
      PRODUCT_EVOLUTION_TYPES.includes(
        id as (typeof PRODUCT_EVOLUTION_TYPES)[number],
      ),
    );
  }

  const result = loadProductEvolutionEngine();
  check("engine loads", result.schemaVersion === "P0-G");
  check(
    "integrity ok",
    result.integrity.ok,
    result.integrity.issues.join("; "),
  );
  check("entries empty", result.index.entries.length === 0);
  check("releases empty", result.index.releases.length === 0);
  check("timeline empty", result.index.timeline.orderedEntryIds.length === 0);
  check(
    "future linkages unauthorized",
    result.index.futureLinkages.every((l) => l.implementationAuthorized === false),
  );
  check(
    "future linkage targets prepared",
    result.index.futureLinkages.some((l) => l.target === "hall_of_fame") &&
      result.index.futureLinkages.some((l) => l.target === "product_kill_list") &&
      result.index.futureLinkages.some((l) => l.target === "future_bets") &&
      result.index.futureLinkages.some((l) => l.target === "competitive_intelligence") &&
      result.index.futureLinkages.some((l) => l.target === "valuation_intelligence") &&
      result.index.futureLinkages.some((l) => l.target === "weekly_reviews"),
  );

  // Evidence + relationship rules
  const anonymous = validateEvolutionCreate({
    id: "evolution:anon",
    title: "Anon",
    evolutionType: "product_milestone",
    summary: "x",
    detailedReasoning: "y",
    milestoneDate: "2026-08-02T00:00:00.000Z",
    evidenceIds: [],
    relatedReleaseIds: [],
    relatedCommitShas: [],
    relatedVerifierIds: [],
    relatedInventoryIds: [],
    relatedDecisionIds: [],
    relatedProductDnaIds: [],
    relatedHealthMovementIds: [],
    relatedFrictionIds: [],
    gitEvidence: [],
    ownerRole: "cpo",
    objectSummary: "anon",
  });
  check("milestone without evidence rejected", anonymous.ok === false);

  const orphanRelease = validateReleaseLinks({
    id: "release:orphan",
    releaseKey: "orphan",
    relatedDecisionIds: [],
    relatedInventoryIds: [],
    relatedVerifierIds: [],
    relatedHealthDomainIds: [],
    relatedEvolutionIds: [],
    evidenceIds: [],
  });
  check("orphan release rejected", orphanRelease.ok === false);

  const validRelease = validateReleaseLinks({
    id: "release:example",
    releaseKey: "p0g-contracts",
    relatedDecisionIds: ["decision:product-intelligence"],
    relatedInventoryIds: ["inv:product-intelligence"],
    relatedVerifierIds: ["verify:product-intelligence-p0g"],
    relatedHealthDomainIds: ["product_clarity"],
    relatedEvolutionIds: ["evolution:example"],
    evidenceIds: ["ev:1"],
  });
  check("linked release accepted", validRelease.ok === true);

  const validInput = {
    id: "evolution:example-contract-only",
    title: "Example evolution milestone",
    evolutionType: "platform_milestone" as const,
    summary: "Product Intelligence control plane established.",
    detailedReasoning:
      "Institutional product memory became a first-class system so KXD OS no longer depends on chat history.",
    milestoneDate: "2026-08-02T00:00:00.000Z",
    evidenceIds: ["ev:pi-p0a"],
    relatedReleaseIds: [],
    relatedCommitShas: ["97fc4b3"],
    relatedVerifierIds: ["verify:product-intelligence-p0b"],
    relatedInventoryIds: ["inv:product-intelligence"],
    relatedDecisionIds: ["decision:product-intelligence"],
    relatedProductDnaIds: ["dna:edition-1"],
    relatedHealthMovementIds: [],
    relatedFrictionIds: [],
    gitEvidence: [
      {
        commitSha: "97fc4b3",
        branch: "feature/product-intelligence-p0b-contracts",
        deploymentId: null,
        verificationRunId: "verify:product-intelligence-p0f",
        note: "Contracts-only linkage example — not ledger population.",
      },
    ],
    ownerRole: "cpo" as const,
    objectSummary: "Control plane for building KXD OS itself.",
  };
  const validCreate = validateEvolutionCreate(validInput);
  check(
    "valid evolution create accepted",
    validCreate.ok,
    validCreate.issues.join("; "),
  );

  const entry = createProductEvolutionObject(validInput);
  check("created entry type product_evolution", entry.type === "product_evolution");
  check("created entry has evidence", entry.evidenceIds.length > 0);
  check(
    "created entry closed type",
    entry.detail.evolutionType === "platform_milestone",
  );

  // Chronology helper (in-memory sample — not persisted)
  const timeline = buildEvolutionTimeline([
    {
      id: "evolution:b",
      milestoneDate: "2026-08-02T00:00:00.000Z",
      evolutionType: "ux_milestone",
    },
    {
      id: "evolution:a",
      milestoneDate: "2026-07-01T00:00:00.000Z",
      evolutionType: "architecture_milestone",
    },
  ]);
  check(
    "timeline orders ascending",
    timeline.orderedEntryIds[0] === "evolution:a" &&
      timeline.orderedEntryIds[1] === "evolution:b",
  );
  check("timeline lookup present", timeline.lookupById["evolution:a"] === 0);
  check("timeline grouping present", timeline.groups.length >= 2);

  const recheck = verifyProductEvolutionEngineIntegrity(result.index);
  check("integrity re-check ok", recheck.ok);

  const attached = attachProductEvolutionEngine(
    createProductIntelligenceIndex(),
    result,
  );
  check(
    "attach stores productEvolutionEngine",
    attached.productEvolutionEngine !== null,
  );
  check(
    "attach does not populate evolution entries",
    attached.stores.productEvolution.length === 0,
  );
  check(
    "attach does not populate Hall of Fame / Kill List / Future Bets / valuation",
    attached.stores.hallOfFame.length === 0 &&
      attached.stores.productKillList.length === 0 &&
      attached.stores.futureBets.length === 0 &&
      attached.stores.valuations.length === 0,
  );

  check(
    "doctrine includes product evolution law",
    EDITION_1_DOCTRINE.detail.buildAuthorizationRules.some(
      (law) => law.id === "law-product-evolution-deliberate",
    ),
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
  check("PI doc records P0-G", /P0-G/.test(docs));
  check(
    "PI doc does not claim ledger populated",
    !/evolution ledger populated|Product Evolution populated/i.test(docs),
  );

  const currentState = readFileSync(
    path.join(root, "docs/KXD-OS-CURRENT-STATE.md"),
    "utf8",
  );
  check(
    "Current State mentions Product Evolution / P0-G",
    /P0-G/i.test(currentState) && /Product Evolution/i.test(currentState),
  );

  const roadmap = readFileSync(path.join(root, "docs/KXD-OS-ROADMAP.md"), "utf8");
  check("Roadmap mentions P0-G", /P0-G/i.test(roadmap));

  console.log("\nModel counts:");
  console.log(`  evolution types: ${PRODUCT_EVOLUTION_TYPES.length}`);
  console.log(`  future linkages: ${result.index.futureLinkages.length}`);
  console.log("\nAll P0-G Product Evolution Ledger checks passed.\n");
}

main();
