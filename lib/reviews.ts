/**
 * Review data layer — structured for future Google Business Profile sync.
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

export const PLACEHOLDER_REVIEWS: ReviewItem[] = [
  {
    id: "review-1",
    author: "Team Principal",
    company: "Cusick Morgan Motorsports",
    rating: 5,
    text: "They understood our brand immediately. Clean build, direct communication, no wasted motion.",
    source: "placeholder",
  },
  {
    id: "review-2",
    author: "Operations Lead",
    company: "Primal Motorsports",
    rating: 5,
    text: "Worked directly with Matt throughout. The site reads sharp and serious — exactly what we needed.",
    source: "placeholder",
  },
  {
    id: "review-3",
    author: "Hospitality Director",
    company: "Plate the Umpqua",
    rating: 4.8,
    text: "Our digital presence finally matches the care we put into the guest experience.",
    source: "placeholder",
  },
];

export function getPublicReviews(): ReviewItem[] {
  return PLACEHOLDER_REVIEWS.filter((r) => r.rating >= 4.5);
}

export function getAggregateRating(reviews: ReviewItem[]): number {
  if (!reviews.length) return 0;
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}
