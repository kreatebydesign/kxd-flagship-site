/**
 * Founder Friction Intelligence contracts (P0-F).
 *
 * Purpose: transform moments of hesitation into permanent product improvements.
 * Every friction is evidence — not immediate work.
 * Nothing skips directly to implementation.
 */

import type {
  FrictionCategory,
  FrictionDirection,
  FrictionEffort,
  FrictionEvidenceKind,
  FrictionFrequency,
  FrictionLearningRecord,
  FrictionLifecycleTransition,
  FrictionSeverity,
  FrictionStatus,
  FounderFrictionObject,
} from "../contracts";
import type { HealthDomainId } from "../health/types";
import type { OwnerRole } from "../primitives";

/** Permanent question Founder Friction must help answer. */
export const FOUNDER_FRICTION_QUESTION =
  "What consistently slows us down?";

export const FRICTION_CATEGORIES = [
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
] as const satisfies readonly FrictionCategory[];

export const FRICTION_SEVERITIES = [
  "minor",
  "moderate",
  "major",
  "critical",
] as const satisfies readonly FrictionSeverity[];

export const FRICTION_FREQUENCIES = [
  "once",
  "occasionally",
  "weekly",
  "daily",
  "constant",
] as const satisfies readonly FrictionFrequency[];

export const FRICTION_LIFECYCLE_STATES = [
  "observed",
  "verified",
  "accepted",
  "planned",
  "in_progress",
  "resolved",
  "rejected",
  "superseded",
] as const satisfies readonly FrictionStatus[];

export const FRICTION_EVIDENCE_KINDS = [
  "founder_observation",
  "dogfood_session",
  "ux_review",
  "support_issue",
  "qa",
  "architecture_review",
  "competitive_observation",
] as const satisfies readonly FrictionEvidenceKind[];

export const FRICTION_EFFORTS = [
  "trivial",
  "small",
  "medium",
  "large",
  "xlarge",
] as const satisfies readonly FrictionEffort[];

export interface FrictionCategoryDefinition {
  id: FrictionCategory;
  title: string;
  purpose: string;
}

export interface FrictionSeverityDefinition {
  id: Exclude<FrictionSeverity, "annoyance" | "drag" | "blocker" | "trust_break">;
  title: string;
  /** Product impact — not emotion. */
  meaning: string;
}

export interface FrictionFrequencyDefinition {
  id: Exclude<FrictionFrequency, "rare">;
  title: string;
  meaning: string;
}

export interface FrictionLifecycleDefinition {
  id: Exclude<FrictionStatus, "open" | "watching">;
  title: string;
  meaning: string;
  terminal: boolean;
}

/** Allowed lifecycle transitions — every transition requires a reason at apply time. */
export type FrictionLifecycleEdge = {
  from: (typeof FRICTION_LIFECYCLE_STATES)[number];
  to: (typeof FRICTION_LIFECYCLE_STATES)[number];
};

export interface FrictionFutureLinkage {
  target:
    | "platform_health"
    | "valuation_intelligence"
    | "competitive_intelligence"
    | "weekly_reviews";
  relationship: string;
  implementationAuthorized: false;
}

/**
 * Founder Friction Index — permanent root for humans, Cursor, and future AI.
 * Not UI. Not reports.
 */
export interface FounderFrictionIndex {
  schemaVersion: "P0-F";
  systemId: "kxd-founder-friction";
  permanentQuestion: typeof FOUNDER_FRICTION_QUESTION;
  law: readonly string[];
  categories: FrictionCategoryDefinition[];
  severities: FrictionSeverityDefinition[];
  frequencies: FrictionFrequencyDefinition[];
  lifecycle: FrictionLifecycleDefinition[];
  allowedTransitions: FrictionLifecycleEdge[];
  evidenceKinds: readonly FrictionEvidenceKind[];
  efforts: readonly FrictionEffort[];
  /** Empty until authorized observation capture. */
  frictions: FounderFrictionObject[];
  futureLinkages: FrictionFutureLinkage[];
  entryPoints: {
    forHumans: string[];
    forCursor: string[];
    forFutureAi: string[];
  };
}

export interface FrictionCreateInput {
  id: string;
  title: string;
  observation: string;
  context: string;
  category: FrictionCategory;
  severity: (typeof FRICTION_SEVERITIES)[number];
  frequency: (typeof FRICTION_FREQUENCIES)[number];
  effort: FrictionEffort;
  founderImpact: string;
  clientImpact: string;
  businessImpact: string;
  operationalImpact: string;
  technicalImpact: string;
  emotionalImpact: string;
  recommendedDirection: FrictionDirection;
  evidenceIds: string[];
  frictionEvidenceKinds: FrictionEvidenceKind[];
  relatedInventoryIds: string[];
  relatedDecisionIds: string[];
  relatedRoadmapIds: string[];
  relatedHealthDomainIds: HealthDomainId[];
  relatedProductDnaIds: string[];
  relatedTechnicalDebtIds: string[];
  ownerRole: OwnerRole;
  discoveredAt: string;
  summary: string;
}

export interface FrictionTransitionInput {
  friction: FounderFrictionObject;
  to: (typeof FRICTION_LIFECYCLE_STATES)[number];
  reason: string;
  at: string;
  by: string;
  learning?: FrictionLearningRecord | null;
}

export interface FrictionValidationResult {
  ok: boolean;
  issues: string[];
}

export type { FrictionLifecycleTransition, FrictionLearningRecord };
