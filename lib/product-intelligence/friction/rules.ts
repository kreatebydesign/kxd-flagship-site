/**
 * Founder Friction validation, lifecycle, and learning rules (P0-F).
 */

import type { FounderFrictionObject } from "../contracts";
import {
  FRICTION_ALLOWED_TRANSITIONS,
  normalizeLifecycleState,
} from "./registry";
import type {
  FrictionCreateInput,
  FrictionTransitionInput,
  FrictionValidationResult,
} from "./types";
import {
  FRICTION_CATEGORIES,
  FRICTION_EFFORTS,
  FRICTION_EVIDENCE_KINDS,
  FRICTION_FREQUENCIES,
  FRICTION_SEVERITIES,
} from "./types";

export function validateFrictionCreate(
  input: FrictionCreateInput,
): FrictionValidationResult {
  const issues: string[] = [];

  if (!input.id.trim()) issues.push("id required");
  if (!input.title.trim()) issues.push("title required");
  if (!input.observation.trim()) issues.push("observation required");
  if (!input.context.trim()) issues.push("context required");
  if (!(FRICTION_CATEGORIES as readonly string[]).includes(input.category)) {
    issues.push("category must be from closed vocabulary");
  }
  if (!(FRICTION_SEVERITIES as readonly string[]).includes(input.severity)) {
    issues.push("severity must be minor|moderate|major|critical");
  }
  if (!(FRICTION_FREQUENCIES as readonly string[]).includes(input.frequency)) {
    issues.push("frequency must be once|occasionally|weekly|daily|constant");
  }
  if (!(FRICTION_EFFORTS as readonly string[]).includes(input.effort)) {
    issues.push("effort invalid");
  }
  if (!input.founderImpact.trim()) issues.push("founderImpact required");
  if (!input.clientImpact.trim()) issues.push("clientImpact required");
  if (!input.businessImpact.trim()) issues.push("businessImpact required");
  if (!input.operationalImpact.trim()) issues.push("operationalImpact required");
  if (!input.technicalImpact.trim()) issues.push("technicalImpact required");
  if (!input.ownerRole) issues.push("ownerRole required");
  if (!input.discoveredAt) issues.push("discoveredAt required");

  if (input.evidenceIds.length === 0) {
    issues.push("evidenceIds required — no anonymous friction");
  }
  if (input.frictionEvidenceKinds.length === 0) {
    issues.push("frictionEvidenceKinds required");
  }
  for (const kind of input.frictionEvidenceKinds) {
    if (!(FRICTION_EVIDENCE_KINDS as readonly string[]).includes(kind)) {
      issues.push(`invalid evidence kind: ${kind}`);
    }
  }

  // Relationships — nothing isolated.
  if (input.relatedInventoryIds.length === 0) {
    issues.push("relatedInventoryIds required");
  }
  if (input.relatedHealthDomainIds.length === 0) {
    issues.push("relatedHealthDomainIds required");
  }

  return { ok: issues.length === 0, issues };
}

