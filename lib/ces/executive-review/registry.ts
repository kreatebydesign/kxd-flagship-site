/**
 * Executive Review pack registry — client-authored packs.
 */

import type { ExecutiveReviewPack } from "./types";
import { PRIMAL_EXECUTIVE_REVIEW_PACK } from "./packs/primal-motorsports";

const BY_SLUG: Record<string, ExecutiveReviewPack> = {
  "primal-motorsports": PRIMAL_EXECUTIVE_REVIEW_PACK,
};

export function listExecutiveReviewPackSlugs(): string[] {
  return Object.keys(BY_SLUG);
}

export function getExecutiveReviewPack(
  clientSlug: string | null | undefined,
): ExecutiveReviewPack | null {
  if (!clientSlug) return null;
  return BY_SLUG[clientSlug] ?? null;
}

export function hasExecutiveReviewPack(clientSlug: string | null | undefined): boolean {
  return Boolean(getExecutiveReviewPack(clientSlug));
}
