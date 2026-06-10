/**
 * GET /api/google-reviews
 *
 * Debug and cache-inspection endpoint for the Google Reviews integration.
 * Always bypasses the Next.js data cache so you get a live response from Google.
 *
 * When source === "fallback" and credentials are present, the response includes
 * a detailed `diagnosis` block explaining exactly why the integration is falling back.
 *
 * Safe to leave exposed — read-only, API key is masked in all output.
 */
import { NextResponse } from "next/server";
import { getGoogleReviewsWithDebug, getGoogleReviewsConfig } from "@/lib/google-reviews";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config                         = getGoogleReviewsConfig();
    const { reviews, isFallback, debug } = await getGoogleReviewsWithDebug();
    const isLive                         = !isFallback;

    const diagnosis = (isFallback && config.configured)
      ? {
          googleStatus:           debug.googleStatus,
          googleMessage:          debug.googleMessage,
          httpStatus:             debug.httpStatus,
          httpOk:                 debug.httpOk,
          placeName:              debug.placeName,
          placeRating:            debug.placeRating,
          totalRatings:           debug.totalRatings,
          hasReviewsArray:        debug.hasReviewsArray,
          reviewCountFromGoogle:  debug.reviewCountFromGoogle,
          reviewCountAfterFilter: debug.reviewCountAfterFilter,
          resultKeys:             debug.resultKeys,
          fetchError:             debug.fetchError,
          likelyCause:            debug.likelyCause,
        }
      : null;

    return NextResponse.json({
      ok:         true,
      source:     isLive ? "google" : "fallback",
      configured: config.configured,
      credentials: {
        hasApiKey:   config.hasApiKey,
        apiKeyMasked: debug.apiKeyMasked,
        hasPlaceId:  config.hasPlaceId,
        placeIdHint: debug.placeIdHint,
      },
      cache: {
        note:       "This endpoint always bypasses cache — responses here are live.",
        ttlSeconds: config.cacheTtl,
        tag:        "google-reviews",
      },
      filters: {
        minRating:  config.minRating,
        maxReviews: config.maxReviews,
      },
      reviews: {
        count: reviews.length,
        data:  reviews,
      },
      ...(diagnosis && { diagnosis }),
      ...((!config.configured) && {
        activateSteps: [
          "1. Add GOOGLE_PLACES_API_KEY to Vercel env vars (Cloud API key with Places API enabled).",
          "2. Add GOOGLE_PLACE_ID (find at https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder).",
          "3. Enable 'Places API (New)' or 'Places API' in your Google Cloud Console.",
          "4. Redeploy or let ISR refresh.",
        ],
      }),
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
