/**
 * Public app origin for operator-facing links (signing URLs, media, etc.).
 * Production-safe: never defaults to localhost when deployed.
 */

import { SITE } from "./site.ts";

/**
 * Resolve the public HTTPS origin for KXD OS links.
 * Order: explicit override → NEXT_PUBLIC_SITE_URL → NEXT_PUBLIC_SERVER_URL →
 * VERCEL_URL → localhost only outside production → SITE.url fallback.
 */
export function resolveAppPublicOrigin(override?: string | null): string {
  const fromOverride = String(override ?? "").trim();
  if (fromOverride) return fromOverride.replace(/\/$/, "");

  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_SERVER_URL,
    process.env.SITE_URL,
  ];
  for (const raw of candidates) {
    const fromEnv = String(raw ?? "").trim();
    if (!fromEnv || /^\[SENSITIVE\]$/i.test(fromEnv)) continue;
    try {
      const parsed = new URL(fromEnv.includes("://") ? fromEnv : `https://${fromEnv}`);
      if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
        if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
          return parsed.origin;
        }
        // Ignore localhost env when running in production/Vercel.
        continue;
      }
      return parsed.origin;
    } catch {
      /* try next candidate */
    }
  }

  const vercel = (process.env.VERCEL_URL || "").trim();
  if (vercel) {
    return vercel.startsWith("http") ? vercel.replace(/\/$/, "") : `https://${vercel}`;
  }

  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    return "http://localhost:3000";
  }

  // Production must never emit localhost links even if SITE.url was baked with a local env.
  const siteFallback = String(SITE.url ?? "").replace(/\/$/, "");
  if (
    siteFallback &&
    !siteFallback.includes("localhost") &&
    !siteFallback.includes("127.0.0.1") &&
    !/^\[SENSITIVE\]$/i.test(siteFallback)
  ) {
    return siteFallback;
  }
  return "https://www.kreatebydesign.com";
}
