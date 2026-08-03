/**
 * Hall of Fame validation, chronology, and integrity helpers (P0-H).
 */

import type { HallOfFameObject } from "../contracts";
import type {
  HallOfFameCreateInput,
  HallOfFameTimelineModel,
  HallOfFameValidationResult,
} from "./types";
import {
  HALL_OF_FAME_CATEGORIES,
  HALL_OF_FAME_QUALIFICATION_CLASSES,
} from "./types";

export function isValidIsoDate(value: string): boolean {
  if (!value.trim()) return false;
  return Number.isFinite(Date.parse(value));
}

export function validateHallOfFameCreate(
  input: HallOfFameCreateInput,
): HallOfFameValidationResult {
  const issues: string[] = [];

  if (!input.id.trim()) issues.push("id required");
  if (!input.title.trim()) issues.push("title required");
  if (!input.milestone.trim()) issues.push("milestone required");
  if (!input.whyItMattered.trim()) issues.push("whyItMattered required");
  if (!input.whatChanged.trim()) issues.push("whatChanged required");
  if (!input.longTermImpact.trim()) issues.push("longTermImpact required");
  if (!input.lessonsLearned.trim()) issues.push("lessonsLearned required");
  if (!input.whatItTeaches.trim()) issues.push("whatItTeaches required");
  if (!input.whatFutureBuildersShouldRemember.trim()) {
    issues.push("whatFutureBuildersShouldRemember required");
  }
  if (!input.whatShouldNeverBeForgotten.trim()) {
    issues.push("whatShouldNeverBeForgotten required");
  }
  if (!input.whyThisChangedKxdForever.trim()) {
    issues.push("whyThisChangedKxdForever required");
  }
  if (!input.reviewPolicy.trim()) issues.push("reviewPolicy required");
  if (!input.summary.trim()) issues.push("summary required");
  if (!input.ownerRole) issues.push("ownerRole required");
  if (!input.fameConfidence) issues.push("fameConfidence required");

  if (!(HALL_OF_FAME_CATEGORIES as readonly string[]).includes(input.category)) {
    issues.push("category must be from closed vocabulary");
  }
  if (
    !(HALL_OF_FAME_QUALIFICATION_CLASSES as readonly string[]).includes(
      input.qualificationClass,
    )
  ) {
    issues.push("qualificationClass must demonstrate long-term significance");
  }

  if (!isValidIsoDate(input.milestoneDate)) {
    issues.push("milestoneDate must be valid ISO-8601");
  }

  if (input.evidenceIds.length === 0) {
    issues.push("evidenceIds required — Hall of Fame entries require evidence");
  }
  if (input.relatedDecisionIds.length === 0) {
    issues.push("relatedDecisionIds required — Decision Archive linkage");
  }
  if (input.relatedEvolutionIds.length === 0) {
    issues.push("relatedEvolutionIds required — Product Evolution linkage");
  }
  if (input.relatedProductDnaIds.length === 0) {
    issues.push("relatedProductDnaIds required");
  }
  if (input.relatedInventoryIds.length === 0) {
    issues.push("relatedInventoryIds required");
  }
  if (input.relatedHealthDomainIds.length === 0) {
    issues.push("relatedHealthDomainIds required");
  }

  return { ok: issues.length === 0, issues };
}