export function createFounderFrictionObject(
  input: FrictionCreateInput,
): FounderFrictionObject {
  const validation = validateFrictionCreate(input);
  if (!validation.ok) {
    throw new Error(
      `Invalid Founder Friction: ${validation.issues.join("; ")}`,
    );
  }

  return {
    id: input.id,
    type: "founder_friction",
    title: input.title,
    status: "active",
    ownerRole: input.ownerRole,
    createdAt: input.discoveredAt,
    lastReviewedAt: input.discoveredAt,
    nextReviewAt: null,
    evidenceIds: [...input.evidenceIds],
    relatedObjectIds: [
      ...input.relatedInventoryIds,
      ...input.relatedDecisionIds,
      ...input.relatedRoadmapIds,
      ...input.relatedHealthDomainIds.map((id) => `health:${id}`),
      ...input.relatedProductDnaIds,
      ...input.relatedTechnicalDebtIds,
    ],
    confidence: "observed",
    summary: input.summary,
    detail: {
      observation: input.observation,
      context: input.context,
      frequency: input.frequency,
      severity: input.severity,
      businessImpact: input.businessImpact,
      emotionalImpact: input.emotionalImpact,
      recommendedDirection: input.recommendedDirection,
      frictionStatus: "observed",
      category: input.category,
      effort: input.effort,
      founderImpact: input.founderImpact,
      clientImpact: input.clientImpact,
      operationalImpact: input.operationalImpact,
      technicalImpact: input.technicalImpact,
      relatedInventoryIds: [...input.relatedInventoryIds],
      relatedDecisionIds: [...input.relatedDecisionIds],
      relatedRoadmapIds: [...input.relatedRoadmapIds],
      relatedHealthDomainIds: [...input.relatedHealthDomainIds],
      relatedProductDnaIds: [...input.relatedProductDnaIds],
      relatedTechnicalDebtIds: [...input.relatedTechnicalDebtIds],
      frictionEvidenceKinds: [...input.frictionEvidenceKinds],
      discoveredAt: input.discoveredAt,
      resolvedAt: null,
      lifecycleTransitions: [],
      learning: null,
    },
    updateChannel: "generated_draft",
    version: "0.1.0",
  };
}

export function validateFrictionTransition(
  input: FrictionTransitionInput,
): FrictionValidationResult {
  const issues: string[] = [];
  if (!input.reason.trim()) {
    issues.push("transition reason required");
  }
  if (!input.by.trim()) {
    issues.push("transition author required");
  }

  const from = normalizeLifecycleState(input.friction.detail.frictionStatus);
  if (!from) {
    issues.push(`unknown current lifecycle state: ${input.friction.detail.frictionStatus}`);
    return { ok: false, issues };
  }

  const allowed = FRICTION_ALLOWED_TRANSITIONS.some(
    (edge) => edge.from === from && edge.to === input.to,
  );
  if (!allowed) {
    issues.push(`transition not allowed: ${from} → ${input.to}`);
  }

  if (input.to === "resolved") {
    if (!input.learning) {
      issues.push(
        "resolved friction requires learning (whatChanged, whyItWorked, whatProductIntelligenceLearned)",
      );
    } else {
      if (!input.learning.whatChanged.trim()) issues.push("learning.whatChanged required");
      if (!input.learning.whyItWorked.trim()) issues.push("learning.whyItWorked required");
      if (!input.learning.whatProductIntelligenceLearned.trim()) {
        issues.push("learning.whatProductIntelligenceLearned required");
      }
    }
  }

  return { ok: issues.length === 0, issues };
}

export function applyFrictionTransition(
  input: FrictionTransitionInput,
): FounderFrictionObject {
  const validation = validateFrictionTransition(input);
  if (!validation.ok) {
    throw new Error(
      `Invalid friction transition: ${validation.issues.join("; ")}`,
    );
  }

  const from = normalizeLifecycleState(input.friction.detail.frictionStatus)!;
  const transitions = [
    ...input.friction.detail.lifecycleTransitions,
    {
      from,
      to: input.to,
      reason: input.reason.trim(),
      at: input.at,
      by: input.by,
    },
  ];

  return {
    ...input.friction,
    lastReviewedAt: input.at,
    detail: {
      ...input.friction.detail,
      frictionStatus: input.to,
      lifecycleTransitions: transitions,
      resolvedAt: input.to === "resolved" ? input.at : input.friction.detail.resolvedAt,
      learning:
        input.to === "resolved" ? (input.learning ?? null) : input.friction.detail.learning,
    },
  };
}

/**
 * Product law: friction may become evidence → decision → roadmap → improvement.
 * Never skip directly to implementation.
 */
export const FRICTION_PROMOTION_PATH = [
  "founder_friction",
  "evidence",
  "decision",
  "roadmap_item",
  "product_improvement",
] as const;
