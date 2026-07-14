/**
 * Inventory images use the public Payload `media` collection.
 * Public API responses always return absolute URLs for external site consumption.
 *
 * Origin resolution (production-safe, local-friendly):
 * 1. NEXT_PUBLIC_SITE_URL / NEXT_PUBLIC_SERVER_URL when set
 * 2. https://VERCEL_URL on Vercel
 * 3. http://localhost:3000 outside production
 * 4. SITE.url fallback for production builds without env
 */

import { SITE } from "@/lib/site";

type MediaLike = {
  id?: number | string;
  url?: string | null;
  alt?: string | null;
  filename?: string | null;
  sizes?: Record<string, { url?: string | null } | undefined>;
};

export function resolvePublicMediaOrigin(): string {
  const fromEnv = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_SERVER_URL ||
    ""
  ).trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const vercel = (process.env.VERCEL_URL || "").trim();
  if (vercel) {
    return vercel.startsWith("http") ? vercel.replace(/\/$/, "") : `https://${vercel}`;
  }
  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }
  return SITE.url.replace(/\/$/, "");
}

export function resolveMediaPath(
  value: unknown,
  prefer: "card" | "hero" | "thumbnail" | "original" = "card",
): { id: number; path: string; alt: string } | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return null;
  }
  if (typeof value !== "object") return null;
  const doc = value as MediaLike;
  const id = Number(doc.id);
  if (!Number.isFinite(id)) return null;

  const sized =
    prefer !== "original" ? doc.sizes?.[prefer]?.url : null;
  const path = String(sized || doc.url || "").trim();
  if (!path) return null;

  return {
    id,
    path: path.startsWith("/") ? path : `/${path}`,
    alt: String(doc.alt || doc.filename || "Vehicle photo"),
  };
}

export function toAbsoluteMediaUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${resolvePublicMediaOrigin()}${normalized}`;
}

export function mapPublicImage(
  value: unknown,
  prefer: "card" | "hero" | "thumbnail" | "original" = "card",
): { url: string; alt: string } | null {
  const resolved = resolveMediaPath(value, prefer);
  if (!resolved) return null;
  return {
    url: toAbsoluteMediaUrl(resolved.path),
    alt: resolved.alt,
  };
}
