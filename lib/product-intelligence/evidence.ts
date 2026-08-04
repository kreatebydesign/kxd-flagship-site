/**
 * Evidence Registry contracts (P0-B Workstream 6).
 *
 * Every future claim must cite Evidence IDs.
 * Nothing references chat history.
 */

import type {
  ConfidenceLevel,
  EvidenceId,
  ObjectStatus,
  OwnerRole,
  ProductIntelligenceObjectBase,
  UpdateChannel,
} from "./primitives";

/**
 * Permanent evidence kinds. All claims link through these types.
 */
export const EVIDENCE_TYPES = [
  "commit",
  "verifier",
  "release",
  "ux_observation",
  "founder_observation",
  "competitive_review",
  "architecture_review",
  "roadmap_decision",
  /** Code presence (paths, collections, routes) — not chat. */
  "code",
  /** Structured observation from product work — not chat. */
  "observation",
  /** Formal review artifact (batch, UX, architecture, release). */
  "review",
] as const;

export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

/** Structured locator for evidence in the real system. */
export interface EvidenceLocator {
  /** Repo-relative path, URL, commit SHA, verifier script name, release tag, etc. */
  ref: string;
  /** Optional human label for the locator. */
  label?: string;
}

/**
 * Evidence detail — structured citation, never narrative dump.
 */
export interface EvidenceDetail {
  evidenceType: EvidenceType;
  /** What this evidence asserts as fact. */
  assertion: string;
  /** Locators into reality (code, commit, release, verifier). */
  locators: EvidenceLocator[];
  /** Optional ISO date the evidence was observed. */
  observedAt: string | null;
  /** Optional SHA / release / verifier identity. */
  artifactId: string | null;
}

export type EvidenceObject = ProductIntelligenceObjectBase<
  "evidence",
  EvidenceDetail
>;

/**
 * Empty Evidence Registry store — contracts only; no population in P0-B.
 */
export interface EvidenceRegistry {
  /** Schema version for the registry itself. */
  schemaVersion: "P0-B";
  /** All evidence records. Empty until later batches. */
  records: EvidenceObject[];
  /** Index by evidence type for retrieval. */
  byType: Record<EvidenceType, EvidenceId[]>;
}

export function createEmptyEvidenceRegistry(): EvidenceRegistry {
  const byType = Object.fromEntries(
    EVIDENCE_TYPES.map((type) => [type, [] as EvidenceId[]]),
  ) as Record<EvidenceType, EvidenceId[]>;

  return {
    schemaVersion: "P0-B",
    records: [],
    byType,
  };
}

/** Factory helper for well-formed evidence objects (content comes later). */
export function createEvidenceObject(input: {
  id: EvidenceId;
  title: string;
  status?: ObjectStatus;
  ownerRole: OwnerRole;
  createdAt: string;
  lastReviewedAt?: string | null;
  nextReviewAt?: string | null;
  relatedObjectIds?: string[];
  confidence?: ConfidenceLevel;
  summary: string;
  detail: EvidenceDetail;
  updateChannel?: UpdateChannel;
  version?: string;
}): EvidenceObject {
  if (!input.ownerRole) {
    throw new Error("Evidence requires an ownerRole.");
  }
  return {
    id: input.id,
    type: "evidence",
    title: input.title,
    status: input.status ?? "active",
    ownerRole: input.ownerRole,
    createdAt: input.createdAt,
    lastReviewedAt: input.lastReviewedAt ?? null,
    nextReviewAt: input.nextReviewAt ?? null,
    evidenceIds: [],
    relatedObjectIds: input.relatedObjectIds ?? [],
    confidence: input.confidence ?? "observed",
    summary: input.summary,
    detail: input.detail,
    updateChannel: input.updateChannel ?? "automatic",
    version: input.version ?? "0.0.0",
  };
}

export function isEvidenceType(value: string): value is EvidenceType {
  return (EVIDENCE_TYPES as readonly string[]).includes(value);
}
