/**
 * KXD Product Intelligence — Phase 0 Batch I
 * Product Kill List Engine (contracts only).
 *
 * Run: npm run verify:product-intelligence-p0i
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  attachProductKillListEngine,
  buildProductKillListTimeline,
  createProductIntelligenceIndex,
  createProductKillListObject,
  loadProductKillListEngine,
  PRODUCT_INTELLIGENCE_KILL_LIST_VERSION,
  PRODUCT_KILL_LIST_CATEGORIES,
  PRODUCT_KILL_LIST_CATEGORY_DEFINITIONS,
  PRODUCT_KILL_LIST_LAW,
  PRODUCT_KILL_LIST_QUALIFICATION_CLASSES,
  PRODUCT_KILL_LIST_QUALIFICATION_DEFINITIONS,
  PRODUCT_KILL_LIST_QUESTION,
  validateProductKillListCreate,
  verifyProductIntelligenceConsistency,
  verifyProductKillListEngineIntegrity,
} from "../lib/product-intelligence/index.ts";

const root = process.cwd();

function check(label: string, pass: boolean, detail?: string) {
  console.log(
    pass ? `  ✔ ${label}` : `  ✘ ${label}${detail ? ` — ${detail}` : ""}`,
  );
  assert.ok(pass, detail ? `${label}: ${detail}` : label);
}

function main() {
  console.log("\nKXD Product Intelligence — P0-I Product Kill List Engine\n");

  check(
    "kill list version is P0-I",
    PRODUCT_INTELLIGENCE_KILL_LIST_VERSION === "P0-I",
  );

  const requiredFiles = [
    "lib/product-intelligence/kill-list/engine.ts",
    "lib/product-intelligence/kill-list/registry.ts",
    "lib/product-intelligence/kill-list/rules.ts",
    "lib/product-intelligence/kill-list/types.ts",
    "lib/product-intelligence/kill-list/integrity.ts",
    "lib/product-intelligence/kill-list/index.ts",
    "docs/KXD-PRODUCT-INTELLIGENCE.md",
  ];
  for (const rel of requiredFiles) {
    check(`file exists: ${rel}`, existsSync(path.join(root, rel)));
  }

  check(
    "permanent Kill List question present",
    PRODUCT_KILL_LIST_QUESTION === "Why doesn't KXD OS do this?",
  );
  check(
    "Kill List law states intentional refusal",
    PRODUCT_KILL_LIST_LAW.some((l) => /refuse|refuses|intentionally/i.test(l)),
  );

  check("categories = 10", PRODUCT_KILL_LIST_CATEGORIES.length === 10);
  check(
    "category definitions match",
    PRODUCT_KILL_LIST_CATEGORY_DEFINITIONS.length ===
      PRODUCT_KILL_LIST_CATEGORIES.length,
  );
  check(
    "qualification classes = 5",
    PRODUCT_KILL_LIST_QUALIFICATION_CLASSES.length === 5,
  );
  check(
    "qualification definitions match",
    PRODUCT_KILL_LIST_QUALIFICATION_DEFINITIONS.length ===
      PRODUCT_KILL_LIST_QUALIFICATION_CLASSES.length,
  );

  for (const id of PRODUCT_KILL_LIST_CATEGORIES) {
    check(
      `category: ${id}`,
      PRODUCT_KILL_LIST_CATEGORY_DEFINITIONS.some((d) => d.id === id),
    );
  }
  for (const id of PRODUCT_KILL_LIST_QUALIFICATION_CLASSES) {
    check(
      `qualification: ${id}`,
      PRODUCT_KILL_LIST_QUALIFICATION_DEFINITIONS.some((d) => d.id === id),
    );
  }

  const result = loadProductKillListEngine();
  check("engine loads", result.schemaVersion === "P0-I");
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
    result.index.futureLinkages.some((l) => l.target === "future_bets") &&
      result.index.futureLinkages.some((l) => l.target === "competitive_intelligence") &&
      result.index.futureLinkages.some((l) => l.target === "valuation_intelligence") &&
      result.index.futureLinkages.some((l) => l.target === "weekly_reviews"),
  );

  const incomplete = validateProductKillListCreate({
    id: "kill:incomplete",
    title: "Incomplete",
    category: "product",
    qualificationClass: "identity_boundary",
    rejectedConcept: "x",
    problemAttemptedToSolve: "y",
    reasonRejected: "z",
    alternativesConsidered: [],
    chosenDirection: "a",
    tradeoffsAccepted: "b",
    longTermProductImpact: "c",
    decisionDate: "2026-08-02T00:00:00.000Z",
    evidenceIds: [],
    relatedDecisionIds: [],
    relatedProductDnaIds: [],
    relatedEvolutionIds: [],
    relatedInventoryIds: [],
    relatedHealthDomainIds: [],
    relatedFutureBetId: null,
    reconsiderAt: null,
    whatKxdProtects: "d",
    whatKxdRefusesToBecome: "e",
    whyRejectionStrengthensProduct: "f",
    killConfidence: "permanent",
    reviewPolicy: "annual",
    ownerRole: "cpo",
    summary: "incomplete",
  });
  check("incomplete entry rejected", incomplete.ok === false);

  const validInput = {
    id: "kill:example-contract-only",
    title: "Example intentional refusal",
    category: "workflow" as const,
    qualificationClass: "identity_boundary" as const,
    rejectedConcept: "Multiple founder dashboards",
    problemAttemptedToSolve: "Give founders more places to start the day.",
    reasonRejected:
      "Competing homes recreate morning hesitation and break Today product law.",
    alternativesConsidered: [
      "Keep Portfolio Overview as co-home",
      "Add a personalized landing chooser",
      "Make Today the sole home",
    ],
    chosenDirection: "Today is the sole founder home.",
    tradeoffsAccepted:
      "Depth modules remain destinations without home identity.",
    longTermProductImpact:
      "Operating rhythm stays calm because attention has one owner.",
    decisionDate: "2026-08-02T00:00:00.000Z",
    evidenceIds: ["ev:decision-founder-home-today"],
    relatedDecisionIds: ["decision:founder-home-today"],
    relatedProductDnaIds: ["dna:edition-1"],
    relatedEvolutionIds: ["evolution:today-sole-home"],
    relatedInventoryIds: ["inv:admin-today"],
    relatedHealthDomainIds: ["founder_experience" as const],
    relatedFutureBetId: null,
    reconsiderAt: null,
    whatKxdProtects: "A single founder home and calm morning attention.",
    whatKxdRefusesToBecome: "A dashboard product with competing start screens.",
    whyRejectionStrengthensProduct:
      "Identity remains clear; absorption beats parallel aggregators.",
    killConfidence: "permanent" as const,
    reviewPolicy: "Review only if Today home law is formally challenged.",
    ownerRole: "cpo" as const,
    summary: "Contract-only example — not Kill List population.",
  };
  const valid = validateProductKillListCreate(validInput);
  check("valid create accepted", valid.ok, valid.issues.join("; "));

  const entry = createProductKillListObject(validInput);
  check("created type product_kill_list", entry.type === "product_kill_list");
  check("created has evidence", entry.evidenceIds.length > 0);
  check(
    "created has boundary triad",
    Boolean(entry.detail.whatKxdProtects) &&
      Boolean(entry.detail.whatKxdRefusesToBecome) &&
      Boolean(entry.detail.whyRejectionStrengthensProduct),
  );

  const timeline = buildProductKillListTimeline([
    {
      id: "kill:b",
      decisionDate: "2026-08-02T00:00:00.000Z",
      category: "ai",
      qualificationClass: "philosophy_conflict",
    },
    {
      id: "kill:a",
      decisionDate: "2026-07-01T00:00:00.000Z",
      category: "architecture",
      qualificationClass: "architecture_parallel",
    },
  ]);
  check(
    "timeline orders ascending",
    timeline.orderedEntryIds[0] === "kill:a" &&
      timeline.orderedEntryIds[1] === "kill:b",
  );
  check("timeline lookup present", timeline.lookupById["kill:a"] === 0);

  const recheck = verifyProductKillListEngineIntegrity(result.index);
  check("integrity re-check ok", recheck.ok);

  const attached = attachProductKillListEngine(
    createProductIntelligenceIndex(),
    result,
  );
  check(
    "attach stores productKillListEngine",
    attached.productKillListEngine !== null,
  );
  check(
    "attach does not populate Kill List entries",
    attached.stores.productKillList.length === 0,
  );
  check(
    "attach does not populate Future Bets / Competitive / valuation / Fame",
    attached.stores.futureBets.length === 0 &&
      attached.stores.competitiveInsights.length === 0 &&
      attached.stores.valuations.length === 0 &&
      attached.stores.hallOfFame.length === 0,
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
  check("PI doc records P0-I", /P0-I/.test(docs));
  check(
    "PI doc does not claim Kill List populated",
    !/Kill List populated|Product Kill List entries populated/i.test(docs),
  );

  const currentState = readFileSync(
    path.join(root, "docs/KXD-OS-CURRENT-STATE.md"),
    "utf8",
  );
  check(
    "Current State mentions Kill List / P0-I",
    /P0-I/i.test(currentState) && /Kill List/i.test(currentState),
  );

  const roadmap = readFileSync(path.join(root, "docs/KXD-OS-ROADMAP.md"), "utf8");
  check("Roadmap mentions P0-I", /P0-I/i.test(roadmap));

  console.log("\nModel counts:");
  console.log(`  categories: ${PRODUCT_KILL_LIST_CATEGORIES.length}`);
  console.log(
    `  qualification classes: ${PRODUCT_KILL_LIST_QUALIFICATION_CLASSES.length}`,
  );
  console.log(`  future linkages: ${result.index.futureLinkages.length}`);
  console.log("\nAll P0-I Product Kill List Engine checks passed.\n");
}

main();
