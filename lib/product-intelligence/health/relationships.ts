/**
 * Health relationships + review cadence guide (P0-E).
 */

import { HEALTH_DOMAIN_DEFINITIONS } from "./domains";
import type {
  HealthDomainId,
  HealthRelationshipBinding,
  HealthReviewCadence,
  PlatformHealthEngine,
} from "./types";

const BASE_BINDINGS: HealthRelationshipBinding["relatedObjectTypes"] = [
  "decision",
  "product_inventory",
  "evidence",
  "doctrine",
  "product_dna",
  "roadmap_item",
  "technical_debt",
  "release",
];

export function buildHealthRelationshipBindings(): HealthRelationshipBinding[] {
  return HEALTH_DOMAIN_DEFINITIONS.map((domain) => {
    const required: string[] = ["evidence", "decision"];
    if (domain.category === "technical") {
      required.push("technical_debt", "product_inventory");
    }
    if (domain.id === "platform_health") {
      required.push("product_inventory", "release");
    }
    if (domain.evidenceSources.some((s) => s.kind === "product_dna")) {
      required.push("product_dna");
    }
    if (domain.evidenceSources.some((s) => s.kind === "doctrine")) {
      required.push("doctrine");
    }
    return {
      domainId: domain.id,
      relatedObjectTypes: BASE_BINDINGS,
      requiredBindings: [...new Set(required)],
    };
  });
}

export function buildReviewCadenceGuide(): PlatformHealthEngine["reviewCadenceGuide"] {
  const byCadence = new Map<HealthReviewCadence, HealthDomainId[]>();
  for (const domain of HEALTH_DOMAIN_DEFINITIONS) {
    const list = byCadence.get(domain.reviewCadence) ?? [];
    list.push(domain.id);
    byCadence.set(domain.reviewCadence, list);
  }

  const rationales: Record<HealthReviewCadence, string> = {
    after_feature_batch:
      "Batch-gated domains move when authorized work ships with verifiers — not on calendar noise.",
    weekly:
      "Only founder-confidence-style pulses may move weekly, and still require evidence IDs.",
    monthly:
      "Most operating health domains review monthly — enough signal, low vanity churn.",
    quarterly:
      "Architecture, moat, scalability, and vision domains should not thrash weekly.",
    annual:
      "Reserved for exceptional long-arc domains; none required weekly or monthly.",
  };

  return (
    [
      "after_feature_batch",
      "weekly",
      "monthly",
      "quarterly",
      "annual",
    ] as HealthReviewCadence[]
  )
    .filter((cadence) => (byCadence.get(cadence) ?? []).length > 0)
    .map((cadence) => ({
      cadence,
      appliesToDomainIds: byCadence.get(cadence) ?? [],
      rationale: rationales[cadence],
    }));
}
