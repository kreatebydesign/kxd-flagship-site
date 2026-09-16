/**
 * Commercial relationship classification — multi-category, derived + explicit.
 * Clients.status=active is NOT automatically authoritative commercial universe.
 */

import { parseCommercialMarkers } from "./markers";
import type { CommercialCategory, PricingClassification } from "./types";
import { COMMERCIAL_CATEGORIES, PRICING_CLASSIFICATIONS } from "./types";

export type ClassifyCommercialInput = {
  clientStatus: string | null | undefined;
  /** Explicit categories from Clients.commercialCategories JSON when present. */
  explicitCategories?: unknown;
  pricingClassification?: unknown;
  commercialNotes?: string | null;
  activeMrrCents: number;
  pendingMrrCents: number;
  projectOpenCents: number;
  hasPerformanceRule: boolean;
  hasAnnualOnlyAuthority: boolean;
  hasPipelineEvidence: boolean;
};

function asCategoryList(raw: unknown): CommercialCategory[] {
  if (!Array.isArray(raw)) return [];
  const out: CommercialCategory[] = [];
  for (const item of raw) {
    if (typeof item === "string" && (COMMERCIAL_CATEGORIES as readonly string[]).includes(item)) {
      out.push(item as CommercialCategory);
    }
  }
  return out;
}

export function parsePricingClassification(raw: unknown): PricingClassification | null {
  if (typeof raw !== "string") return null;
  return (PRICING_CLASSIFICATIONS as readonly string[]).includes(raw)
    ? (raw as PricingClassification)
    : null;
}

/**
 * Merge explicit operator categories with derived signals.
 * Explicit review_required always wins into the set.
 * Does not invent active_recurring without MRR evidence.
 */
export function classifyCommercialRelationship(
  input: ClassifyCommercialInput,
): CommercialCategory[] {
  const set = new Set<CommercialCategory>(asCategoryList(input.explicitCategories));

  if (input.activeMrrCents > 0) set.add("active_recurring");
  if (input.projectOpenCents > 0) set.add("active_project");
  if (input.hasPerformanceRule) set.add("performance");
  if (input.hasAnnualOnlyAuthority && input.activeMrrCents <= 0 && input.projectOpenCents <= 0) {
    set.add("annual_only");
  }
  if (input.hasPipelineEvidence || input.clientStatus === "prospect") {
    // Prospect with active commercial truth should not stay pipeline-only —
    // active_* categories above still apply; pipeline remains if explicitly set
    // or no active commercial signals yet.
    if (input.activeMrrCents <= 0 && input.projectOpenCents <= 0 && input.pendingMrrCents <= 0) {
      set.add("pipeline");
    }
  }
  if (input.clientStatus === "archived") set.add("historical");

  const markers = parseCommercialMarkers(input.commercialNotes);
  if (markers.some((m) => m.kind === "review-required")) set.add("review_required");

  // Active status alone is insufficient — if no commercial signal, review.
  if (
    input.clientStatus === "active" &&
    input.activeMrrCents <= 0 &&
    input.pendingMrrCents <= 0 &&
    input.projectOpenCents <= 0 &&
    !input.hasPerformanceRule &&
    !input.hasAnnualOnlyAuthority &&
    !input.hasPipelineEvidence
  ) {
    set.add("review_required");
  }

  return [...set];
}

export function pricingClassificationFromNotes(
  notes: string | null | undefined,
): PricingClassification | null {
  const marker = parseCommercialMarkers(notes).find((m) => m.kind === "pricing-class");
  if (!marker) return null;
  return parsePricingClassification(marker.fields.class ?? null);
}
