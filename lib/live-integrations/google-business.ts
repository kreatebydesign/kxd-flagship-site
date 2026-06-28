import "server-only";

import { fetchJson } from "./cache";
import { envValue } from "./status";
import type { NormalizedGoogleBusiness } from "./types";

export async function syncGoogleBusiness(): Promise<{
  normalized: NormalizedGoogleBusiness | null;
  recordsProcessed: number;
  error?: string;
}> {
  const apiKey = envValue("GOOGLE_PLACES_API_KEY");
  const placeId = envValue("GOOGLE_PLACE_ID");

  if (!apiKey || !placeId) {
    return {
      normalized: null,
      recordsProcessed: 0,
      error: "GOOGLE_PLACES_API_KEY and GOOGLE_PLACE_ID required",
    };
  }

  const url = `https://places.googleapis.com/v1/places/${placeId}`;
  const res = await fetchJson<{
    displayName?: { text?: string };
    rating?: number;
    userRatingCount?: number;
  }>(url, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "id,displayName,rating,userRatingCount",
    },
  });

  if (!res.ok) {
    return { normalized: null, recordsProcessed: 0, error: res.error };
  }

  const rating = res.data.rating ?? null;
  const reviewCount = res.data.userRatingCount ?? null;

  return {
    normalized: {
      averageRating: rating,
      reviewCount,
      profileHealth:
        rating != null && rating >= 4
          ? "strong"
          : rating != null
            ? "needs-attention"
            : "unknown",
      searchViews: null,
      calls: null,
      directionRequests: null,
      displayName: res.data.displayName?.text ?? null,
    },
    recordsProcessed: 1,
  };
}

export function isGoogleBusinessConfigured(): boolean {
  return Boolean(envValue("GOOGLE_PLACES_API_KEY") && envValue("GOOGLE_PLACE_ID"));
}
