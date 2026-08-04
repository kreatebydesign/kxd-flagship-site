/**
 * KXD Product Intelligence — Phase 0 Batch H
 * Hall of Fame Engine (contracts only).
 *
 * Run: npm run verify:product-intelligence-p0h
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  attachHallOfFameEngine,
  buildHallOfFameTimeline,
  createHallOfFameObject,
  createProductIntelligenceIndex,
  HALL_OF_FAME_CATEGORIES,
  HALL_OF_FAME_CATEGORY_DEFINITIONS,
  HALL_OF_FAME_LAW,
  HALL_OF_FAME_QUALIFICATION_CLASSES,
  HALL_OF_FAME_QUALIFICATION_DEFINITIONS,
  HALL_OF_FAME_QUESTION,
  loadHallOfFameEngine,
  PRODUCT_INTELLIGENCE_HALL_OF_FAME_VERSION,
  validateHallOfFameCreate,
  verifyHallOfFameEngineIntegrity,
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
  console.log("\nKXD Product Intelligence — P0-H Hall of Fame Engine\n");

  check(
    "hall of fame version is P0-H",
    PRODUCT_INTELLIGENCE_HALL_OF_FAME_VERSION === "P0-H",
  );

  const requiredFiles = [
    "lib/product-intelligence/hall-of-fame/engine.ts",
    "lib/product-intelligence/hall-of-fame/registry.ts",
    "lib/product-intelligence/hall-of-fame/rules.ts",
    "lib/product-intelligence/hall-of-fame/types.ts",
    "lib/product-intelligence/hall-of-fame/integrity.ts",
    "lib/product-intelligence/hall-of-fame/index.ts",
    "docs/KXD-PRODUCT-INTELLIGENCE.md",
  ];
  for (const rel of requiredFiles) {
    check(`file exists: ${rel}`, existsSync(path.join(root, rel)));
  }

  check(
    "permanent Hall of Fame question present",
    HALL_OF_FAME_QUESTION ===
      "What moments made KXD OS become the company it is?",
  );
  check(
    "Hall of Fame law states entries are earned",
    HALL_OF_FAME_LAW.some((l) => /earned/i.test(l)),
  );

  check("categories = 10", HALL_OF_FAME_CATEGORIES.length === 10);
  check(
    "category definitions match",
    HALL_OF_FAME_CATEGORY_DEFINITIONS.length === HALL_OF_FAME_CATEGORIES.length,
  );
  check(
    "qualification classes = 5",
    HALL_OF_FAME_QUALIFICATION_CLASSES.length === 5,
  );
  check(
    "qualification definitions match",
    HALL_OF_FAME_QUALIFICATION_DEFINITIONS.length ===
      HALL_OF_FAME_QUALIFICATION_CLASSES.length,
  );

  for (const id of HALL_OF_FAME_CATEGORIES) {
    check(
      `category: ${id}`,
      HALL_OF_FAME_CATEGORY_DEFINITIONS.some((d) => d.id === id),
    );
  }
  for (const id of HALL_OF_FAME_QUALIFICATION_CLASSES) {
    check(
      `qualification: ${id}`,
      HALL_OF_FAME_QUALIFICATION_DEFINITIONS.some((d) => d.id === id),
    );
  }

  const result = loadHallOfFameEngine();
  check("engine loads", result.schemaVersion === "P0-H");
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
    result.index.futureLinkages.some((l) => l.target === "weekly_reviews") &&
      result.index.futureLinkages.some((l) => l.target === "valuation_intelligence") &&
      result.index.futureLinkages.some((l) => l.target === "competitive_intelligence") &&
      result.index.futureLinkages.some((l) => l.target === "future_bets"),
  );

  const incomplete = validateHallOfFameCreate({
    id: "fame:incomplete",
    title: "Incomplete",
    category: "product",
    qualificationClass: "new_product_law",
    milestone: "x",
    whyItMattered: "y",
    whatChanged: "z",
    longTermImpact: "a",
    lessonsLearned: "b",
    whatItTeaches: "c",
    milestoneDate: "2026-08-02T00:00:00.000Z",
    evidenceIds: [],
    relatedDecisionIds: [],
    relatedEvolutionIds: [],
    relatedReleaseIds: [],
    relatedProductDnaIds: [],
    relatedInventoryIds: [],
    relatedHealthDomainIds: [],
    whatFutureBuildersShouldRemember: "d",
    whatShouldNeverBeForgotten: "e",
    whyThisChangedKxdForever: "f",
    fameConfidence: "permanent",
    reviewPolicy: "annual",
    ownerRole: "cpo",
    summary: "incomplete",
  });
  check("incomplete entry rejected", incomplete.ok === false);

  const validInput = {
    id: "fame:example-contract-only",
    title: "Example defining moment",
    category: "founder_experience" as const,
    qualificationClass: "founder_workflow_breakthrough" as const,
    milestone: "Today became the sole founder home",
    whyItMattered: "Ended competing home identities.",
    whatChanged: "Login and operations land in Today only.",
    longTermImpact: "Founder mornings begin with one clear home.",
    lessonsLearned: "Home identity is product law, not navigation preference.",
    whatItTeaches: "Absorption beats parallel aggregators.",
    milestoneDate: "2026-08-02T00:00:00.000Z",
    evidenceIds: ["ev:phase7-today"],
    relatedDecisionIds: ["decision:founder-home-today"],
    relatedEvolutionIds: ["evolution:today-sole-home"],
    relatedReleaseIds: [],
    relatedProductDnaIds: ["dna:edition-1"],
    relatedInventoryIds: ["inv:admin-today"],
    relatedHealthDomainIds: ["founder_experience" as const],
    whatFutureBuildersShouldRemember:
      "There is never a second founder home in KXD OS.",
    whatShouldNeverBeForgotten:
      "Competing home semantics recreate morning hesitation.",
    whyThisChangedKxdForever:
      "Operating rhythm became calm because attention has one owner.",
    fameConfidence: "permanent" as const,
    reviewPolicy: "Review annually or when home semantics are challenged.",
    ownerRole: "cpo" as const,
    summary: "Contract-only example — not ledger population.",
  };
  const valid = validateHallOfFameCreate(validInput);
  check("valid create accepted", valid.ok, valid.issues.join("; "));

  const entry = createHallOfFameObject(validInput);
  check("created type hall_of_fame", entry.type === "hall_of_fame");
  check("created has evidence", entry.evidenceIds.length > 0);
  check(
    "created has evolution link",
    entry.detail.relatedEvolutionIds.length > 0,
  );
  check(
    "created has legacy triad",
    Boolean(entry.detail.whatFutureBuildersShouldRemember) &&
      Boolean(entry.detail.whatShouldNeverBeForgotten) &&
      Boolean(entry.detail.whyThisChangedKxdForever),
  );

  const timeline = buildHallOfFameTimeline([
    {
      id: "fame:b",
      milestoneDate: "2026-08-02T00:00:00.000Z",
      category: "ux",
      qualificationClass: "permanent_ux_transformation",
    },
    {
      id: "fame:a",
      milestoneDate: "2026-07-01T00:00:00.000Z",
      category: "architecture",
      qualificationClass: "major_architectural_evolution",
    },
  ]);
  check(
    "timeline orders ascending",
    timeline.orderedEntryIds[0] === "fame:a" &&
      timeline.orderedEntryIds[1] === "fame:b",
  );
  check("timeline lookup present", timeline.lookupById["fame:a"] === 0);

  const recheck = verifyHallOfFameEngineIntegrity(result.index);
  check("integrity re-check ok", recheck.ok);

  const attached = attachHallOfFameEngine(
    createProductIntelligenceIndex(),
    result,
  );
  check("attach stores hallOfFameEngine", attached.hallOfFameEngine !== null);
  check(
    "attach does not populate Hall of Fame entries",
    attached.stores.hallOfFame.length === 0,
  );
  check(
    "attach does not populate Kill List / Future Bets / valuation / competitive",
    attached.stores.productKillList.length === 0 &&
      attached.stores.futureBets.length === 0 &&
      attached.stores.valuations.length === 0 &&
      attached.stores.competitiveInsights.length === 0,
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
  check("PI doc records P0-H", /P0-H/.test(docs));
  check(
    "PI doc does not claim Hall of Fame populated",
    !/Hall of Fame populated|Hall of Fame entries populated/i.test(docs),
  );

  const currentState = readFileSync(
    path.join(root, "docs/KXD-OS-CURRENT-STATE.md"),
    "utf8",
  );
  check(
    "Current State mentions Hall of Fame / P0-H",
    /P0-H/i.test(currentState) && /Hall of Fame/i.test(currentState),
  );

  const roadmap = readFileSync(path.join(root, "docs/KXD-OS-ROADMAP.md"), "utf8");
  check("Roadmap mentions P0-H", /P0-H/i.test(roadmap));

  console.log("\nModel counts:");
  console.log(`  categories: ${HALL_OF_FAME_CATEGORIES.length}`);
  console.log(
    `  qualification classes: ${HALL_OF_FAME_QUALIFICATION_CLASSES.length}`,
  );
  console.log(`  future linkages: ${result.index.futureLinkages.length}`);
  console.log("\nAll P0-H Hall of Fame Engine checks passed.\n");
}

main();
