import type {
  BusinessContext,
  BusinessContextInput,
  BusinessDomain,
  BusinessDomainKey,
  BusinessGoal,
  BusinessGoalEmphasis,
  BusinessGoalHorizon,
  BusinessMaturity,
  BusinessModel,
  BusinessPriority,
  BusinessPriorityKey,
  OperatingStyle,
  SuccessIndicator,
} from "./types";

const BUSINESS_MODELS: BusinessModel[] = [
  "creative-agency",
  "construction",
  "restaurant",
  "professional-services",
  "retail",
  "saas",
  "custom",
];

const OPERATING_STYLES: OperatingStyle[] = [
  "founder-led",
  "team-operated",
  "project-based",
  "retainer-based",
  "seasonal",
  "launch-driven",
];

const MATURITY_LEVELS: BusinessMaturity[] = ["early", "growing", "established", "scaling"];

const PRIORITY_KEYS: BusinessPriorityKey[] = [
  "delivery",
  "relationships",
  "revenue",
  "quality",
  "growth",
  "operations",
  "brand",
  "cash-flow",
];

const DOMAIN_KEYS: BusinessDomainKey[] = [
  "delivery",
  "operations",
  "relationships",
  "financial-health",
  "marketing",
  "reviews",
  "brand",
  "communications",
];

const GOAL_HORIZONS: BusinessGoalHorizon[] = ["near-term", "quarter", "annual"];
const GOAL_EMPHASIS: BusinessGoalEmphasis[] = ["primary", "secondary"];

function clampWeight(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function normalizeBusinessModel(value: unknown): BusinessModel | undefined {
  if (typeof value !== "string") return undefined;
  return BUSINESS_MODELS.includes(value as BusinessModel) ? (value as BusinessModel) : undefined;
}

export function normalizeOperatingStyle(value: unknown): OperatingStyle | undefined {
  if (typeof value !== "string") return undefined;
  return OPERATING_STYLES.includes(value as OperatingStyle)
    ? (value as OperatingStyle)
    : undefined;
}

export function normalizeMaturity(value: unknown): BusinessMaturity | undefined {
  if (typeof value !== "string") return undefined;
  return MATURITY_LEVELS.includes(value as BusinessMaturity)
    ? (value as BusinessMaturity)
    : undefined;
}

export function normalizePriorityKey(value: unknown): BusinessPriorityKey | null {
  if (typeof value !== "string") return null;
  return PRIORITY_KEYS.includes(value as BusinessPriorityKey)
    ? (value as BusinessPriorityKey)
    : null;
}

export function normalizeDomainKey(value: unknown): BusinessDomainKey | null {
  if (typeof value !== "string") return null;
  return DOMAIN_KEYS.includes(value as BusinessDomainKey)
    ? (value as BusinessDomainKey)
    : null;
}

export function normalizeGoalHorizon(value: unknown): BusinessGoalHorizon {
  if (typeof value === "string" && GOAL_HORIZONS.includes(value as BusinessGoalHorizon)) {
    return value as BusinessGoalHorizon;
  }
  return "near-term";
}

export function normalizeGoalEmphasis(value: unknown): BusinessGoalEmphasis {
  if (typeof value === "string" && GOAL_EMPHASIS.includes(value as BusinessGoalEmphasis)) {
    return value as BusinessGoalEmphasis;
  }
  return "secondary";
}

export function normalizePriority(input: unknown, index: number): BusinessPriority | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const key = normalizePriorityKey(raw.key);
  if (!key) return null;

  return {
    id: typeof raw.id === "string" ? raw.id : `priority:${key}:${index}`,
    key,
    label: typeof raw.label === "string" && raw.label.trim() ? raw.label.trim() : key,
    weight: clampWeight(Number(raw.weight)),
  };
}

