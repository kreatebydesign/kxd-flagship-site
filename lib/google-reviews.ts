/**
 * lib/google-reviews.ts
 *
 * Google Business Profile reviews integration layer.
 * Uses the Places API (New) — requires only an API key, no OAuth.
 *
 * Endpoint:
 *   GET https://places.googleapis.com/v1/places/{GOOGLE_PLACE_ID}
 *   Headers:
 *     X-Goog-Api-Key:   <GOOGLE_PLACES_API_KEY>
 *     X-Goog-FieldMask: id,displayName,rating,userRatingCount,reviews
 *
 * Environment variables required (all optional — falls back to PLACEHOLDER_REVIEWS):
 *   GOOGLE_PLACES_API_KEY  — Google Cloud API key with "Places API (New)" enabled
 *   GOOGLE_PLACE_ID        — Google Maps Place ID for the KXD business listing
 *                            Find yours: https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder
 *
 * Caching:
 *   Responses are cached at the Next.js data cache layer for CACHE_TTL seconds
 *   (default 3600s / 1 hour). The page becomes ISR when credentials are active.
 *   During build, if credentials are absent, no fetch is made and the page
 *   renders as fully static with fallback reviews — zero build impact.
 *
 * Safety:
 *   Any failure (missing credentials, network error, bad API response, empty
 *   results after filtering) silently returns PLACEHOLDER_REVIEWS so the site
 *   never breaks or shows blank content.
 */

import { PLACEHOLDER_REVIEWS, getAggregateRating, type ReviewItem } from "@/lib/reviews";

/** Cache duration in seconds. 1 hour by default. */
const CACHE_TTL = 3600;

/** Minimum star rating to include a review on the page. */
const MIN_RATING = 4;

/** Minimum review text length to display (filters noise / empty reviews). */
const MIN_TEXT_LENGTH = 20;

/** Maximum number of reviews to show. Places API (New) returns up to 5. */
const MAX_REVIEWS = 5;

// ── Places API (New) response types ──────────────────────────────────────────

interface PlacesNewReview {
  name:                         string;   // "places/{placeId}/reviews/{reviewId}"
  relativePublishTimeDescription?: string;
  rating:                       number;
  text?: {
    text:         string;
    languageCode: string;
  };
  originalText?: {
    text:         string;
    languageCode: string;
  };
  authorAttribution?: {
    displayName: string;
    uri?:        string;
    photoUri?:   string;
  };
  publishTime?: string;          // ISO 8601, e.g. "2024-01-15T10:30:00Z"
  flagContentUri?:  string;
  googleMapsUri?:   string;
}

interface PlacesNewResponse {
  id?:              string;
  displayName?: {
    text:         string;
    languageCode: string;
  };
  rating?:          number;
  userRatingCount?: number;
  reviews?:         PlacesNewReview[];
}

interface PlacesNewError {
  error?: {
    code:    number;
    message: string;
    status:  string;    // e.g. "PERMISSION_DENIED", "NOT_FOUND"
    details?: unknown[];
  };
}

// ── Debug types ───────────────────────────────────────────────────────────────

