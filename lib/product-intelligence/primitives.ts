/**
 * Shared primitives for every Product Intelligence object (P0-B).
 *
 * Think database schema for product knowledge — not documentation.
 */

/** Stable unique identifier for a Product Intelligence object. */
export type ProductIntelligenceId = string;

/**
 * How an object may enter the Update Engine.
 * Protected objects (DNA, Doctrine, Vision) never accept automatic mutation.
 */
export const UPDATE_CHANNELS = [
  "automatic",
  "generated_draft",
  "manual_approval",
  "protected",
] as const;

export type UpdateChannel = (typeof UPDATE_CHANNELS)[number];

/** Stable unique identifier for an evidence record. */
export type EvidenceId = string;

/**
 * Canonical object types. Registry must list every value — no orphans, no duplicates.
 */
export const PRODUCT_INTELLIGENCE_OBJECT_TYPES = [
  "doctrine",
  "product_dna",
  "vision",
  "product_inventory",
  "architecture",
  "experience",
  "design_system",
  "evidence",
  "decision",
  "founder_friction",
  "competitive_insight",
  "roadmap_item",
  "technical_debt",
  "release",
  "score",
  "valuation",
  "health_snapshot",
  "hall_of_fame",
  "product_kill_list",
  "future_bet",
] as const;

export type ProductIntelligenceObjectType =
  (typeof PRODUCT_INTELLIGENCE_OBJECT_TYPES)[number];

/**
 * Owner roles. Every object must have an owner — no ownerless truth.
 */
export const OWNER_ROLES = [
  "founder",
  "cpo",
  "cto",
  "cdo",
  "coo",
  "strategy",
  "ops",
  "qa",
  "shared",
] as const;

export type OwnerRole = (typeof OWNER_ROLES)[number];

/**
 * Lifecycle status vocabulary shared across object types.
 * Object-specific contracts may constrain to a subset.
 */
export const OBJECT_STATUSES = [
  "draft",
  "active",
  "watching",
  "approved",
  "authorized",
  "in_flight",
  "shipped",
  "resolved",
  "accepted",
  "rejected",
  "retired",
  "superseded",
  "archived",
  "protected",
  "open",
  "pending",
  "validated",
  "reversed",
  "candidate",
  "believed",
] as const;

export type ObjectStatus = (typeof OBJECT_STATUSES)[number];

/** Confidence model from P0-A. */
export const CONFIDENCE_LEVELS = [
  "observed",
  "inferred",
  "declared",
] as const;

export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

/**
 * Base contract fields required on every Product Intelligence object.
 * Object-specific contracts extend `detail` with structured fields — never essays.
 */
export interface ProductIntelligenceObjectBase<
  TType extends ProductIntelligenceObjectType = ProductIntelligenceObjectType,
  TDetail = Record<string, unknown>,
> {
  /** Unique ID. */
  id: ProductIntelligenceId;
  /** Object type discriminator. */
  type: TType;
  /** Human-readable title. */
  title: string;
  /** Lifecycle status. */
  status: ObjectStatus;
  /** Required owner role — no object may exist without an owner. */
  ownerRole: OwnerRole;
  /** ISO-8601 creation timestamp. */
  createdAt: string;
  /** ISO-8601 last human/system review, or null if never reviewed. */
  lastReviewedAt: string | null;
  /** ISO-8601 next required review, or null when not on cadence yet. */
  nextReviewAt: string | null;
  /** Evidence Registry references. Claims without evidence are incomplete. */
  evidenceIds: EvidenceId[];
  /** Related Product Intelligence object IDs (typed edges live in relationships). */
  relatedObjectIds: ProductIntelligenceId[];
  /** Confidence of the object's claims. */
  confidence: ConfidenceLevel;
  /** Short human summary — not a document. */
  summary: string;
  /** Structured detail payload for this object type. */
  detail: TDetail;
  /** How this object may be updated (see Update Engine). */
  updateChannel: UpdateChannel;
  /** Current intelligence version string for this object. */
  version: string;
}

/** Guard: owner role must always be present and known. */
export function assertHasOwner(ownerRole: OwnerRole | null | undefined): OwnerRole {
  if (!ownerRole || !(OWNER_ROLES as readonly string[]).includes(ownerRole)) {
    throw new Error(
      "Product Intelligence objects require a valid ownerRole. No orphan ownership.",
    );
  }
  return ownerRole;
}

/** Guard: object type must be in the permanent registry. */
export function isProductIntelligenceObjectType(
  value: string,
): value is ProductIntelligenceObjectType {
  return (PRODUCT_INTELLIGENCE_OBJECT_TYPES as readonly string[]).includes(value);
}
