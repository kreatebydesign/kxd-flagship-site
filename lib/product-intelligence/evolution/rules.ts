/**
 * Product Evolution validation, chronology, and release-link rules (P0-G).
 */

import type { ProductEvolutionObject } from "../contracts";
import type {
  EvolutionCreateInput,
  EvolutionTimelineModel,
  EvolutionValidationResult,
  ReleaseLinkValidationInput,
} from "./types";
import { PRODUCT_EVOLUTION_TYPES } from "./types";

export function isValidIsoDate(value: string): boolean {
  if (!value.trim()) return false;
  const ms = Date.parse(value);
  return Number.isFinite(ms);
}

export function validateEvolutionCreate(
  input: EvolutionCreateInput,
): EvolutionValidationResult {
  const issues: string[] = [];

  if (!input.id.trim()) issues.push("id required");
  if (!input.title.trim()) issues.push("title required");
  if (!input.summary.trim()) issues.push("summary required");
  if (!input.detailedReasoning.trim()) issues.push("detailedReasoning required");
  if (!input.objectSummary.trim()) issues.push("objectSummary required");
  if (!input.ownerRole) issues.push("ownerRole required");

  if (
    !(PRODUCT_EVOLUTION_TYPES as readonly string[]).includes(input.evolutionType)
  ) {
    issues.push("evolutionType must be from closed vocabulary");
  }

  if (!isValidIsoDate(input.milestoneDate)) {
    issues.push("milestoneDate must be valid ISO-8601");
  }

  if (input.evidenceIds.length === 0) {
    issues.push("evidenceIds required — every milestone needs evidence");
  }

  // Nothing remains isolated — require Decision Archive + Inventory + DNA links at create.
  if (input.relatedDecisionIds.length === 0) {
    issues.push("relatedDecisionIds required");
  }
  if (input.relatedInventoryIds.length === 0) {
    issues.push("relatedInventoryIds required");
  }
  if (input.relatedProductDnaIds.length === 0) {
    issues.push("relatedProductDnaIds required");
  }

  return { ok: issues.length === 0, issues };
}

export function createProductEvolutionObject(
  input: EvolutionCreateInput,
): ProductEvolutionObject {
  const validation = validateEvolutionCreate(input);
  if (!validation.ok) {
    throw new Error(
      `Invalid Product Evolution entry: ${validation.issues.join("; ")}`,
    );
  }

  return {
    id: input.id,
    type: "product_evolution",
    title: input.title,
    status: "active",
    ownerRole: input.ownerRole,
    createdAt: input.milestoneDate,
    lastReviewedAt: input.milestoneDate,
    nextReviewAt: null,
    evidenceIds: [...input.evidenceIds],
    relatedObjectIds: [
      ...input.relatedReleaseIds,
      ...input.relatedDecisionIds,
      ...input.relatedInventoryIds,
      ...input.relatedProductDnaIds,
      ...input.relatedFrictionIds,
      ...input.relatedHealthMovementIds,
    ],
    confidence: "observed",
    summary: input.objectSummary,
    detail: {
      evolutionType: input.evolutionType,
      summary: input.summary,
      detailedReasoning: input.detailedReasoning,
      milestoneDate: input.milestoneDate,
      relatedReleaseIds: [...input.relatedReleaseIds],
      relatedCommitShas: [...input.relatedCommitShas],
      relatedVerifierIds: [...input.relatedVerifierIds],
      relatedInventoryIds: [...input.relatedInventoryIds],
      relatedDecisionIds: [...input.relatedDecisionIds],
      relatedProductDnaIds: [...input.relatedProductDnaIds],
      relatedHealthMovementIds: [...input.relatedHealthMovementIds],
      relatedFrictionIds: [...input.relatedFrictionIds],
      gitEvidence: input.gitEvidence.map((g) => ({ ...g })),
    },
    updateChannel: "manual_approval",
    version: "0.1.0",
  };
}

/**
 * Release relationship law: no release becomes isolated.
 */
