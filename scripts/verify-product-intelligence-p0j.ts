/**
 * KXD Product Intelligence — Phase 0 Batch J
 * Future Bets Engine (contracts only).
 *
 * Run: npm run verify:product-intelligence-p0j
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  attachFutureBetsEngine,
  buildFutureBetsTimeline,
  createFutureBetObject,
  createProductIntelligenceIndex,
  EMPTY_FUTURE_BET_FLAGS,
  FUTURE_BET_CATEGORIES,
  FUTURE_BET_CATEGORY_DEFINITIONS,
  FUTURE_BET_MATURITIES,
  FUTURE_BET_MATURITY_DEFINITIONS,
  FUTURE_BETS_LAW,
  FUTURE_BETS_QUESTION,
  loadFutureBetsEngine,
  PRODUCT_INTELLIGENCE_FUTURE_BETS_VERSION,
  validateFutureBetCreate,
  validateFutureBetPromotion,
  verifyFutureBetsEngineIntegrity,
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
  console.log("\nKXD Product Intelligence — P0-J Future Bets Engine\n");

  check(
    "future bets version is P0-J",
    PRODUCT_INTELLIGENCE_FUTURE_BETS_VERSION === "P0-J",
  );

  const requiredFiles = [
    "lib/product-intelligence/future-bets/engine.ts",
    "lib/product-intelligence/future-bets/registry.ts",
    "lib/product-intelligence/future-bets/rules.ts",
    "lib/product-intelligence/future-bets/types.ts",
    "lib/product-intelligence/future-bets/integrity.ts",
    "lib/product-intelligence/future-bets/index.ts",
    "docs/KXD-PRODUCT-INTELLIGENCE.md",
  ];
  for (const rel of requiredFiles) {
    check(`file exists: ${rel}`, existsSync(path.join(root, rel)));
  }

  check(
    "permanent Future Bets question present",
    FUTURE_BETS_QUESTION ===
      "What does KXD believe the future should look like?",
  );
  check(
    "Future Bets law separates vision from commitment",
    FUTURE_BETS_LAW.some((l) => /not.*roadmap|never.*roadmap|commitment/i.test(l)),
  );

  check("categories = 10", FUTURE_BET_CATEGORIES.length === 10);
  check(
    "category definitions match",
    FUTURE_BET_CATEGORY_DEFINITIONS.length === FUTURE_BET_CATEGORIES.length,
  );
  check("maturities = 6", FUTURE_BET_MATURITIES.length === 6);
  check(
    "maturity definitions match",
    FUTURE_BET_MATURITY_DEFINITIONS.length === FUTURE_BET_MATURITIES.length,
  );
  check(
    "no maturity is roadmap",
    FUTURE_BET_MATURITY_DEFINITIONS.every((m) => m.isRoadmap === false),
  );
  check(
    "P0-B structural flags preserved",
    EMPTY_FUTURE_BET_FLAGS.approved === false &&
      EMPTY_FUTURE_BET_FLAGS.scheduled === false &&
      EMPTY_FUTURE_BET_FLAGS.neverAutoPromotesToRoadmap === true,
  );

  for (const id of FUTURE_BET_CATEGORIES) {
    check(
      `category: ${id}`,
      FUTURE_BET_CATEGORY_DEFINITIONS.some((d) => d.id === id),
    );
  }
  for (const id of FUTURE_BET_MATURITIES) {
    check(
      `maturity: ${id}`,
      FUTURE_BET_MATURITY_DEFINITIONS.some((d) => d.id === id),
    );
  }

  const result = loadFutureBetsEngine();
  check("engine loads", result.schemaVersion === "P0-J");
  check(
    "integrity ok",
    result.integrity.ok,
    result.integrity.issues.join("; "),
  );
  check("entries empty", result.index.entries.length === 0);
  check("timeline empty", result.index.timeline.orderedEntryIds.length === 0);
  check(
    "future linkages unauthorized",
    result.index.futureLinkages.every((l) => l.implementationAuthorized === false),
  );
  check(
    "future linkage targets prepared",
    result.index.futureLinkages.some((l) => l.target === "competitive_intelligence") &&
      result.index.futureLinkages.some((l) => l.target === "valuation_intelligence") &&
      result.index.futureLinkages.some((l) => l.target === "weekly_reviews") &&
      result.index.futureLinkages.some((l) => l.target === "agent_read_interface") &&
      result.index.futureLinkages.some((l) => l.target === "automation"),
  );

  const incomplete = validateFutureBetCreate({
    id: "bet:incomplete",
    title: "Incomplete",
    category: "ai",
    maturity: "observation",
    strategicIdea: "x",
    opportunity: "y",
    problemAddressed: "z",
    whyKxdBelievesInIt: "a",
    expectedLongTermValue: "b",
    belief: "c",
    valueHypothesis: "d",
    evidenceIds: [],
    relatedProductDnaIds: [],
    relatedDecisionIds: [],
    relatedEvolutionIds: [],
    relatedHealthDomainIds: [],
    relatedInventoryIds: [],
    betConfidence: "long_term",
    reviewPolicy: "annual",
    recordedAt: "2026-08-02T00:00:00.000Z",
    ownerRole: "cpo",
    summary: "incomplete",
  });
  check("incomplete entry rejected", incomplete.ok === false);

  const validInput = {
    id: "bet:example-contract-only",
    title: "Example protected conviction",
    category: "ai" as const,
    maturity: "conviction" as const,
    strategicIdea: "Assistive AI inside rituals — never a chatbot homepage",
    opportunity: "Reduce founder cognitive load without changing product identity.",
    problemAddressed: "Operators need help without chatbot gravity.",
    whyKxdBelievesInIt:
      "AI should assist inside the experience, not become the destination.",
    expectedLongTermValue: "Calm authority with higher operating leverage.",
    belief: "AI assists. AI is not the homepage.",
    valueHypothesis: "Embedded assistance compounds trust better than chat destinations.",
    evidenceIds: ["ev:decision-ai-philosophy"],
    relatedProductDnaIds: ["dna:edition-1"],
    relatedDecisionIds: ["decision:ai-operating-philosophy"],
    relatedEvolutionIds: ["evolution:ai-philosophy"],
    relatedHealthDomainIds: ["ai_readiness" as const],
    relatedInventoryIds: ["inv:product-intelligence"],
    betConfidence: "long_term" as const,
    reviewPolicy: "Review quarterly or when AI surfaces are proposed as destinations.",
    recordedAt: "2026-08-02T00:00:00.000Z",
    ownerRole: "cpo" as const,
    summary: "Contract-only example — not Future Bet population.",
  };
  const valid = validateFutureBetCreate(validInput);
  check("valid create accepted", valid.ok, valid.issues.join("; "));

  const entry = createFutureBetObject(validInput);
  check("created type future_bet", entry.type === "future_bet");
  check("created remains unscheduled", entry.detail.scheduled === false);
  check(
    "created never auto-promotes",
    entry.detail.neverAutoPromotesToRoadmap === true,
  );
  check(
    "approved-for-build flag remains false",
    entry.detail.approved === false,
  );

  const directRoadmap = validateFutureBetPromotion({
    futureBetId: entry.id,
    target: "roadmap_item",
    evidenceIds: ["ev:1"],
    decisionId: "decision:x",
    reviewed: true,
    approved: true,
  });
  check("direct roadmap promotion rejected", directRoadmap.ok === false);

  const decisionPromotion = validateFutureBetPromotion({
    futureBetId: entry.id,
    target: "decision",
    evidenceIds: ["ev:1"],
    decisionId: "decision:x",
    reviewed: true,
    approved: true,
  });
  check(
    "decision promotion accepted with evidence+review+approval",
    decisionPromotion.ok,
  );

  const timeline = buildFutureBetsTimeline([
    {
      id: "bet:b",
      recordedAt: "2026-08-02T00:00:00.000Z",
      category: "workflow",
      maturity: "candidate",
    },
    {
      id: "bet:a",
      recordedAt: "2026-07-01T00:00:00.000Z",
      category: "ai",
      maturity: "observation",
    },
  ]);
  check(
    "timeline orders ascending",
    timeline.orderedEntryIds[0] === "bet:a" &&
      timeline.orderedEntryIds[1] === "bet:b",
  );

  const recheck = verifyFutureBetsEngineIntegrity(result.index);
  check("integrity re-check ok", recheck.ok);

  const attached = attachFutureBetsEngine(
    createProductIntelligenceIndex(),
    result,
  );
  check("attach stores futureBetsEngine", attached.futureBetsEngine !== null);
  check(
    "attach does not populate Future Bets",
    attached.stores.futureBets.length === 0,
  );
  check(
    "attach does not populate roadmap / Fame / Kill / Competitive / valuation",
    attached.stores.roadmapItems.length === 0 &&
      attached.stores.hallOfFame.length === 0 &&
      attached.stores.productKillList.length === 0 &&
      attached.stores.competitiveInsights.length === 0 &&
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
  check("PI doc records P0-J", /P0-J/.test(docs));
  check(
    "PI doc does not claim Future Bets populated",
    !/Future Bets populated|Future Bet entries populated/i.test(docs),
  );

  const currentState = readFileSync(
    path.join(root, "docs/KXD-OS-CURRENT-STATE.md"),
    "utf8",
  );
  check(
    "Current State mentions Future Bets / P0-J",
    /P0-J/i.test(currentState) && /Future Bet/i.test(currentState),
  );

  const roadmap = readFileSync(path.join(root, "docs/KXD-OS-ROADMAP.md"), "utf8");
  check("Roadmap mentions P0-J", /P0-J/i.test(roadmap));

  console.log("\nModel counts:");
  console.log(`  categories: ${FUTURE_BET_CATEGORIES.length}`);
  console.log(`  maturities: ${FUTURE_BET_MATURITIES.length}`);
  console.log(`  future linkages: ${result.index.futureLinkages.length}`);
  console.log("\nAll P0-J Future Bets Engine checks passed.\n");
}

main();
