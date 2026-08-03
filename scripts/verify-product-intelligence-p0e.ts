/**
 * KXD Product Intelligence — Phase 0 Batch E
 * Platform Health Engine v1.
 *
 * Run: npm run verify:product-intelligence-p0e
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  attachPlatformHealthEngine,
  computeCategoryComposite,
  computeOverallPlatformHealth,
  createProductIntelligenceIndex,
  HEALTH_DOMAIN_DEFINITIONS,
  HEALTH_DOMAIN_IDS,
  loadPlatformHealthEngine,
  PLATFORM_HEALTH_QUESTION,
  PLATFORM_HEALTH_WEIGHTING,
  PRODUCT_INTELLIGENCE_HEALTH_VERSION,
  resolveHealthConfidence,
  validateHealthMovement,
  verifyPlatformHealthEngineIntegrity,
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
  console.log("\nKXD Product Intelligence — P0-E Platform Health Engine\n");

  check(
    "health version is P0-E",
    PRODUCT_INTELLIGENCE_HEALTH_VERSION === "P0-E",
  );

  const requiredFiles = [
    "lib/product-intelligence/health/engine.ts",
    "lib/product-intelligence/health/domains.ts",
    "lib/product-intelligence/health/weighting.ts",
    "lib/product-intelligence/health/movement.ts",
    "lib/product-intelligence/health/confidence.ts",
    "lib/product-intelligence/health/report.ts",
    "docs/KXD-PRODUCT-INTELLIGENCE.md",
  ];
  for (const rel of requiredFiles) {
    check(`file exists: ${rel}`, existsSync(path.join(root, rel)));
  }

  check(
    "permanent health question present",
    /better company to own/i.test(PLATFORM_HEALTH_QUESTION),
  );

  const productDomains = HEALTH_DOMAIN_DEFINITIONS.filter(
    (d) => d.category === "product",
  );
  const technicalDomains = HEALTH_DOMAIN_DEFINITIONS.filter(
    (d) => d.category === "technical",
  );
  const businessDomains = HEALTH_DOMAIN_DEFINITIONS.filter(
    (d) => d.category === "business",
  );
  const strategicDomains = HEALTH_DOMAIN_DEFINITIONS.filter(
    (d) => d.category === "strategic",
  );

  check("product health domains = 6", productDomains.length === 6);
  check("technical health domains = 6", technicalDomains.length === 6);
  check("business health domains = 6", businessDomains.length === 6);
  check("strategic health domains = 5", strategicDomains.length === 5);
  check(
    "platform_health domain present",
    HEALTH_DOMAIN_DEFINITIONS.some((d) => d.id === "platform_health"),
  );
  check(
    "no orphan domain ids",
    HEALTH_DOMAIN_IDS.every((id) =>
      HEALTH_DOMAIN_DEFINITIONS.some((d) => d.id === id),
    ),
  );

  for (const domain of HEALTH_DOMAIN_DEFINITIONS) {
    check(`purpose: ${domain.id}`, domain.purpose.length > 20);
    check(`evidence sources: ${domain.id}`, domain.evidenceSources.length > 0);
    check(`movement rules: ${domain.id}`, domain.movementRules.length > 0);
    check(`owner: ${domain.id}`, Boolean(domain.ownerRole));
    check(`cadence: ${domain.id}`, Boolean(domain.reviewCadence));
  }

  check(
    "category weights sum 100",
    PLATFORM_HEALTH_WEIGHTING.categoryWeights.product +
      PLATFORM_HEALTH_WEIGHTING.categoryWeights.technical +
      PLATFORM_HEALTH_WEIGHTING.categoryWeights.business +
      PLATFORM_HEALTH_WEIGHTING.categoryWeights.strategic ===
      100,
  );
  check(
    "overall is weighted composite (not flat average)",
    PLATFORM_HEALTH_WEIGHTING.overallIsWeightedComposite === true,
  );
  check(
    "feature/commit counts forbidden as evidence",
    PLATFORM_HEALTH_WEIGHTING.forbidsFeatureCountAsEvidence &&
      PLATFORM_HEALTH_WEIGHTING.forbidsCommitCountAsEvidence,
  );

  const result = loadPlatformHealthEngine();
  check("engine loads", result.schemaVersion === "P0-E");
  check(
    "integrity ok",
    result.integrity.ok,
    [
      ...result.integrity.orphanDomains,
      ...result.integrity.weightIssues,
      ...result.integrity.observationIssues,
    ].join("; "),
  );
  check(
    "all observations unobserved (no invented scores)",
    result.engine.observations.every(
      (o) => o.currentValue === null && o.direction === "unobserved",
    ),
  );
  check("movement log empty", result.engine.movementLog.length === 0);
  check(
    "report generation unauthorized",
    result.engine.reportContract.generationAuthorized === false,
  );
  check(
    "report contract has required sections",
    Boolean(result.engine.reportContract.sections.overallPlatformHealth) &&
      Boolean(result.engine.reportContract.sections.biggestRisk) &&
      Boolean(result.engine.reportContract.sections.recommendedFocus),
  );
  check(
    "relationship bindings for every domain",
    result.engine.relationshipBindings.length ===
      HEALTH_DOMAIN_DEFINITIONS.length,
  );
  check(
    "review cadence guide present",
    result.engine.reviewCadenceGuide.length >= 3,
  );

  // Movement law
  const rejected = validateHealthMovement({
    domainId: "founder_experience",
    previousValue: 50,
    currentValue: 60,
    reason: "",
    evidenceIds: [],
    evidenceKinds: [],
    decisionIds: [],
    releaseIds: [],
    timestamp: "2026-08-02T00:00:00.000Z",
  });
  check("movement without evidence/reason rejected", rejected.allowed === false);

  const accepted = validateHealthMovement({
    domainId: "founder_experience",
    previousValue: 50,
    currentValue: 62,
    reason: "Today sole-home Decision validated with Phase 7 verifier evidence.",
    evidenceIds: ["ev:1", "ev:2", "ev:3"],
    evidenceKinds: ["decision_archive", "verifier"],
    decisionIds: ["decision:founder-home-today"],
    releaseIds: [],
    timestamp: "2026-08-02T00:00:00.000Z",
  });
  check("movement with evidence + explanation allowed", accepted.allowed === true);
  check(
    "movement record includes previous/current/direction/evidence",
    Boolean(accepted.record) &&
      accepted.record!.previousValue === 50 &&
      accepted.record!.currentValue === 62 &&
      accepted.record!.evidenceIds.length === 3,
  );

  check(
    "confidence engine requires evidence",
    resolveHealthConfidence({
      evidenceIds: [],
      evidenceKinds: [],
      decisionIds: [],
    }) === null,
  );
  check(
    "high confidence available with strong evidence pack",
    resolveHealthConfidence({
      evidenceIds: ["a", "b", "c"],
      evidenceKinds: ["decision_archive", "verifier"],
      decisionIds: ["decision:x"],
    }) === "high",
  );

  // Weighting helpers (with sample observed values — not persisted)
  const productComposite = computeCategoryComposite("product", {
    vision_alignment: 70,
    product_cohesion: 72,
    founder_experience: 80,
    client_experience: 68,
    ux_consistency: 70,
    product_clarity: 74,
  });
  check("category composite computes", productComposite !== null);
  const overall = computeOverallPlatformHealth({
    product: productComposite,
    technical: 70,
    business: 65,
    strategic: 68,
  });
  check("overall platform health is weighted (not null)", overall !== null);
  check(
    "overall unobserved when all categories null",
    computeOverallPlatformHealth({
      product: null,
      technical: null,
      business: null,
      strategic: null,
    }) === null,
  );

  const recheck = verifyPlatformHealthEngineIntegrity(result.engine);
  check("integrity re-check ok", recheck.ok);

  const attached = attachPlatformHealthEngine(
    createProductIntelligenceIndex(),
    result,
  );
  check("attach stores platformHealth", attached.platformHealth !== null);
  check(
    "attach does not populate Hall of Fame / Kill List / Future Bets / valuation",
    attached.stores.hallOfFame.length === 0 &&
      attached.stores.productKillList.length === 0 &&
      attached.stores.futureBets.length === 0 &&
      attached.stores.valuations.length === 0 &&
      attached.stores.founderFriction.length === 0,
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
  check("PI doc records P0-E", /P0-E/.test(docs));
  check(
    "PI doc does not claim health report generated",
    !/health report generated|Platform Health Report populated/i.test(docs),
  );

  const currentState = readFileSync(
    path.join(root, "docs/KXD-OS-CURRENT-STATE.md"),
    "utf8",
  );
  check(
    "Current State mentions Platform Health / P0-E",
    /P0-E/i.test(currentState) && /Platform Health/i.test(currentState),
  );

  const roadmap = readFileSync(path.join(root, "docs/KXD-OS-ROADMAP.md"), "utf8");
  check("Roadmap mentions P0-E", /P0-E/i.test(roadmap));

  console.log("\nDomain counts:");
  console.log(`  product: ${productDomains.length}`);
  console.log(`  technical: ${technicalDomains.length}`);
  console.log(`  business: ${businessDomains.length}`);
  console.log(`  strategic: ${strategicDomains.length}`);
  console.log(`  total domains: ${HEALTH_DOMAIN_DEFINITIONS.length}`);
  console.log("\nAll P0-E Platform Health Engine checks passed.\n");
}

main();