export function validateReleaseLinks(
  input: ReleaseLinkValidationInput,
): EvolutionValidationResult {
  const issues: string[] = [];
  if (!input.id.trim()) issues.push("release id required");
  if (!input.releaseKey.trim()) issues.push("releaseKey required");
  if (input.evidenceIds.length === 0) {
    issues.push("release evidenceIds required");
  }
  if (input.relatedDecisionIds.length === 0) {
    issues.push("release must link to decisions");
  }
  if (input.relatedInventoryIds.length === 0) {
    issues.push("release must link to inventory");
  }
  if (input.relatedVerifierIds.length === 0) {
    issues.push("release must link to verifiers");
  }
  if (input.relatedHealthDomainIds.length === 0) {
    issues.push("release must link to platform health domains");
  }
  if (input.relatedEvolutionIds.length === 0) {
    issues.push("release must link to product evolution entries");
  }
  return { ok: issues.length === 0, issues };
}

/**
 * Build chronological timeline model from entries (contracts helper).
 * Does not invent content — operates on provided IDs/dates only.
 */
export function buildEvolutionTimeline(
  entries: Array<{ id: string; milestoneDate: string; evolutionType: string }>,
  ordering: EvolutionTimelineModel["ordering"] = "milestone_date_asc",
): EvolutionTimelineModel {
  const sorted = [...entries].sort((a, b) => {
    const delta = Date.parse(a.milestoneDate) - Date.parse(b.milestoneDate);
    return ordering === "milestone_date_asc" ? delta : -delta;
  });

  const orderedEntryIds = sorted.map((e) => e.id);
  const lookupById: Record<string, number> = {};
  orderedEntryIds.forEach((id, index) => {
    lookupById[id] = index;
  });

  const byYear = new Map<string, string[]>();
  const byType = new Map<string, string[]>();
  for (const entry of sorted) {
    const year = entry.milestoneDate.slice(0, 4) || "unknown";
    byYear.set(year, [...(byYear.get(year) ?? []), entry.id]);
    byType.set(entry.evolutionType, [
      ...(byType.get(entry.evolutionType) ?? []),
      entry.id,
    ]);
  }

  return {
    ordering,
    orderedEntryIds,
    groups: [
      ...[...byYear.entries()].map(([key, entryIds]) => ({
        key,
        kind: "by_year" as const,
        entryIds,
      })),
      ...[...byType.entries()].map(([key, entryIds]) => ({
        key,
        kind: "by_type" as const,
        entryIds,
      })),
    ],
    lookupById,
  };
}

export function createEmptyTimeline(): EvolutionTimelineModel {
  return {
    ordering: "milestone_date_asc",
    orderedEntryIds: [],
    groups: [],
    lookupById: {},
  };
}

export function findDuplicateEvolutionIds(
  entries: ProductEvolutionObject[],
): string[] {
  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const entry of entries) {
    if (seen.has(entry.id)) dupes.push(entry.id);
    seen.add(entry.id);
  }
  return dupes;
}

export function findDuplicateMilestoneSignatures(
  entries: ProductEvolutionObject[],
): string[] {
  const seen = new Map<string, string>();
  const dupes: string[] = [];
  for (const entry of entries) {
    const signature = [
      entry.detail.evolutionType,
      entry.detail.milestoneDate,
      entry.title.trim().toLowerCase(),
    ].join("|");
    if (seen.has(signature)) {
      dupes.push(entry.id);
    } else {
      seen.set(signature, entry.id);
    }
  }
  return dupes;
}

export function findOrphanEvolutionEntries(
  entries: ProductEvolutionObject[],
): string[] {
  return entries
    .filter(
      (entry) =>
        entry.evidenceIds.length === 0 ||
        entry.detail.relatedDecisionIds.length === 0 ||
        entry.detail.relatedInventoryIds.length === 0 ||
        entry.detail.relatedProductDnaIds.length === 0,
    )
    .map((entry) => entry.id);
}

export function chronologyIsValid(entries: ProductEvolutionObject[]): boolean {
  return entries.every((entry) => isValidIsoDate(entry.detail.milestoneDate));
}