export function normalizeDomain(input: unknown, index: number): BusinessDomain | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const key = normalizeDomainKey(raw.key);
  if (!key) return null;

  return {
    id: typeof raw.id === "string" ? raw.id : `domain:${key}:${index}`,
    key,
    label: typeof raw.label === "string" && raw.label.trim() ? raw.label.trim() : key,
    weight: clampWeight(Number(raw.weight)),
  };
}

export function normalizeGoal(input: unknown, index: number): BusinessGoal | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const label = typeof raw.label === "string" ? raw.label.trim() : "";
  if (!label) return null;

  return {
    id: typeof raw.id === "string" ? raw.id : `goal:${index}`,
    label,
    horizon: normalizeGoalHorizon(raw.horizon),
    emphasis: normalizeGoalEmphasis(raw.emphasis),
  };
}

export function normalizeSuccessIndicator(
  input: unknown,
  index: number,
): SuccessIndicator | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const domain = normalizeDomainKey(raw.domain);
  const label = typeof raw.label === "string" ? raw.label.trim() : "";
  if (!domain || !label) return null;

  return {
    id: typeof raw.id === "string" ? raw.id : `success:${domain}:${index}`,
    label,
    domain,
    description:
      typeof raw.description === "string" && raw.description.trim()
        ? raw.description.trim()
        : label,
  };
}

export function normalizeBusinessContext(
  input: BusinessContextInput,
  fallback?: BusinessContext,
): BusinessContext {
  const now = new Date().toISOString();
  const base = fallback ?? createEmptyBusinessContext(now);

  const priorities = Array.isArray(input.priorities)
    ? input.priorities
        .map((item, index) => normalizePriority(item, index))
        .filter((item): item is BusinessPriority => item !== null)
    : base.priorities;

  const importantDomains = Array.isArray(input.importantDomains)
    ? input.importantDomains
        .map((item, index) => normalizeDomain(item, index))
        .filter((item): item is BusinessDomain => item !== null)
    : base.importantDomains;

  const goals = Array.isArray(input.goals)
    ? input.goals
        .map((item, index) => normalizeGoal(item, index))
        .filter((item): item is BusinessGoal => item !== null)
    : base.goals;

  const successIndicators = Array.isArray(input.successIndicators)
    ? input.successIndicators
        .map((item, index) => normalizeSuccessIndicator(item, index))
        .filter((item): item is SuccessIndicator => item !== null)
    : base.successIndicators;

  return {
    id: typeof input.id === "string" && input.id.trim() ? input.id.trim() : base.id,
    businessName:
      typeof input.businessName === "string" && input.businessName.trim()
        ? input.businessName.trim()
        : base.businessName,
    industry:
      typeof input.industry === "string" && input.industry.trim()
        ? input.industry.trim()
        : base.industry,
    businessModel: normalizeBusinessModel(input.businessModel) ?? base.businessModel,
    operatingStyle: normalizeOperatingStyle(input.operatingStyle) ?? base.operatingStyle,
    maturity: normalizeMaturity(input.maturity) ?? base.maturity,
    priorities: priorities.length > 0 ? priorities : base.priorities,
    goals: goals.length > 0 ? goals : base.goals,
    importantDomains:
      importantDomains.length > 0 ? importantDomains : base.importantDomains,
    successIndicators:
      successIndicators.length > 0 ? successIndicators : base.successIndicators,
    createdAt: base.createdAt,
    updatedAt: now,
  };
}

function createEmptyBusinessContext(now: string): BusinessContext {
  return {
    id: "business-context:default",
    priorities: [],
    goals: [],
    importantDomains: [],
    successIndicators: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function isValidBusinessContext(value: unknown): value is BusinessContext {
  if (!value || typeof value !== "object") return false;
  const raw = value as BusinessContext;
  return (
    typeof raw.id === "string" &&
    Array.isArray(raw.priorities) &&
    Array.isArray(raw.goals) &&
    Array.isArray(raw.importantDomains) &&
    Array.isArray(raw.successIndicators) &&
    typeof raw.createdAt === "string" &&
    typeof raw.updatedAt === "string"
  );
}
