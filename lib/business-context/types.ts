/**
 * Phase 17E — Business Context
 * Interpretation context for how the same fact means different things per business.
 * Never replaces observations or overrides facts.
 */

export type BusinessModel =
  | "creative-agency"
  | "construction"
  | "restaurant"
  | "professional-services"
  | "retail"
  | "saas"
  | "custom";

export type OperatingStyle =
  | "founder-led"
  | "team-operated"
  | "project-based"
  | "retainer-based"
  | "seasonal"
  | "launch-driven";

export type BusinessPriorityKey =
  | "delivery"
  | "relationships"
  | "revenue"
  | "quality"
  | "growth"
  | "operations"
  | "brand"
  | "cash-flow";

export interface BusinessPriority {
  id: string;
  key: BusinessPriorityKey;
  label: string;
  weight: number;
}

export type BusinessGoalHorizon = "near-term" | "quarter" | "annual";

export type BusinessGoalEmphasis = "primary" | "secondary";

export interface BusinessGoal {
  id: string;
  label: string;
  horizon: BusinessGoalHorizon;
  emphasis: BusinessGoalEmphasis;
}

export type BusinessDomainKey =
  | "delivery"
  | "operations"
  | "relationships"
  | "financial-health"
  | "marketing"
  | "reviews"
  | "brand"
  | "communications";

export interface BusinessDomain {
  id: string;
  key: BusinessDomainKey;
  label: string;
  weight: number;
}

export interface SuccessIndicator {
  id: string;
  label: string;
  domain: BusinessDomainKey;
  description: string;
}

export type BusinessMaturity = "early" | "growing" | "established" | "scaling";

export type BusinessContext = {
  id: string;
  businessName?: string;
  industry?: string;
  businessModel?: BusinessModel;
  operatingStyle?: OperatingStyle;
  maturity?: BusinessMaturity;
  priorities: BusinessPriority[];
  goals: BusinessGoal[];
  importantDomains: BusinessDomain[];
  successIndicators: SuccessIndicator[];
  createdAt: string;
  updatedAt: string;
};

/** Known observation patterns that benefit from contextual interpretation */
export type ContextObservationPattern =
  | "delivery.delay"
  | "delivery.pressure"
  | "operations.load"
  | "operations.blocked"
  | "relationship.inactivity"
  | "relationship.engagement"
  | "review.backlog"
  | "communications.stale"
  | "health.pressure"
  | "execution.momentum";

export interface ContextInterpretationInput {
  /** Pattern key — not the raw observation fact */
  pattern: ContextObservationPattern;
  /** Generic meaning from Brain or upstream layer */
  genericMeaning: string;
}

export interface ContextInterpretationResult {
  pattern: ContextObservationPattern;
  genericMeaning: string;
  contextualMeaning: string;
  businessModel: BusinessModel;
  applied: boolean;
}

export type BusinessContextInput = Partial<
  Omit<BusinessContext, "id" | "createdAt" | "updatedAt">
> & {
  id?: string;
};