export function createHallOfFameObject(
  input: HallOfFameCreateInput,
): HallOfFameObject {
  const validation = validateHallOfFameCreate(input);
  if (!validation.ok) {
    throw new Error(`Invalid Hall of Fame entry: ${validation.issues.join("; ")}`);
  }

  return {
    id: input.id,
    type: "hall_of_fame",
    title: input.title,
    status: "active",
    ownerRole: input.ownerRole,
    createdAt: input.milestoneDate,
    lastReviewedAt: input.milestoneDate,
    nextReviewAt: null,
    evidenceIds: [...input.evidenceIds],
    relatedObjectIds: [
      ...input.relatedDecisionIds,
      ...input.relatedEvolutionIds,
      ...input.relatedReleaseIds,
      ...input.relatedProductDnaIds,
      ...input.relatedInventoryIds,
      ...input.relatedHealthDomainIds.map((id) => `health:${id}`),
    ],
    confidence: "declared",
    summary: input.summary,
    detail: {
      whyItMattered: input.whyItMattered,
      whatChanged: input.whatChanged,
      whatItTeaches: input.whatItTeaches,
      occurredAt: input.milestoneDate,
      relatedReleaseIds: [...input.relatedReleaseIds],
      relatedDecisionIds: [...input.relatedDecisionIds],
      category: input.category,
      qualificationClass: input.qualificationClass,
      milestone: input.milestone,
      longTermImpact: input.longTermImpact,
      lessonsLearned: input.lessonsLearned,
      milestoneDate: input.milestoneDate,
      relatedEvolutionIds: [...input.relatedEvolutionIds],
      relatedProductDnaIds: [...input.relatedProductDnaIds],
      relatedInventoryIds: [...input.relatedInventoryIds],
      relatedHealthDomainIds: [...input.relatedHealthDomainIds],
      whatFutureBuildersShouldRemember: input.whatFutureBuildersShouldRemember,
      whatShouldNeverBeForgotten: input.whatShouldNeverBeForgotten,
      whyThisChangedKxdForever: input.whyThisChangedKxdForever,
      fameConfidence: input.fameConfidence,
      reviewPolicy: input.reviewPolicy,
    },
    updateChannel: "manual_approval",
    version: "0.1.0",
  };
}

export function createEmptyHallOfFameTimeline(): HallOfFameTimelineModel {
  return {
    ordering: "milestone_date_asc",
    orderedEntryIds: [],
    groups: [],
    lookupById: {},
  };
}

/**
 * Chronology helper for future browsing — no UI, no visualization.
 */
export function buildHallOfFameTimeline(
  entries: Array<{
    id: string;
    milestoneDate: string;
    category: string;
    qualificationClass: string;
  }>,
  ordering: HallOfFameTimelineModel["ordering"] = "milestone_date_asc",
): HallOfFameTimelineModel {
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
  const byCategory = new Map<string, string[]>();
  const byQualification = new Map<string, string[]>();
  for (const entry of sorted) {
    const year = entry.milestoneDate.slice(0, 4) || "unknown";
    byYear.set(year, [...(byYear.get(year) ?? []), entry.id]);
    byCategory.set(entry.category, [
      ...(byCategory.get(entry.category) ?? []),
      entry.id,
    ]);
    byQualification.set(entry.qualificationClass, [
      ...(byQualification.get(entry.qualificationClass) ?? []),
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
      ...[...byQualification.entries()].map(([key, entryIds]) => ({
        key,
        kind: "by_qualification" as const,
        entryIds,
      })),
    ],
    lookupById,
  };
}

export function findDuplicateHallOfFameIds(entries: HallOfFameObject[]): string[] {
  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const entry of entries) {
    if (seen.has(entry.id)) dupes.push(entry.id);
    seen.add(entry.id);
  }
  return dupes;
}

export function findDuplicateHallOfFameSignatures(
  entries: HallOfFameObject[],
): string[] {
  const seen = new Map<string, string>();
  const dupes: string[] = [];
  for (const entry of entries) {
    const signature = [
      entry.detail.category,
      entry.detail.qualificationClass,
      entry.detail.milestoneDate,
      entry.title.trim().toLowerCase(),
    ].join("|");
    if (seen.has(signature)) dupes.push(entry.id);
    else seen.set(signature, entry.id);
  }
  return dupes;
}

export function findOrphanHallOfFameEntries(
  entries: HallOfFameObject[],
): string[] {
  return entries
    .filter(
      (entry) =>
        entry.evidenceIds.length === 0 ||
        entry.detail.relatedDecisionIds.length === 0 ||
        entry.detail.relatedEvolutionIds.length === 0 ||
        entry.detail.relatedProductDnaIds.length === 0 ||
        entry.detail.relatedInventoryIds.length === 0 ||
        entry.detail.relatedHealthDomainIds.length === 0,
    )
    .map((entry) => entry.id);
}

export function chronologyIsValid(entries: HallOfFameObject[]): boolean {
  return entries.every((entry) => isValidIsoDate(entry.detail.milestoneDate));
}
