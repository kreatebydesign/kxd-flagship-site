/**
 * Future Bets validation, promotion, chronology, and integrity helpers (P0-J).
 */

import { EMPTY_FUTURE_BET_FLAGS } from "../contracts";
import type { FutureBetObject } from "../contracts";
import type {
  FutureBetCreateInput,
  FutureBetPromotionAttempt,
  FutureBetTimelineModel,
  FutureBetValidationResult,
} from "./types";
import {
  FUTURE_BET_CATEGORIES,
  FUTURE_BET_MATURITIES,
  FUTURE_BET_PROMOTION_REQUIREMENTS,
} from "./types";

export function isValidIsoDate(value: string): boolean {
  if (!value.trim()) return false;
  return Number.isFinite(Date.parse(value));
}

export function validateFutureBetCreate(
  input: FutureBetCreateInput,
): FutureBetValidationResult {
  const issues: string[] = [];

  if (!input.id.trim()) issues.push("id required");
  if (!input.title.trim()) issues.push("title required");
  if (!input.strategicIdea.trim()) issues.push("strategicIdea required");
  if (!input.opportunity.trim()) issues.push("opportunity required");
  if (!input.problemAddressed.trim()) issues.push("problemAddressed required");
  if (!input.whyKxdBelievesInIt.trim()) issues.push("whyKxdBelievesInIt required");
  if (!input.expectedLongTermValue.trim()) {
    issues.push("expectedLongTermValue required");
  }
  if (!input.belief.trim()) issues.push("belief required");
  if (!input.valueHypothesis.trim()) issues.push("valueHypothesis required");
  if (!input.reviewPolicy.trim()) issues.push("reviewPolicy required");
  if (!input.summary.trim()) issues.push("summary required");
  if (!input.ownerRole) issues.push("ownerRole required");
  if (!input.betConfidence) issues.push("betConfidence required");

  if (!(FUTURE_BET_CATEGORIES as readonly string[]).includes(input.category)) {
    issues.push("category must be from closed vocabulary");
  }
  if (!(FUTURE_BET_MATURITIES as readonly string[]).includes(input.maturity)) {
    issues.push("maturity must be from closed maturity model");
  }

  if (!isValidIsoDate(input.recordedAt)) {
    issues.push("recordedAt must be valid ISO-8601");
  }

  if (input.evidenceIds.length === 0) {
    issues.push("evidenceIds required");
  }
  if (input.relatedProductDnaIds.length === 0) {
    issues.push("relatedProductDnaIds required");
  }
  if (input.relatedDecisionIds.length === 0) {
    issues.push("relatedDecisionIds required — Decision Archive linkage");
  }
  if (input.relatedEvolutionIds.length === 0) {
    issues.push("relatedEvolutionIds required");
  }
  if (input.relatedInventoryIds.length === 0) {
    issues.push("relatedInventoryIds required");
  }
  if (input.relatedHealthDomainIds.length === 0) {
    issues.push("relatedHealthDomainIds required");
  }

  // Maturity "approved" is still not roadmap — structural flags remain false.
  if (input.maturity === "approved" && input.evidenceIds.length === 0) {
    issues.push("approved maturity still requires evidence");
  }

  return { ok: issues.length === 0, issues };
}

export function createFutureBetObject(
  input: FutureBetCreateInput,
): FutureBetObject {
  const validation = validateFutureBetCreate(input);
  if (!validation.ok) {
    throw new Error(`Invalid Future Bet: ${validation.issues.join("; ")}`);
  }

  return {
    id: input.id,
    type: "future_bet",
    title: input.title,
    status: "believed",
    ownerRole: input.ownerRole,
    createdAt: input.recordedAt,
    lastReviewedAt: input.recordedAt,
    nextReviewAt: null,
    evidenceIds: [...input.evidenceIds],
    relatedObjectIds: [
      ...input.relatedProductDnaIds,
      ...input.relatedDecisionIds,
      ...input.relatedEvolutionIds,
      ...input.relatedInventoryIds,
      ...input.relatedHealthDomainIds.map((id) => `health:${id}`),
    ],
    confidence: "declared",
    summary: input.summary,
    detail: {
      belief: input.belief,
      valueHypothesis: input.valueHypothesis,
      approved: EMPTY_FUTURE_BET_FLAGS.approved,
      scheduled: EMPTY_FUTURE_BET_FLAGS.scheduled,
      promotionRequiresDecision: EMPTY_FUTURE_BET_FLAGS.promotionRequiresDecision,
      neverAutoPromotesToRoadmap:
        EMPTY_FUTURE_BET_FLAGS.neverAutoPromotesToRoadmap,
      category: input.category,
      maturity: input.maturity,
      strategicIdea: input.strategicIdea,
      opportunity: input.opportunity,
      problemAddressed: input.problemAddressed,
      whyKxdBelievesInIt: input.whyKxdBelievesInIt,
      expectedLongTermValue: input.expectedLongTermValue,
      betConfidence: input.betConfidence,
      reviewPolicy: input.reviewPolicy,
      relatedProductDnaIds: [...input.relatedProductDnaIds],
      relatedDecisionIds: [...input.relatedDecisionIds],
      relatedEvolutionIds: [...input.relatedEvolutionIds],
      relatedHealthDomainIds: [...input.relatedHealthDomainIds],
      relatedInventoryIds: [...input.relatedInventoryIds],
      promotionRequirements: { ...FUTURE_BET_PROMOTION_REQUIREMENTS },
      recordedAt: input.recordedAt,
    },
    updateChannel: "manual_approval",
    version: "0.1.0",
  };
}

