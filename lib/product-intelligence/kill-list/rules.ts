/**
 * Product Kill List validation, chronology, and integrity helpers (P0-I).
 */

import type { ProductKillListObject } from "../contracts";
import type {
  ProductKillListCreateInput,
  ProductKillListTimelineModel,
  ProductKillListValidationResult,
} from "./types";
import {
  PRODUCT_KILL_LIST_CATEGORIES,
  PRODUCT_KILL_LIST_QUALIFICATION_CLASSES,
} from "./types";

export function isValidIsoDate(value: string): boolean {
  if (!value.trim()) return false;
  return Number.isFinite(Date.parse(value));
}

export function validateProductKillListCreate(
  input: ProductKillListCreateInput,
): ProductKillListValidationResult {
  const issues: string[] = [];

  if (!input.id.trim()) issues.push("id required");
  if (!input.title.trim()) issues.push("title required");
  if (!input.rejectedConcept.trim()) issues.push("rejectedConcept required");
  if (!input.problemAttemptedToSolve.trim()) {
    issues.push("problemAttemptedToSolve required");
  }
  if (!input.reasonRejected.trim()) issues.push("reasonRejected required");
  if (input.alternativesConsidered.length === 0) {
    issues.push("alternativesConsidered required");
  }
  if (!input.chosenDirection.trim()) issues.push("chosenDirection required");
  if (!input.tradeoffsAccepted.trim()) issues.push("tradeoffsAccepted required");
  if (!input.longTermProductImpact.trim()) {
    issues.push("longTermProductImpact required");
  }
  if (!input.whatKxdProtects.trim()) issues.push("whatKxdProtects required");
  if (!input.whatKxdRefusesToBecome.trim()) {
    issues.push("whatKxdRefusesToBecome required");
  }
  if (!input.whyRejectionStrengthensProduct.trim()) {
    issues.push("whyRejectionStrengthensProduct required");
  }
  if (!input.reviewPolicy.trim()) issues.push("reviewPolicy required");
  if (!input.summary.trim()) issues.push("summary required");
  if (!input.ownerRole) issues.push("ownerRole required");
  if (!input.killConfidence) issues.push("killConfidence required");

  if (
    !(PRODUCT_KILL_LIST_CATEGORIES as readonly string[]).includes(input.category)
  ) {
    issues.push("category must be from closed vocabulary");
  }
  if (
    !(PRODUCT_KILL_LIST_QUALIFICATION_CLASSES as readonly string[]).includes(
      input.qualificationClass,
    )
  ) {
    issues.push("qualificationClass must be a deliberate strategic rejection");
  }

  if (!isValidIsoDate(input.decisionDate)) {
    issues.push("decisionDate must be valid ISO-8601");
  }

  if (input.evidenceIds.length === 0) {
    issues.push("evidenceIds required");
  }
  if (input.relatedDecisionIds.length === 0) {
    issues.push("relatedDecisionIds required — Decision Archive linkage");
  }
  if (input.relatedProductDnaIds.length === 0) {
    issues.push("relatedProductDnaIds required");
  }
  if (input.relatedEvolutionIds.length === 0) {
    issues.push("relatedEvolutionIds required — Product Evolution linkage");
  }
  if (input.relatedInventoryIds.length === 0) {
    issues.push("relatedInventoryIds required");
  }
  if (input.relatedHealthDomainIds.length === 0) {
    issues.push("relatedHealthDomainIds required");
  }

  return { ok: issues.length === 0, issues };
}

