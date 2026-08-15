/**
 * Review data layer — structured for Google Business Profile sync.
 *
 * Public surfaces must only show verified reviews (source: "google" or
 * curated "manual"). Placeholder/fake testimonials are not served publicly.
 *
 * When GOOGLE_PLACES_API_KEY + GOOGLE_PLACE_ID are configured, reviews are
 * fetched via lib/google-reviews.ts. Until then, public review UI and review
 * schema remain empty.
 */

export type ReviewItem = {
  id: string;
  author: string;
  company: string;
  rating: number;
  text: string;
  source: "placeholder" | "google" | "manual";
  externalId?: string;
};

/** @deprecated Empty by design — do not reintroduce fake public testimonials. */
export const PLACEHOLDER_REVIEWS: ReviewItem[] = [];

/** Public static reviews — empty until verified Google/manual curation is wired. */
export function getPublicReviews(): ReviewItem[] {
  return [];
}

export function getAggregateRating(reviews: ReviewItem[]): number {
  if (!reviews.length) return 0;
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}