/**
 * Promotion law: Future Bets never become roadmap automatically.
 * Evidence + Decision + review + approval required to promote toward Decision.
 */
export function validateFutureBetPromotion(
  attempt: FutureBetPromotionAttempt,
): FutureBetValidationResult {
  const issues: string[] = [];

  if (attempt.target === "roadmap_item") {
    issues.push(
      "Future Bets never promote directly to roadmap_item — Decision Archive required first",
    );
  }

  if (attempt.evidenceIds.length === 0) {
    issues.push("promotion requires evidence");
  }
  if (!attempt.decisionId) {
    issues.push("promotion requires Decision Archive entry");
  }
  if (!attempt.reviewed) {
    issues.push("promotion requires review");
  }
  if (!attempt.approved) {
    issues.push("promotion requires approval");
  }

  return { ok: issues.length === 0, issues };
}

export function createEmptyFutureBetsTimeline(): FutureBetTimelineModel {
  return {
    ordering: "recorded_at_asc",
    orderedEntryIds: [],
    groups: [],
    lookupById: {},
  };
}

export function buildFutureBetsTimeline(
  entries: Array<{
    id: string;
    recordedAt: string;
    category: string;
    maturity: string;
  }>,
  ordering: FutureBetTimelineModel["ordering"] = "recorded_at_asc",
): FutureBetTimelineModel {
  const sorted = [...entries].sort((a, b) => {
    const delta = Date.parse(a.recordedAt) - Date.parse(b.recordedAt);
    return ordering === "recorded_at_asc" ? delta : -delta;
  });

  const orderedEntryIds = sorted.map((e) => e.id);
  const lookupById: Record<string, number> = {};
  orderedEntryIds.forEach((id, index) => {
    lookupById[id] = index;
  });

  const byYear = new Map<string, string[]>();
  const byCategory = new Map<string, string[]>();
  const byMaturity = new Map<string, string[]>();
  for (const entry of sorted) {
    const year = entry.recordedAt.slice(0, 4) || "unknown";
    byYear.set(year, [...(byYear.get(year) ?? []), entry.id]);
    byCategory.set(entry.category, [
      ...(byCategory.get(entry.category) ?? []),
      entry.id,
    ]);
    byMaturity.set(entry.maturity, [
      ...(byMaturity.get(entry.maturity) ?? []),
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
      ...[...byCategory.entries()].map(([key, entryIds]) => ({
        key,
        kind: "by_category" as const,
        entryIds,
      })),
      ...[...byMaturity.entries()].map(([key, entryIds]) => ({
        key,
        kind: "by_maturity" as const,
        entryIds,
      })),
    ],
    lookupById,
  };
}

export function findDuplicateFutureBetIds(entries: FutureBetObject[]): string[] {
  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const entry of entries) {
    if (seen.has(entry.id)) dupes.push(entry.id);
    seen.add(entry.id);
  }
  return dupes;
}

export function findDuplicateStrategicIdeas(
  entries: FutureBetObject[],
): string[] {
  const seen = new Map<string, string>();
  const dupes: string[] = [];
  for (const entry of entries) {
    const signature = entry.detail.strategicIdea.trim().toLowerCase();
    if (seen.has(signature)) dupes.push(entry.id);
    else seen.set(signature, entry.id);
  }
  return dupes;
}

/**
 * Detect conflicting strategic directions: same category + opposing titles
 * with identical problemAddressed and opposite belief framing is out of scope
 * without NLP. Contract-level conflict = duplicate strategic idea already covered;
 * additional conflict = same category + same problemAddressed with different IDs.
 */
export function findConflictingStrategicDirections(
  entries: FutureBetObject[],
): string[] {
  const seen = new Map<string, string>();
  const conflicts: string[] = [];
  for (const entry of entries) {
    const signature = [
      entry.detail.category,
      entry.detail.problemAddressed.trim().toLowerCase(),
    ].join("|");
    const prior = seen.get(signature);
    if (prior && prior !== entry.id) {
      // Only conflict when strategic ideas differ under the same problem.
      const priorEntry = entries.find((e) => e.id === prior);
      if (
        priorEntry &&
        priorEntry.detail.strategicIdea.trim().toLowerCase() !==
          entry.detail.strategicIdea.trim().toLowerCase()
      ) {
        conflicts.push(entry.id);
      }
    } else {
      seen.set(signature, entry.id);
    }
  }
  return conflicts;
}

export function findOrphanFutureBets(entries: FutureBetObject[]): string[] {
  return entries
    .filter(
      (entry) =>
        entry.evidenceIds.length === 0 ||
        entry.detail.relatedProductDnaIds.length === 0 ||
        entry.detail.relatedDecisionIds.length === 0 ||
        entry.detail.relatedEvolutionIds.length === 0 ||
        entry.detail.relatedInventoryIds.length === 0 ||
        entry.detail.relatedHealthDomainIds.length === 0 ||
        entry.detail.scheduled !== false ||
        entry.detail.neverAutoPromotesToRoadmap !== true,
    )
    .map((entry) => entry.id);
}

export function chronologyIsValid(entries: FutureBetObject[]): boolean {
  return entries.every((entry) => isValidIsoDate(entry.detail.recordedAt));
}
