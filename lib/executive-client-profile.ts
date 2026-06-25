/**
 * Executive Client Profile helpers — Phase 1 KXD OS Executive Layer.
 */

export const EXECUTIVE_CLIENT_TIERS = ["A", "B", "C"] as const;
export type ExecutiveClientTier = (typeof EXECUTIVE_CLIENT_TIERS)[number];

export const EXECUTIVE_RELATIONSHIP_STATUSES = [
  "active",
  "paused",
  "at-risk",
  "archived",
] as const;
export type ExecutiveRelationshipStatus = (typeof EXECUTIVE_RELATIONSHIP_STATUSES)[number];

export const EXECUTIVE_POTENTIAL_LEVELS = ["low", "medium", "high"] as const;
export type ExecutivePotentialLevel = (typeof EXECUTIVE_POTENTIAL_LEVELS)[number];

export const EXECUTIVE_CASE_STUDY_LEVELS = [
  "low",
  "medium",
  "high",
  "flagship",
] as const;
export type ExecutiveCaseStudyLevel = (typeof EXECUTIVE_CASE_STUDY_LEVELS)[number];

export const EXECUTIVE_PRIORITY_LEVELS = [
  "low",
  "medium",
  "high",
  "critical",
] as const;
export type ExecutivePriorityLevel = (typeof EXECUTIVE_PRIORITY_LEVELS)[number];

export const EXECUTIVE_TIER_LABEL: Record<ExecutiveClientTier, string> = {
  A: "Tier A",
  B: "Tier B",
  C: "Tier C",
};

export const EXECUTIVE_STATUS_LABEL: Record<ExecutiveRelationshipStatus, string> = {
  active: "Active",
  paused: "Paused",
  "at-risk": "At Risk",
  archived: "Archived",
};

export const EXECUTIVE_PRIORITY_LABEL: Record<ExecutivePriorityLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

/** Manual annual value wins; otherwise currentMonthlyRevenue × 12. */
export function calculateEstimatedAnnualValue(
  currentMonthlyRevenue: number | null | undefined,
  estimatedAnnualValue: number | null | undefined,
): number | null {
  if (
    estimatedAnnualValue != null &&
    !Number.isNaN(estimatedAnnualValue) &&
    estimatedAnnualValue > 0
  ) {
    return estimatedAnnualValue;
  }
  if (
    currentMonthlyRevenue != null &&
    !Number.isNaN(currentMonthlyRevenue) &&
    currentMonthlyRevenue > 0
  ) {
    return currentMonthlyRevenue * 12;
  }
  return null;
}

export function fmtExecutiveMoney(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyDoc = Record<string, any>;

export function resolveClientId(raw: unknown): number | null {
  if (!raw) return null;
  if (typeof raw === "number") return raw;
  if (typeof raw === "object" && raw !== null && "id" in raw) {
    return (raw as AnyDoc).id as number;
  }
  return null;
}

export function resolveClientName(raw: unknown): string {
  if (!raw) return "Unknown";
  if (typeof raw === "object" && raw !== null && "name" in raw) {
    return (raw as AnyDoc).name as string || "Unknown";
  }
  return "Unknown";
}

export interface MergedExecutiveClientRow {
  clientId: number;
  name: string;
  slug: string | null;
  clientStatus: string | null;
  brandTier: string | null;
  tier: ExecutiveClientTier | null;
  monthlyRevenue: number | null;
  potentialMonthlyRevenue: number | null;
  estimatedAnnualValue: number | null;
  healthScore: number | null;
  relationshipStatus: ExecutiveRelationshipStatus | null;
  nextAction: string | null;
  nextActionDueDate: string | null;
  internalPriority: ExecutivePriorityLevel | null;
  caseStudyPotential: ExecutiveCaseStudyLevel | null;
  upsellSummary: string | null;
  hasExecutiveProfile: boolean;
  executiveProfileId: number | null;
}

export function mergeClientWithExecutiveProfile(
  client: AnyDoc,
  profile: AnyDoc | null | undefined,
): MergedExecutiveClientRow {
  const clientId = client.id as number;
  const monthlyRevenue =
    (profile?.currentMonthlyRevenue as number | null | undefined) ??
    (client.monthlyRetainerAmount as number | null | undefined) ??
    null;

  const estimatedAnnualValue = calculateEstimatedAnnualValue(
    profile?.currentMonthlyRevenue as number | null | undefined ?? monthlyRevenue,
    profile?.estimatedAnnualValue as number | null | undefined,
  );

  return {
    clientId,
    name: (client.name as string) || "Unknown",
    slug: (client.slug as string) || null,
    clientStatus: (client.status as string) || null,
    brandTier: (client.brandTier as string) || null,
    tier: (profile?.clientTier as ExecutiveClientTier) || null,
    monthlyRevenue,
    potentialMonthlyRevenue: (profile?.potentialMonthlyRevenue as number) ?? null,
    estimatedAnnualValue,
    healthScore: (profile?.clientHealthScore as number) ?? null,
    relationshipStatus: (profile?.relationshipStatus as ExecutiveRelationshipStatus) ?? null,
    nextAction:
      (profile?.nextAction as string) ||
      (client.nextAction as string) ||
      null,
    nextActionDueDate:
      (profile?.nextActionDueDate as string) ||
      (client.nextActionDueDate as string) ||
      null,
    internalPriority: (profile?.internalPriority as ExecutivePriorityLevel) ?? null,
    caseStudyPotential: (profile?.caseStudyPotential as ExecutiveCaseStudyLevel) ?? null,
    upsellSummary: (profile?.upsellOpportunities as string) || null,
    hasExecutiveProfile: Boolean(profile),
    executiveProfileId: profile ? (profile.id as number) : null,
  };
}
