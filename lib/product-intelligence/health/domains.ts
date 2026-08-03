/**
 * Platform Health domain registry (P0-E).
 * Every domain exists to help answer PLATFORM_HEALTH_QUESTION.
 */

import type { HealthDomainDefinition, HealthDomainId } from "./types";
import { HEALTH_DOMAIN_IDS } from "./types";

function src(
  id: string,
  kind: HealthDomainDefinition["evidenceSources"][number]["kind"],
  description: string,
): HealthDomainDefinition["evidenceSources"][number] {
  return { id, kind, description };
}

export const HEALTH_DOMAIN_DEFINITIONS: HealthDomainDefinition[] = [
  /* ---------------------------- Product Health ---------------------------- */
  {
    id: "vision_alignment",
    category: "product",
    title: "Vision Alignment",
    purpose:
      "Measures whether shipped surfaces still serve the Edition 1 north star instead of drifting into feature sprawl.",
    evidenceSources: [
      src("vision-dna", "product_dna", "Product DNA principles"),
      src("vision-decisions", "decision_archive", "Vision-affecting Decisions"),
      src("vision-inventory", "inventory", "Inventory status of home and demoted surfaces"),
    ],
    movementRules: [
      "Move only when Decisions, DNA, or inventory status changes prove alignment shift",
      "Feature count alone must never raise this score",
    ],
    ownerRole: "cpo",
    reviewCadence: "quarterly",
    cadenceRationale: "Vision drift is slow; weekly noise would fake movement.",
    relatedScoreKind: "product_strength",
    categoryWeight: 18,
  },
  {
    id: "product_cohesion",
    category: "product",
    title: "Product Cohesion",
    purpose:
      "Measures whether products share one operating grammar (Today home, modules own depth, Shared Core) without parallel homes.",
    evidenceSources: [
      src("cohesion-decisions", "decision_archive", "Home and HQ Decisions"),
      src("cohesion-inventory", "inventory", "Ownership map and orphan checks"),
      src("cohesion-doctrine", "doctrine", "Product and architecture laws"),
    ],
    movementRules: [
      "Improve when orphan surfaces are absorbed or ownership clarified with evidence",
      "Decline when a new home competitor or duplicate capability appears without Decision",
    ],
    ownerRole: "cpo",
    reviewCadence: "monthly",
    cadenceRationale: "Cohesion shifts with batch identity work; monthly is enough.",
    relatedScoreKind: "product_strength",
    categoryWeight: 18,
  },
  {
    id: "founder_experience",
    category: "product",
    title: "Founder Experience",
    purpose:
      "Measures whether the founder gains confidence within thirty seconds of opening Today.",
    evidenceSources: [
      src("founder-today", "decision_archive", "Today sole-home Decision"),
      src("founder-ux", "ux_observation", "Today experience / cognitive-load observations"),
      src("founder-dna", "product_dna", "Confidence-before-information principles"),
    ],
    movementRules: [
      "Move after Today/experience batches with verifier + UX evidence",
      "Never raise for denser information without confidence evidence",
    ],
    ownerRole: "cpo",
    reviewCadence: "after_feature_batch",
    cadenceRationale: "Founder experience moves with authorized Today/ritual batches.",
    relatedScoreKind: "ux",
    categoryWeight: 20,
  },
  {
    id: "client_experience",
    category: "product",
    title: "Client Experience",
    purpose:
      "Measures whether client-facing surfaces (Portal, CES, Website Review) feel trusted and calm.",
    evidenceSources: [
      src("client-inventory", "inventory", "Portal and CES surfaces"),
      src("client-decisions", "decision_archive", "Client HQ / portal Decisions"),
      src("client-ux", "ux_observation", "Client workflow observations"),
    ],
    movementRules: [
      "Move on portal/CES/review evidence and Decision outcomes",
      "Do not equate more portal modules with better experience",
    ],
    ownerRole: "cdo",
    reviewCadence: "monthly",
    cadenceRationale: "Client experience compounds monthly with launch and CES work.",
    relatedScoreKind: "ux",
    categoryWeight: 16,
  },
  {
    id: "ux_consistency",
    category: "product",
    title: "UX Consistency",
    purpose:
      "Measures whether KHIG / Constitution craft is applied consistently across operator and client surfaces.",
    evidenceSources: [
      src("ux-dna", "product_dna", "Craft standards"),
      src("ux-doctrine", "doctrine", "UX laws"),
      src("ux-obs", "ux_observation", "Surface craft observations"),
    ],
    movementRules: [
      "Move when design-system or Constitution compliance evidence changes",
      "Dashboard sprawl without Decision lowers score",
    ],
    ownerRole: "cdo",
    reviewCadence: "monthly",
    cadenceRationale: "Consistency is a craft trend, not a daily metric.",
    relatedScoreKind: "ux",
    categoryWeight: 14,
  },
  {
    id: "product_clarity",
    category: "product",
    title: "Product Clarity",
    purpose:
      "Measures whether product identity, ownership, and jobs-to-be-done are unambiguous.",
    evidenceSources: [
      src("clarity-inventory", "inventory", "Product purpose registry"),
      src("clarity-decisions", "decision_archive", "Identity Decisions"),
      src("clarity-roadmap", "roadmap", "Authorized vs demoted surfaces"),
    ],
    movementRules: [
      "Improve when purposes and owners are explicit and verified",
      "Decline when naming conflicts or dual homes reappear",
    ],
    ownerRole: "cpo",
    reviewCadence: "monthly",
    cadenceRationale: "Clarity follows identity batches; weekly would overfit.",
    relatedScoreKind: "product_strength",
    categoryWeight: 14,
  },

  /* --------------------------- Technical Health --------------------------- */
  {
    id: "architecture",
    category: "technical",
    title: "Architecture",
    purpose:
      "Measures layer integrity and additive architecture without parallel systems.",
    evidenceSources: [
      src("arch-doctrine", "doctrine", "Architecture laws"),
      src("arch-decisions", "decision_archive", "Shared Core and boundary Decisions"),
      src("arch-inventory", "inventory", "System map and prohibited parallels"),
    ],
    movementRules: [
      "Move on architecture review evidence or Decision outcomes",
      "New parallel intelligence/data planes lower score",
    ],
    ownerRole: "cto",
    reviewCadence: "quarterly",
    cadenceRationale: "Architecture health is structural; quarterly unless a boundary incident.",
    relatedScoreKind: "architecture",
    categoryWeight: 20,
  },
  {
    id: "shared_core_integrity",
    category: "technical",
    title: "Shared Core Integrity",
    purpose:
      "Measures whether Shared Core remains the single source of truth and shared loaders stay canonical.",
    evidenceSources: [
      src("core-decision", "decision_archive", "Shared Core Decision"),
      src("core-inventory", "inventory", "Shared Core inventory objects"),
      src("core-deps", "dependency_health", "Shared Core dependency usage"),
    ],
    movementRules: [
      "Decline if a second data plane or loader fork is introduced",
      "Improve when loaders are reused and verified",
    ],
    ownerRole: "cto",
    reviewCadence: "after_feature_batch",
    cadenceRationale: "Integrity is threatened per batch; check at batch gates.",
    relatedScoreKind: "architecture",
    categoryWeight: 20,
  },
  {
    id: "technical_debt",
    category: "technical",
    title: "Technical Debt",
    purpose:
      "Measures cost-of-delay drag on velocity (higher score = healthier / lower debt burden).",
    evidenceSources: [
      src("debt-objects", "technical_debt", "Technical debt objects"),
      src("debt-roadmap", "roadmap", "Debt-promoted roadmap items"),
      src("debt-verifiers", "verifier", "Failing or missing verification gates"),
    ],
    movementRules: [
      "Move only with debt object evidence and cost-of-delay changes",
      "Commit volume is not evidence of debt reduction",
    ],
    ownerRole: "cto",
    reviewCadence: "monthly",
    cadenceRationale: "Debt ranking is a monthly hygiene rhythm.",
    relatedScoreKind: "technical_debt_health",
    categoryWeight: 16,
  },
  {
    id: "dependency_health",
    category: "technical",
    title: "Dependency Health",
    purpose:
      "Measures blast radius, circular dependencies, and Shared Core coupling quality.",
    evidenceSources: [
      src("dep-inventory", "dependency_health", "P0-C dependency health report"),
      src("dep-inventory-map", "inventory", "Module and integration dependencies"),
    ],
    movementRules: [
      "Move when dependency graph or circular-dependency evidence changes",
      "Do not move on opinion about “feels coupled”",
    ],
    ownerRole: "cto",
    reviewCadence: "monthly",
    cadenceRationale: "Dependency graph changes with modules; monthly scan is enough.",
    relatedScoreKind: "architecture",
    categoryWeight: 14,
  },
  {
    id: "verification_coverage",
    category: "technical",
    title: "Verification Coverage",
    purpose:
      "Measures whether critical products have verifiers tied to routes and owners.",
    evidenceSources: [
      src("ver-registry", "verifier", "Verification registry from inventory"),
      src("ver-inventory", "inventory", "Verifier-to-product links"),
    ],
    movementRules: [
      "Improve when new gates cover owned products with evidence",
      "Decline when critical paths ship without verifier linkage",
    ],
    ownerRole: "cto",
    reviewCadence: "after_feature_batch",
    cadenceRationale: "Coverage moves with batch verifiers.",
    relatedScoreKind: null,
    categoryWeight: 16,
  },
  {
    id: "maintainability",
    category: "technical",
    title: "Maintainability",
    purpose:
      "Measures whether the platform remains understandable and additive for future builders.",
    evidenceSources: [
      src("maint-dna", "product_dna", "Invisible complexity / one truth"),
      src("maint-pi", "decision_archive", "Product Intelligence Decision"),
      src("maint-inventory", "inventory", "System map completeness"),
    ],
    movementRules: [
      "Improve when Product Intelligence and inventory reduce rediscovery cost",
      "Decline when orphan systems or undocumented forks appear",
    ],
    ownerRole: "cto",
    reviewCadence: "quarterly",
    cadenceRationale: "Maintainability is a long arc; quarterly review.",
    relatedScoreKind: "architecture",
    categoryWeight: 14,
  },

  /* ---------------------------- Business Health --------------------------- */
  {
    id: "commercial_readiness",
    category: "business",
    title: "Commercial Readiness",
    purpose:
      "Measures whether commercial rails (agreements, invoices, entitlements) are safe to operate — not financial KPIs.",
    evidenceSources: [
      src("comm-inventory", "inventory", "Commercial product surfaces"),
      src("comm-verifiers", "verifier", "Commercial/Stripe readiness verifiers"),
      src("comm-decisions", "decision_archive", "Commercial visibility Decisions"),
    ],
    movementRules: [
      "Move on readiness evidence only — never invent revenue metrics",
      "TEST-mode limits are facts, not failure theater",
    ],
    ownerRole: "strategy",
    reviewCadence: "monthly",
    cadenceRationale: "Commercial readiness changes with billing/commercial batches.",
    relatedScoreKind: "commercial_readiness",
    categoryWeight: 20,
  },
  {
    id: "operational_readiness",
    category: "business",
    title: "Operational Readiness",
    purpose:
      "Measures whether operators can run day-to-day studio work through Work, Today, and Client Command.",
    evidenceSources: [
      src("ops-inventory", "inventory", "Work / Today / Client Command inventory"),
      src("ops-decisions", "decision_archive", "Founder home and HQ Decisions"),
    ],
    movementRules: [
      "Move when operational workflows gain verified clarity",
      "More admin pages alone do not raise score",
    ],
    ownerRole: "coo",
    reviewCadence: "monthly",
    cadenceRationale: "Ops readiness tracks monthly operating rhythm.",
    relatedScoreKind: "product_strength",
    categoryWeight: 18,
  },
  {
    id: "enterprise_readiness",
    category: "business",
    title: "Enterprise Readiness",
    purpose:
      "Measures multi-client, identity, and trust readiness for serious client operations.",
    evidenceSources: [
      src("ent-inventory", "inventory", "Portal identity and multi-client surfaces"),
      src("ent-verifiers", "verifier", "Portal identity / Phase 4 verifiers"),
    ],
    movementRules: [
      "Move on identity/security/multi-client evidence",
      "Do not score marketing claims as readiness",
    ],
    ownerRole: "cto",
    reviewCadence: "quarterly",
    cadenceRationale: "Enterprise posture is quarterly unless a security gate fires.",
    relatedScoreKind: "commercial_readiness",
    categoryWeight: 16,
  },
  {
    id: "ai_readiness",
    category: "business",
    title: "AI Readiness",
    purpose:
      "Measures whether AI assists inside workflows with evidence — not chatbot-home maturity.",
    evidenceSources: [
      src("ai-decision", "decision_archive", "AI operating philosophy Decision"),
      src("ai-dna", "product_dna", "Not-a-chatbot non-negotiables"),
      src("ai-inventory", "inventory", "AI capability inventory"),
    ],
    movementRules: [
      "Improve when assisted workflows ship with evidence and commit paths",
      "Decline if AI becomes homepage or open chat without Decision",
    ],
    ownerRole: "cpo",
    reviewCadence: "quarterly",
    cadenceRationale: "AI posture is strategic; quarterly unless doctrine risk appears.",
    relatedScoreKind: null,
    categoryWeight: 14,
  },
  {
    id: "scalability",
    category: "business",
    title: "Scalability",
    purpose:
      "Measures whether client launch and platform patterns repeat without heroics.",
    evidenceSources: [
      src("scale-inventory", "inventory", "Client launch and multi-client capabilities"),
      src("scale-verifiers", "verifier", "Client launch readiness verifiers"),
    ],
    movementRules: [
      "Move on repeatable launch/ops evidence",
      "One heroic client success does not raise score alone",
    ],
    ownerRole: "cto",
    reviewCadence: "quarterly",
    cadenceRationale: "Scalability is proven over quarters of repeatable launches.",
    relatedScoreKind: "scalability",
    categoryWeight: 16,
  },
  {
    id: "team_readiness",
    category: "business",
    title: "Team Readiness",
    purpose:
      "Measures whether staff/operators can continue building and running KXD OS without founder memory.",
    evidenceSources: [
      src("team-pi", "decision_archive", "Product Intelligence Decision"),
      src("team-archive", "decision_archive", "Decision Archive completeness"),
      src("team-inventory", "inventory", "System map loadability"),
    ],
    movementRules: [
      "Improve when Product Intelligence packs reduce rediscovery",
      "Decline when critical knowledge remains chat-only",
    ],
    ownerRole: "coo",
    reviewCadence: "quarterly",
    cadenceRationale: "Team readiness tracks institutional memory maturity.",
    relatedScoreKind: null,
    categoryWeight: 16,
  },

  /* --------------------------- Strategic Health --------------------------- */
  {
    id: "product_differentiation",
    category: "strategic",
    title: "Product Differentiation",
    purpose:
      "Measures whether KXD OS remains a business OS thesis — not CRM/PM feature parity.",
    evidenceSources: [
      src("diff-dna", "product_dna", "Core beliefs and non-negotiables"),
      src("diff-decisions", "decision_archive", "Philosophy and home Decisions"),
    ],
    movementRules: [
      "Move on thesis-protecting Decisions and DNA compliance evidence",
      "Competitor feature matching without Decision lowers score",
    ],
    ownerRole: "strategy",
    reviewCadence: "quarterly",
    cadenceRationale: "Differentiation is strategic; quarterly deep review.",
    relatedScoreKind: "competitive_position",
    categoryWeight: 20,
  },
  {
    id: "competitive_position",
    category: "strategic",
    title: "Competitive Position",
    purpose:
      "Measures relative advantage in chosen arenas via understanding — not feature bingo.",
    evidenceSources: [
      src("comp-insight", "evidence_registry", "Competitive review evidence (when present)"),
      src("comp-decisions", "decision_archive", "Roadmap implications from Decisions"),
    ],
    movementRules: [
      "Move only with competitive review evidence IDs",
      "No movement from rumor or chat",
    ],
    ownerRole: "strategy",
    reviewCadence: "monthly",
    cadenceRationale: "Light monthly scan; deep brief quarterly via evidence packs.",
    relatedScoreKind: "competitive_position",
    categoryWeight: 20,
  },
  {
    id: "product_moat",
    category: "strategic",
    title: "Product Moat",
    purpose:
      "Measures accumulated context, Shared Core depth, and hard-to-copy operating rhythm.",
    evidenceSources: [
      src("moat-core", "decision_archive", "Shared Core Decision"),
      src("moat-inventory", "inventory", "Depth of Shared Core / CES / intelligence stack"),
      src("moat-dna", "product_dna", "Identity that resists generic tooling"),
    ],
    movementRules: [
      "Improve when accumulated context and unique rails deepen with evidence",
      "Decline when replaceability with generic CRM/PM increases",
    ],
    ownerRole: "strategy",
    reviewCadence: "quarterly",
    cadenceRationale: "Moat compounds slowly; quarterly measurement.",
    relatedScoreKind: "product_strength",
    categoryWeight: 20,
  },
  {
    id: "innovation_velocity",
    category: "strategic",
    title: "Innovation Velocity",
    purpose:
      "Measures whether authorized batches compound leverage — absorption and completions, not thrash.",
    evidenceSources: [
      src("vel-roadmap", "roadmap", "Authorized and shipped batches"),
      src("vel-releases", "release", "Release ledger deltas"),
      src("vel-decisions", "decision_archive", "Decision outcomes"),
    ],
    movementRules: [
      "Move on shipped authorized work with Decision evidence",
      "Raw commit count is forbidden as evidence",
    ],
    ownerRole: "cpo",
    reviewCadence: "monthly",
    cadenceRationale: "Velocity is a monthly compounding read, not weekly vanity.",
    relatedScoreKind: "momentum",
    categoryWeight: 20,
  },
  {
    id: "founder_confidence",
    category: "strategic",
    title: "Founder Confidence",
    purpose:
      "Measures whether the founder would trust KXD OS for 30 days unattended — clarity, calm, control.",
    evidenceSources: [
      src("fc-today", "decision_archive", "Today home Decision"),
      src("fc-obs", "founder_observation", "Founder confidence observations"),
      src("fc-dna", "product_dna", "Confidence-before-information"),
    ],
    movementRules: [
      "Move with founder observation + product evidence",
      "Never raise because a dashboard shows more widgets",
    ],
    ownerRole: "founder",
    reviewCadence: "weekly",
    cadenceRationale:
      "Founder confidence is the weekly operating pulse — still evidence-bound, never vibes-only.",
    relatedScoreKind: "founder_confidence",
    categoryWeight: 20,
  },

  /* ---------------------------- Platform overall -------------------------- */
  {
    id: "platform_health",
    category: "platform",
    title: "Overall Platform Health",
    purpose:
      "Weighted composite answering whether KXD OS is becoming a better company to own, product to build, and platform for clients.",
    evidenceSources: [
      src("ph-product", "inventory", "Product health domain observations"),
      src("ph-technical", "inventory", "Technical health domain observations"),
      src("ph-business", "inventory", "Business health domain observations"),
      src("ph-strategic", "inventory", "Strategic health domain observations"),
      src("ph-movements", "evidence_registry", "Movement log evidence packs"),
    ],
    movementRules: [
      "May move only when category composite inputs move with explanations",
      "Never a flat average of all domains",
      "If explanation cannot be generated, overall must not change",
    ],
    ownerRole: "cpo",
    reviewCadence: "monthly",
    cadenceRationale: "Overall health is a monthly judgment instrument, not a daily ticker.",
    relatedScoreKind: "overall_platform_health",
    categoryWeight: 100,
  },
];

export function getHealthDomain(
  id: HealthDomainId,
): HealthDomainDefinition | undefined {
  return HEALTH_DOMAIN_DEFINITIONS.find((domain) => domain.id === id);
}

export function listHealthDomainsByCategory(
  category: HealthDomainDefinition["category"],
): HealthDomainDefinition[] {
  return HEALTH_DOMAIN_DEFINITIONS.filter((domain) => domain.category === category);
}

export function listOrphanHealthDomainIds(): HealthDomainId[] {
  const defined = new Set(HEALTH_DOMAIN_DEFINITIONS.map((d) => d.id));
  return HEALTH_DOMAIN_IDS.filter((id) => !defined.has(id));
}
