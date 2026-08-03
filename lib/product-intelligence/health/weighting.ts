/**
 * Platform Health weighting logic (P0-E).
 * Overall Platform Health is not a flat average.
 */

import type { PlatformHealthWeighting } from "./types";
import { HEALTH_DOMAIN_DEFINITIONS } from "./domains";

/**
 * Category weights for Overall Platform Health.
 * Product 30 · Technical 25 · Business 25 · Strategic 20 = 100.
 *
 * Bias toward product + technical integrity because Edition 1 value is
 * accumulated context and calm operating software — not vanity growth metrics.
 */
export const PLATFORM_HEALTH_WEIGHTING: PlatformHealthWeighting = {
  categoryWeights: {
    product: 30,
    technical: 25,
    business: 25,
    strategic: 20,
  },
  overallIsWeightedComposite: true,
  forbidsFeatureCountAsEvidence: true,
  forbidsCommitCountAsEvidence: true,
  logic: [
    "Overall Platform Health = weighted sum of category composites.",
    "Each category composite = weighted sum of that category's domain observations (using categoryWeight).",
    "Unobserved domains (null currentValue) are excluded from a category composite; if an entire category is unobserved, overall remains unobserved.",
    "Product (30) and Technical (25) outweigh Strategic (20) because Edition 1 strength is cohesion + Shared Core + founder/client experience before market theater.",
    "Business (25) covers readiness to operate and sell safely — not financial KPIs.",
    "Feature counts and commit counts are forbidden as evidence for any movement.",
    "If a movement explanation cannot be generated from evidence IDs, the score must not change — including overall.",
  ],
};

export function assertCategoryWeightsSumTo100(): boolean {
  const { product, technical, business, strategic } =
    PLATFORM_HEALTH_WEIGHTING.categoryWeights;
  return product + technical + business + strategic === 100;
}

export function assertCategoryDomainWeightsSumTo100(): string[] {
  const issues: string[] = [];
  for (const category of ["product", "technical", "business", "strategic"] as const) {
    const sum = HEALTH_DOMAIN_DEFINITIONS.filter((d) => d.category === category).reduce(
      (acc, domain) => acc + domain.categoryWeight,
      0,
    );
    if (sum !== 100) {
      issues.push(`${category} domain weights sum to ${sum}, expected 100`);
    }
  }
  return issues;
}

/**
 * Compute a category composite from observed values.
 * Returns null if no domains in the category are observed.
 */
export function computeCategoryComposite(
  category: "product" | "technical" | "business" | "strategic",
  values: Partial<Record<string, number | null>>,
): number | null {
  const domains = HEALTH_DOMAIN_DEFINITIONS.filter((d) => d.category === category);
  let weightSum = 0;
  let scoreSum = 0;
  for (const domain of domains) {
    const value = values[domain.id];
    if (value === null || value === undefined) continue;
    weightSum += domain.categoryWeight;
    scoreSum += value * domain.categoryWeight;
  }
  if (weightSum === 0) return null;
  return Math.round((scoreSum / weightSum) * 100) / 100;
}

/**
 * Compute Overall Platform Health from category composites.
 * Not a flat average of all domains.
 */
export function computeOverallPlatformHealth(input: {
  product: number | null;
  technical: number | null;
  business: number | null;
  strategic: number | null;
}): number | null {
  const weights = PLATFORM_HEALTH_WEIGHTING.categoryWeights;
  const entries: Array<{ value: number; weight: number }> = [];
  if (input.product !== null) {
    entries.push({ value: input.product, weight: weights.product });
  }
  if (input.technical !== null) {
    entries.push({ value: input.technical, weight: weights.technical });
  }
  if (input.business !== null) {
    entries.push({ value: input.business, weight: weights.business });
  }
  if (input.strategic !== null) {
    entries.push({ value: input.strategic, weight: weights.strategic });
  }
  if (entries.length === 0) return null;
  const weightSum = entries.reduce((acc, e) => acc + e.weight, 0);
  const scoreSum = entries.reduce((acc, e) => acc + e.value * e.weight, 0);
  return Math.round((scoreSum / weightSum) * 100) / 100;
}
