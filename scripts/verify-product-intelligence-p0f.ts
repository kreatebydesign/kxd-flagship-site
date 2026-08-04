/**
 * KXD Product Intelligence — Phase 0 Batch F
 * Founder Friction Intelligence Engine (contracts only).
 *
 * Run: npm run verify:product-intelligence-p0f
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  applyFrictionTransition,
  attachFounderFrictionEngine,
  createFounderFrictionObject,
  createProductIntelligenceIndex,
  FOUNDER_FRICTION_QUESTION,
  FRICTION_ALLOWED_TRANSITIONS,
  FRICTION_CATEGORIES,
  FRICTION_CATEGORY_DEFINITIONS,
  FRICTION_EVIDENCE_KINDS,
  FRICTION_FREQUENCIES,
  FRICTION_FREQUENCY_DEFINITIONS,
  FRICTION_LAW,
  FRICTION_LIFECYCLE_DEFINITIONS,
  FRICTION_LIFECYCLE_STATES,
  FRICTION_PROMOTION_PATH,
  FRICTION_SEVERITIES,
  FRICTION_SEVERITY_DEFINITIONS,
  loadFounderFrictionEngine,
  PRODUCT_INTELLIGENCE_FRICTION_VERSION,
  validateFrictionCreate,
  validateFrictionTransition,
  verifyFounderFrictionEngineIntegrity,
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
  console.log("\nKXD Product Intelligence — P0-F Founder Friction Engine\n");

  check(
    "friction version is P0-F",
    PRODUCT_INTELLIGENCE_FRICTION_VERSION === "P0-F",
  );

  const requiredFiles = [
    "lib/product-intelligence/friction/engine.ts",
    "lib/product-intelligence/friction/registry.ts",
    "lib/product-intelligence/friction/rules.ts",
    "lib/product-intelligence/friction/types.ts",
    "lib/product-intelligence/friction/integrity.ts",
    "lib/product-intelligence/friction/index.ts",
    "docs/KXD-PRODUCT-INTELLIGENCE.md",
  ];
  for (const rel of requiredFiles) {
    check(`file exists: ${rel}`, existsSync(path.join(root, rel)));
  }

  check(
    "permanent friction question present",
    FOUNDER_FRICTION_QUESTION === "What consistently slows us down?",
  );
  check("friction law present", FRICTION_LAW.length >= 8);

  check("categories = 15", FRICTION_CATEGORIES.length === 15);
  check(
    "category definitions match vocabulary",
    FRICTION_CATEGORY_DEFINITIONS.length === FRICTION_CATEGORIES.length,
  );
  check("severities = 4", FRICTION_SEVERITIES.length === 4);
  check(
    "severity definitions match",
    FRICTION_SEVERITY_DEFINITIONS.length === FRICTION_SEVERITIES.length,
  );
  check("frequencies = 5", FRICTION_FREQUENCIES.length === 5);
  check(
    "frequency definitions match",
    FRICTION_FREQUENCY_DEFINITIONS.length === FRICTION_FREQUENCIES.length,
  );
  check("lifecycle states = 8", FRICTION_LIFECYCLE_STATES.length === 8);
  check(
    "lifecycle definitions match",
    FRICTION_LIFECYCLE_DEFINITIONS.length === FRICTION_LIFECYCLE_STATES.length,
  );
  check("evidence kinds = 7", FRICTION_EVIDENCE_KINDS.length === 7);
  check("allowed transitions defined", FRICTION_ALLOWED_TRANSITIONS.length > 0);
  check(
    "promotion path is friction→evidence→decision→roadmap→improvement",
    FRICTION_PROMOTION_PATH.join("→") ===
      "founder_friction→evidence→decision→roadmap_item→product_improvement",
  );

  const requiredCategories = [
    "cognitive_load",
    "navigation",
    "workflow",
    "communication",
    "ai",
    "automation",
    "performance",
    "mobile",
    "client_experience",
    "founder_experience",
    "operational",
    "visual",
    "language",
    "commercial",
    "unknown",
  ];
  for (const id of requiredCategories) {
    check(
      `category: ${id}`,
      FRICTION_CATEGORIES.includes(id as (typeof FRICTION_CATEGORIES)[number]),
    );
  }

  const result = loadFounderFrictionEngine();
  check("engine loads", result.schemaVersion === "P0-F");
  check(
    "integrity ok",
    result.integrity.ok,
    result.integrity.issues.join("; "),
  );
  check("friction store empty", result.index.frictions.length === 0);
  check(
    "future linkages unauthorized",
    result.index.futureLinkages.every((l) => l.implementationAuthorized === false),
  );
  check(
    "future linkage targets prepared",
    result.index.futureLinkages.some((l) => l.target === "platform_health") &&
      result.index.futureLinkages.some((l) => l.target === "valuation_intelligence") &&
      result.index.futureLinkages.some((l) => l.target === "competitive_intelligence") &&
      result.index.futureLinkages.some((l) => l.target === "weekly_reviews"),
  );

  // Evidence rules
  const anonymous = validateFrictionCreate({
    id: "friction:anon",
    title: "Anonymous",
    observation: "hesitation",
    context: "today",
    category: "cognitive_load",
    severity: "moderate",
    frequency: "daily",
    effort: "medium",
    founderImpact: "re-checks",
    clientImpact: "none",
    businessImpact: "slow mornings",
    operationalImpact: "none",
    technicalImpact: "none",
    emotionalImpact: "irritation",
    recommendedDirection: "simplify",
    evidenceIds: [],
    frictionEvidenceKinds: [],
    relatedInventoryIds: ["inv:x"],
    relatedDecisionIds: [],
    relatedRoadmapIds: [],
    relatedHealthDomainIds: ["founder_experience"],
    relatedProductDnaIds: [],
    relatedTechnicalDebtIds: [],
    ownerRole: "founder",
    discoveredAt: "2026-08-02T00:00:00.000Z",
    summary: "anon test",
  });
  check("anonymous friction rejected", anonymous.ok === false);

  const validInput = {
    id: "friction:example-contract-only",
    title: "Example contract friction",
    observation: "Must re-interpret competing home labels each morning.",
    context: "Founder morning ritual / navigation identity",
    category: "navigation" as const,
    severity: "major" as const,
    frequency: "daily" as const,
    effort: "medium" as const,
    founderImpact: "Hesitation before first action",
    clientImpact: "None directly",
    businessImpact: "Slower operating start",
    operationalImpact: "Re-checking destinations",
    technicalImpact: "None",
    emotionalImpact: "Low-grade doubt",
    recommendedDirection: "absorb" as const,
    evidenceIds: ["ev:dogfood-1"],
    frictionEvidenceKinds: ["dogfood_session" as const],
    relatedInventoryIds: ["inv:admin-today"],
    relatedDecisionIds: ["decision:founder-home-today"],
    relatedRoadmapIds: [],
    relatedHealthDomainIds: ["founder_experience" as const],
    relatedProductDnaIds: ["dna:edition-1"],
    relatedTechnicalDebtIds: [],
    ownerRole: "founder" as const,
    discoveredAt: "2026-08-02T00:00:00.000Z",
    summary: "Competing home semantics create morning hesitation.",
  };
  const validCreate = validateFrictionCreate(validInput);
  check(
    "valid friction create accepted by rules",
    validCreate.ok,
    validCreate.issues.join("; "),
  );

  // Create + lifecycle (in-memory only — not persisted to index)
  const friction = createFounderFrictionObject(validInput);
  check("created friction starts observed", friction.detail.frictionStatus === "observed");
  check("created friction has evidence", friction.evidenceIds.length > 0);
  check("created friction has category", friction.detail.category === "navigation");

  const noReason = validateFrictionTransition({
    friction,
    to: "verified",
    reason: "",
    at: "2026-08-02T01:00:00.000Z",
    by: "founder",
  });
  check("transition without reason rejected", noReason.ok === false);

  const verified = applyFrictionTransition({
    friction,
    to: "verified",
    reason: "Confirmed across two dogfood mornings.",
    at: "2026-08-02T01:00:00.000Z",
    by: "founder",
  });
  check("observed → verified allowed", verified.detail.frictionStatus === "verified");
  check(
    "transition recorded with reason",
    verified.detail.lifecycleTransitions.length === 1 &&
      verified.detail.lifecycleTransitions[0]!.reason.length > 0,
  );

  const resolveWithoutLearning = validateFrictionTransition({
    friction: {
      ...verified,
      detail: { ...verified.detail, frictionStatus: "in_progress" },
    },
    to: "resolved",
    reason: "Fixed",
    at: "2026-08-02T02:00:00.000Z",
    by: "founder",
  });
  check(
    "resolved without learning rejected",
    resolveWithoutLearning.ok === false,
  );

  const planned = applyFrictionTransition({
    friction: verified,
    to: "planned",
    reason: "Linked to Decision founder-home-today absorb path.",
    at: "2026-08-02T01:30:00.000Z",
    by: "founder",
  });
  const inProgress = applyFrictionTransition({
    friction: planned,
    to: "in_progress",
    reason: "Authorized Batch E absorb work started.",
    at: "2026-08-02T02:00:00.000Z",
    by: "founder",
  });
  const resolved = applyFrictionTransition({
    friction: inProgress,
    to: "resolved",
    reason: "Absorb/retire complete; Today is sole home.",
    at: "2026-08-02T03:00:00.000Z",
    by: "founder",
    learning: {
      whatChanged: "Competing home labels retired from primary navigation.",
      whyItWorked: "One home identity removed morning reinterpretation.",
      whatProductIntelligenceLearned:
        "Navigation friction with daily frequency and major severity should promote to Decision before UI churn.",
    },
  });
  check("resolved records learning", resolved.detail.learning !== null);
  check("resolvedAt set", resolved.detail.resolvedAt !== null);

  const recheck = verifyFounderFrictionEngineIntegrity(result.index);
  check("integrity re-check ok", recheck.ok);

  const attached = attachFounderFrictionEngine(
    createProductIntelligenceIndex(),
    result,
  );
  check(
    "attach stores founderFrictionEngine",
    attached.founderFrictionEngine !== null,
  );
  check(
    "attach does not populate friction observations",
    attached.stores.founderFriction.length === 0,
  );
  check(
    "attach does not populate Hall of Fame / Kill List / Future Bets / valuation",
    attached.stores.hallOfFame.length === 0 &&
      attached.stores.productKillList.length === 0 &&
      attached.stores.futureBets.length === 0 &&
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
  check("PI doc records P0-F", /P0-F/.test(docs));
  check(
    "PI doc does not claim friction populated",
    !/friction observations populated|Founder Friction populated/i.test(docs),
  );

  const currentState = readFileSync(
    path.join(root, "docs/KXD-OS-CURRENT-STATE.md"),
    "utf8",
  );
  check(
    "Current State mentions Founder Friction / P0-F",
    /P0-F/i.test(currentState) && /Founder Friction/i.test(currentState),
  );

  const roadmap = readFileSync(path.join(root, "docs/KXD-OS-ROADMAP.md"), "utf8");
  check("Roadmap mentions P0-F", /P0-F/i.test(roadmap));

  console.log("\nModel counts:");
  console.log(`  categories: ${FRICTION_CATEGORIES.length}`);
  console.log(`  severities: ${FRICTION_SEVERITIES.length}`);
  console.log(`  frequencies: ${FRICTION_FREQUENCIES.length}`);
  console.log(`  lifecycle states: ${FRICTION_LIFECYCLE_STATES.length}`);
  console.log(`  evidence kinds: ${FRICTION_EVIDENCE_KINDS.length}`);
  console.log(`  allowed transitions: ${FRICTION_ALLOWED_TRANSITIONS.length}`);
  console.log("\nAll P0-F Founder Friction Engine checks passed.\n");
}

main();