export interface GoogleReviewsDebugInfo {
  configured:              boolean;
  apiKeyMasked:            string | null;
  placeIdHint:             string | null;
  httpStatus:              number | null;
  httpOk:                  boolean | null;
  googleStatus:            string | null;   // error.status or "OK"
  googleMessage:           string | null;
  placeName:               string | null;
  placeRating:             number | null;
  totalRatings:            number | null;
  hasReviewsArray:         boolean | null;
  reviewCountFromGoogle:   number | null;
  reviewCountAfterFilter:  number | null;
  resultKeys:              string[] | null;
  likelyCause:             string | null;
  fetchError:              string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function maskApiKey(key: string): string {
  if (key.length <= 11) return "***";
  return `${key.slice(0, 8)}...${key.slice(-3)}`;
}

function deriveLikelyCause(
  httpStatus:    number | null,
  googleStatus:  string | null,
  googleMessage: string | null,
  hasReviews:    boolean | null,
  reviewCount:   number | null,
): string {
  if (!httpStatus) return "Network error — fetch never completed.";

  // HTTP-level errors from Places API (New)
  if (httpStatus === 400) return "Bad request — check that GOOGLE_PLACE_ID is a valid Places API (New) Place ID.";
  if (httpStatus === 401) return "Unauthorized — GOOGLE_PLACES_API_KEY is invalid or missing.";
  if (httpStatus === 403) {
    const msg = googleMessage?.toLowerCase() ?? "";
    if (msg.includes("billing")) return "Billing not enabled on the Google Cloud project.";
    if (msg.includes("not been used") || msg.includes("not enabled"))
      return "Places API (New) is not enabled — go to Google Cloud Console → APIs & Services → Enable 'Places API (New)'.";
    return `Permission denied — ${googleMessage ?? "check API key restrictions and project billing."}`;
  }
  if (httpStatus === 404) return "Place not found — GOOGLE_PLACE_ID may be incorrect or the listing has been removed.";
  if (httpStatus === 429) return "Quota exceeded — daily limit hit or billing threshold reached.";
  if (httpStatus !== 200) return `HTTP ${httpStatus} error — ${googleMessage ?? "check API key and Place ID."}`;

  // HTTP 200 — issue is with the data itself
  if (googleStatus !== "OK") return `Unexpected status: "${googleStatus}" — ${googleMessage ?? "no further detail."}`;
  if (hasReviews === false || reviewCount === 0)
    return "Place resolved successfully but has no reviews, OR the reviews field was not returned. Ensure 'Places API (New)' is enabled (not the legacy Places API).";
  return "Reviews returned but all were filtered out (rating below threshold or text too short).";
}

// ── Normalization ─────────────────────────────────────────────────────────────

function normalizeReview(r: PlacesNewReview, index: number): ReviewItem {
  // Prefer originalText (reviewer's language) over translated text.
  const reviewText = (r.originalText?.text ?? r.text?.text ?? "").trim();
  const author     = r.authorAttribution?.displayName ?? "Anonymous";
  // Use publishTime ISO string as a stable ID seed, falling back to index.
  const idSeed     = r.publishTime ?? String(index);

  return {
    id:         `google-${idSeed.replace(/[^a-z0-9]/gi, "")}-${index}`,
    author,
    company:    "",        // Places API doesn't expose reviewer company
    rating:     r.rating,
    text:       reviewText,
    source:     "google",
    externalId: r.name,    // "places/{placeId}/reviews/{reviewId}"
  };
}

// ── Internal fetch (shared by getGoogleReviews + debug endpoint) ──────────────

interface FetchResult {
  reviews:    ReviewItem[];
  isFallback: boolean;
  debug:      GoogleReviewsDebugInfo;
}

async function _fetchFromPlacesAPI(bypassCache = false): Promise<FetchResult> {
  const apiKey  = process.env.GOOGLE_PLACES_API_KEY?.trim();
  const placeId = process.env.GOOGLE_PLACE_ID?.trim();

  const baseDebug: GoogleReviewsDebugInfo = {
    configured:             Boolean(apiKey && placeId),
    apiKeyMasked:           apiKey  ? maskApiKey(apiKey)        : null,
    placeIdHint:            placeId ? `${placeId.slice(0, 8)}…` : null,
    httpStatus:             null,
    httpOk:                 null,
    googleStatus:           null,
    googleMessage:          null,
    placeName:              null,
    placeRating:            null,
    totalRatings:           null,
    hasReviewsArray:        null,
    reviewCountFromGoogle:  null,
    reviewCountAfterFilter: null,
    resultKeys:             null,
    likelyCause:            null,
    fetchError:             null,
  };

  if (!apiKey || !placeId) {
    return {
      reviews:    PLACEHOLDER_REVIEWS,
      isFallback: true,
      debug: {
        ...baseDebug,
        likelyCause: "Credentials not configured — GOOGLE_PLACES_API_KEY or GOOGLE_PLACE_ID is missing.",
      },
    };
  }

  try {
    const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;

    const fetchOptions: RequestInit = {
      method: "GET",
      headers: {
        "X-Goog-Api-Key":   apiKey,
        "X-Goog-FieldMask": "id,displayName,rating,userRatingCount,reviews",
        "Accept":           "application/json",
      },
      ...(bypassCache
        ? { cache: "no-store" as const }
        : { next: { revalidate: CACHE_TTL, tags: ["google-reviews"] } }),
    };

    const res = await fetch(url, fetchOptions);

    baseDebug.httpStatus = res.status;
    baseDebug.httpOk     = res.ok;

    // Attempt to parse JSON regardless of status — error body is always JSON.
    let json: PlacesNewResponse & PlacesNewError;
    try {
      json = await res.json();
    } catch {
      const rawText = await res.text().catch(() => "(unreadable)");
      console.warn(`[KXD GOOGLE REVIEWS DEBUG] HTTP ${res.status} non-JSON body: ${rawText.slice(0, 300)}`);
      return {
        reviews:    PLACEHOLDER_REVIEWS,
        isFallback: true,
        debug: {
          ...baseDebug,
          likelyCause: deriveLikelyCause(res.status, null, null, null, null),
        },
      };
    }

    // Extract error detail (present on non-200 responses)
    const errorStatus  = json.error?.status  ?? null;
    const errorMessage = json.error?.message ?? null;

    baseDebug.googleStatus  = res.ok ? "OK" : (errorStatus ?? `HTTP_${res.status}`);
    baseDebug.googleMessage = errorMessage;
    baseDebug.resultKeys    = Object.keys(json);

    // Populate place metadata from success response
    if (res.ok) {
      baseDebug.placeName       = json.displayName?.text     ?? null;
      baseDebug.placeRating     = json.rating                ?? null;
      baseDebug.totalRatings    = json.userRatingCount        ?? null;
      baseDebug.hasReviewsArray = Array.isArray(json.reviews);
      baseDebug.reviewCountFromGoogle = json.reviews?.length ?? 0;
    }

    console.info(
      `[KXD GOOGLE REVIEWS DEBUG] httpStatus=${res.status} `
      + `placeName=${json.displayName?.text} `
      + `placeRating=${json.rating} totalRatings=${json.userRatingCount} `
      + `reviewsInResponse=${json.reviews?.length ?? "none"} `
      + `errorStatus=${errorStatus ?? "none"} errorMessage=${errorMessage ?? "none"}`
    );

    if (!res.ok) {
      return {
        reviews:    PLACEHOLDER_REVIEWS,
        isFallback: true,
        debug: {
          ...baseDebug,
          likelyCause: deriveLikelyCause(res.status, errorStatus, errorMessage, null, null),
        },
      };
    }

    const rawReviews = json.reviews ?? [];

    const filtered = rawReviews
      .filter(r => {
        const text = (r.originalText?.text ?? r.text?.text ?? "").trim();
        return r.rating >= MIN_RATING && text.length >= MIN_TEXT_LENGTH;
      })
      .slice(0, MAX_REVIEWS)
      .map(normalizeReview);

    baseDebug.reviewCountAfterFilter = filtered.length;

    if (filtered.length === 0) {
      baseDebug.likelyCause = deriveLikelyCause(
        res.status, "OK", null, baseDebug.hasReviewsArray, baseDebug.reviewCountFromGoogle
      );
      console.info("[KXD GOOGLE REVIEWS DEBUG] No reviews passed filter — using fallback.");
      return { reviews: PLACEHOLDER_REVIEWS, isFallback: true, debug: baseDebug };
    }

    return { reviews: filtered, isFallback: false, debug: baseDebug };

  } catch (err) {
    const errStr = String(err);
    console.warn("[KXD GOOGLE REVIEWS DEBUG] Fetch threw:", errStr);
    return {
      reviews:    PLACEHOLDER_REVIEWS,
      isFallback: true,
      debug: {
        ...baseDebug,
        fetchError:  errStr,
        likelyCause: `Fetch exception: ${errStr}`,
      },
    };
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns Google Business Profile reviews, or PLACEHOLDER_REVIEWS if anything
 * fails or credentials are not configured.
 *
 * Called from ReviewsSection (async server component). Cached per Next.js
 * data cache (1h revalidation) — will not hit the API on every request.
 * When credentials are absent, returns PLACEHOLDER_REVIEWS without any fetch.
 */
export async function getGoogleReviews(): Promise<ReviewItem[]> {
  const { reviews } = await _fetchFromPlacesAPI(false);
  return reviews;
}

/**
 * Returns both reviews and full diagnostic information.
 * Bypasses the Next.js data cache so the debug endpoint always gets fresh data.
 * Used exclusively by /api/google-reviews.
 */
export async function getGoogleReviewsWithDebug(): Promise<FetchResult> {
  return _fetchFromPlacesAPI(true);
}

/**
 * Returns static configuration metadata.
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
    apiVersion:   "Places API (New) — places.googleapis.com/v1",
  };
}

// Re-export shared utilities for convenience
export { getAggregateRating } from "@/lib/reviews";
