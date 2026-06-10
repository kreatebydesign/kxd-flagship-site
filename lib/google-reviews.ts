/**
 * lib/google-reviews.ts
 *
 * Google Business Profile reviews integration layer.
 * Uses the Places API (place/details) — requires only an API key, no OAuth.
 *
 * Environment variables required (all optional — falls back to PLACEHOLDER_REVIEWS):
 *   GOOGLE_PLACES_API_KEY  — Google Cloud API key with Places API enabled
 *   GOOGLE_PLACE_ID        — Google Maps Place ID for the KXD business listing
 *                            Find yours: https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder
 *
 * Caching:
 *   Responses are cached at the Next.js data cache layer for CACHE_TTL seconds
 *   (default 3600s / 1 hour). The page regenerates at most once per hour in
 *   production. During build, if credentials are absent, no fetch is made and
 *   the page renders as fully static with fallback reviews.
 *
 * Safety:
 *   Any failure (missing credentials, network error, bad API response, empty
 *   results after filtering) silently returns PLACEHOLDER_REVIEWS so the site
 *   never breaks or shows blank content.
 */

import { PLACEHOLDER_REVIEWS, getAggregateRating, type ReviewItem } from "@/lib/reviews";

/** Cache duration in seconds. 1 hour by default. */
const CACHE_TTL = 3600;

/** Minimum rating to include a Google review on the page. */
const MIN_RATING = 4;

/** Minimum review text length to display (filters noise/empty reviews). */
const MIN_TEXT_LENGTH = 20;

/** Maximum number of reviews to show from Google. */
const MAX_REVIEWS = 5;

// ── Google Places API types ───────────────────────────────────────────────────

interface GooglePlaceReview {
  author_name: string;
  author_url?: string;
  rating: number;
  text: string;
  time: number;
  relative_time_description?: string;
  profile_photo_url?: string;
}

interface GooglePlaceDetailsResult {
  name?: string;
  rating?: number;
  user_ratings_total?: number;
  reviews?: GooglePlaceReview[];
}

interface GooglePlaceDetailsResponse {
  status: string;
  result?: GooglePlaceDetailsResult;
  error_message?: string;
}

// ── Normalization ─────────────────────────────────────────────────────────────

function normalizeGoogleReview(r: GooglePlaceReview, index: number): ReviewItem {
  return {
    id: `google-${r.time}-${index}`,
    author: r.author_name,
    company: "",       // Google reviews don't carry a company name
    rating: r.rating,
    text: r.text.trim(),
    source: "google",
    externalId: String(r.time),
  };
}

// ── Main fetch function ───────────────────────────────────────────────────────

/**
 * Returns Google Business Profile reviews, or PLACEHOLDER_REVIEWS if anything
 * fails or credentials are not configured.
 *
 * Called from ReviewsSection (async server component). Cached per Next.js
 * data cache — will not hit the API on every request.
 */
export async function getGoogleReviews(): Promise<ReviewItem[]> {
  const apiKey  = process.env.GOOGLE_PLACES_API_KEY?.trim();
  const placeId = process.env.GOOGLE_PLACE_ID?.trim();

  if (!apiKey || !placeId) {
    // No credentials configured — return fallback without any network call.
    // This is the expected state until the integration is activated.
    return PLACEHOLDER_REVIEWS;
  }

  try {
    const fields  = "name,rating,user_ratings_total,reviews";
    const sortBy  = "newest"; // newest first
    const url     = `https://maps.googleapis.com/maps/api/place/details/json`
                  + `?place_id=${encodeURIComponent(placeId)}`
                  + `&fields=${encodeURIComponent(fields)}`
                  + `&reviews_sort=${sortBy}`
                  + `&key=${apiKey}`;

    const res = await fetch(url, {
      // Next.js data cache — revalidate every CACHE_TTL seconds.
      // The page becomes ISR (pre-rendered, then refreshed hourly).
      next: { revalidate: CACHE_TTL, tags: ["google-reviews"] },
    });

    if (!res.ok) {
      console.warn(
        `[KXD Google Reviews] HTTP ${res.status} from Places API — using fallback reviews.`
      );
      return PLACEHOLDER_REVIEWS;
    }

    const json: GooglePlaceDetailsResponse = await res.json();

    if (json.status !== "OK") {
      console.warn(
        `[KXD Google Reviews] API status "${json.status}"${json.error_message ? `: ${json.error_message}` : ""} — using fallback reviews.`
      );
      return PLACEHOLDER_REVIEWS;
    }

    const rawReviews = json.result?.reviews ?? [];

    const filtered = rawReviews
      .filter(r => r.rating >= MIN_RATING && r.text?.trim().length >= MIN_TEXT_LENGTH)
      .slice(0, MAX_REVIEWS)
      .map(normalizeGoogleReview);

    if (filtered.length === 0) {
      console.info("[KXD Google Reviews] No qualifying reviews after filtering — using fallback.");
      return PLACEHOLDER_REVIEWS;
    }

    return filtered;
  } catch (err) {
    console.warn("[KXD Google Reviews] Fetch failed:", err, "— using fallback reviews.");
    return PLACEHOLDER_REVIEWS;
  }
}

/**
 * Returns diagnostic information about the Google Reviews configuration.
 * Used by the /api/google-reviews debug endpoint.
 */
export function getGoogleReviewsConfig() {
  const apiKey  = process.env.GOOGLE_PLACES_API_KEY?.trim();
  const placeId = process.env.GOOGLE_PLACE_ID?.trim();
  return {
    configured:   Boolean(apiKey && placeId),
    hasApiKey:    Boolean(apiKey),
    hasPlaceId:   Boolean(placeId),
    placeIdHint:  placeId ? `${placeId.slice(0, 8)}…` : null,
    cacheTtl:     CACHE_TTL,
    minRating:    MIN_RATING,
    maxReviews:   MAX_REVIEWS,
  };
}

// Re-export shared utilities for convenience
export { getAggregateRating } from "@/lib/reviews";
