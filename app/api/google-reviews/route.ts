/**
 * GET /api/google-reviews
 *
 * Debug and cache-inspection endpoint for the Google Reviews integration.
 * Shows current review data (live or fallback), configuration status, and
 * whether credentials are active.
 *
 * Not intended for public use — safe to leave exposed (read-only, no secrets
 * returned, no mutations). Access is informational only.
 *
 * To force a cache refresh after changing credentials or Place ID:
 *   1. Call this endpoint once — it re-fetches the data.
 *   2. Or: redeploy / call `revalidateTag("google-reviews")` via On-Demand ISR.
 */
import { NextResponse } from "next/server";
import { getGoogleReviews, getGoogleReviewsConfig } from "@/lib/google-reviews";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config  = getGoogleReviewsConfig();
    const reviews = await getGoogleReviews();
    const isLive  = reviews.some(r => r.source === "google");

    return NextResponse.json({
      ok:              true,
      source:          isLive ? "google" : "fallback",
      configured:      config.configured,
      credentials: {
        hasApiKey:     config.hasApiKey,
        hasPlaceId:    config.hasPlaceId,
        placeIdHint:   config.placeIdHint,
      },
      cache: {
        ttlSeconds:    config.cacheTtl,
        tag:           "google-reviews",
      },
      filters: {
        minRating:     config.minRating,
        maxReviews:    config.maxReviews,
      },
      reviews: {
        count:         reviews.length,
        data:          reviews,
      },
      activateSteps: config.configured ? null : [
        "1. Add GOOGLE_PLACES_API_KEY to your Vercel environment variables.",
        "2. Add GOOGLE_PLACE_ID (find at https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder).",
        "3. Enable 'Places API' in your Google Cloud Console.",
        "4. Redeploy or wait for ISR to refresh.",
      ],
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
