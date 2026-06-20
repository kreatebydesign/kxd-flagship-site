/**
 * lib/website-audit/scoring.ts
 * Weighted overall score and KXD grade mapping.
 */

export type AuditGrade = "A" | "B" | "C" | "D" | "F";

export type CategoryScores = {
  performanceScore: number;
  seoScore: number;
  mobileScore: number;
  conversionScore: number;
  brandScore: number;
};

export type WeightedAuditResult = CategoryScores & {
  overallScore: number;
  grade: AuditGrade;
};

const WEIGHTS = {
  performance: 0.2,
  seo: 0.25,
  mobile: 0.2,
  conversion: 0.2,
  brand: 0.15,
} as const;

export function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function scoreToGrade(score: number): AuditGrade {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export function calculateOverallScore(scores: CategoryScores): WeightedAuditResult {
  const overall =
    scores.performanceScore * WEIGHTS.performance +
    scores.seoScore * WEIGHTS.seo +
    scores.mobileScore * WEIGHTS.mobile +
    scores.conversionScore * WEIGHTS.conversion +
    scores.brandScore * WEIGHTS.brand;

  const overallScore = clampScore(overall);

  return {
    ...scores,
    overallScore,
    grade: scoreToGrade(overallScore),
  };
}

export const GRADE_COLOR: Record<AuditGrade, string> = {
  A: "#5ec68c",
  B: "#96d2c8",
  C: "#f0be50",
  D: "#d25a5a",
  F: "#d25a5a",
};

export const AUDIT_STATUS_LABEL: Record<string, string> = {
  "new-lead":      "New Lead",
  contacted:       "Contacted",
  qualified:       "Qualified",
  "proposal-sent": "Proposal Sent",
  "closed-won":    "Closed Won",
  "closed-lost":   "Closed Lost",
};