export function createProductKillListObject(
  input: ProductKillListCreateInput,
): ProductKillListObject {
  const validation = validateProductKillListCreate(input);
  if (!validation.ok) {
    throw new Error(
      `Invalid Product Kill List entry: ${validation.issues.join("; ")}`,
    );
  }

  const primaryDecisionId = input.relatedDecisionIds[0] ?? null;

  return {
    id: input.id,
    type: "product_kill_list",
    title: input.title,
    status: "rejected",
    ownerRole: input.ownerRole,
    createdAt: input.decisionDate,
    lastReviewedAt: input.decisionDate,
    nextReviewAt: input.reconsiderAt,
    evidenceIds: [...input.evidenceIds],
    relatedObjectIds: [
      ...input.relatedDecisionIds,
      ...input.relatedProductDnaIds,
      ...input.relatedEvolutionIds,
      ...input.relatedInventoryIds,
      ...input.relatedHealthDomainIds.map((id) => `health:${id}`),
      ...(input.relatedFutureBetId ? [input.relatedFutureBetId] : []),
    ],
    confidence: "declared",
    summary: input.summary,
    detail: {
      idea: input.rejectedConcept,
      reasonRejected: input.reasonRejected,
      reconsiderAt: input.reconsiderAt,
      relatedDecisionId: primaryDecisionId,
      relatedFutureBetId: input.relatedFutureBetId,
      category: input.category,
      qualificationClass: input.qualificationClass,
      rejectedConcept: input.rejectedConcept,
      problemAttemptedToSolve: input.problemAttemptedToSolve,
      alternativesConsidered: [...input.alternativesConsidered],
      chosenDirection: input.chosenDirection,
      tradeoffsAccepted: input.tradeoffsAccepted,
      longTermProductImpact: input.longTermProductImpact,
      decisionDate: input.decisionDate,
      relatedDecisionIds: [...input.relatedDecisionIds],
      relatedProductDnaIds: [...input.relatedProductDnaIds],
      relatedEvolutionIds: [...input.relatedEvolutionIds],
      relatedInventoryIds: [...input.relatedInventoryIds],
      relatedHealthDomainIds: [...input.relatedHealthDomainIds],
      whatKxdProtects: input.whatKxdProtects,
      whatKxdRefusesToBecome: input.whatKxdRefusesToBecome,
      whyRejectionStrengthensProduct: input.whyRejectionStrengthensProduct,
      killConfidence: input.killConfidence,
      reviewPolicy: input.reviewPolicy,
    },
    updateChannel: "manual_approval",
    version: "0.1.0",
  };
}

export function createEmptyKillListTimeline(): ProductKillListTimelineModel {
  return {
    ordering: "decision_date_asc",
    orderedEntryIds: [],
    groups: [],
    lookupById: {},
  };
}

export function buildProductKillListTimeline(
  entries: Array<{
    id: string;
    decisionDate: string;
    category: string;
    qualificationClass: string;
  }>,
  ordering: ProductKillListTimelineModel["ordering"] = "decision_date_asc",
): ProductKillListTimelineModel {
  const sorted = [...entries].sort((a, b) => {
    const delta = Date.parse(a.decisionDate) - Date.parse(b.decisionDate);
    return ordering === "decision_date_asc" ? delta : -delta;
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
    const year = entry.decisionDate.slice(0, 4) || "unknown";
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

export function findDuplicateKillListIds(
  entries: ProductKillListObject[],
): string[] {
  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const entry of entries) {
    if (seen.has(entry.id)) dupes.push(entry.id);
    seen.add(entry.id);
  }
  return dupes;
}

export function findDuplicateRejectedConcepts(
  entries: ProductKillListObject[],
): string[] {
  const seen = new Map<string, string>();
  const dupes: string[] = [];
  for (const entry of entries) {
    const signature = entry.detail.rejectedConcept.trim().toLowerCase();
    if (seen.has(signature)) dupes.push(entry.id);
    else seen.set(signature, entry.id);
  }
  return dupes;
}

export function findOrphanKillListEntries(
  entries: ProductKillListObject[],
): string[] {
  return entries
    .filter(
      (entry) =>
        entry.evidenceIds.length === 0 ||
        entry.detail.relatedDecisionIds.length === 0 ||
        entry.detail.relatedProductDnaIds.length === 0 ||
        entry.detail.relatedEvolutionIds.length === 0 ||
        entry.detail.relatedInventoryIds.length === 0 ||
        entry.detail.relatedHealthDomainIds.length === 0,
    )
    .map((entry) => entry.id);
}

export function chronologyIsValid(entries: ProductKillListObject[]): boolean {
  return entries.every((entry) => isValidIsoDate(entry.detail.decisionDate));
}
