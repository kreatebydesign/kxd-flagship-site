/**
 * Optional referenced (non-owned) inventory photography.
 * Used when a source already publishes durable public image URLs.
 * Does not upload, copy, or generate media.
 */

export type InventoryReferencedImage = {
  url: string;
  alt: string;
};

export type InventoryReferencedMedia = {
  primary: InventoryReferencedImage | null;
  gallery: InventoryReferencedImage[];
};

const EMPTY: InventoryReferencedMedia = { primary: null, gallery: [] };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function isReusablePrimalWebsiteMediaUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    if (host !== "www.primalmotorsports.com" && host !== "primalmotorsports.com") {
      return false;
    }
    const path = decodeURIComponent(parsed.pathname);
    if (!path.startsWith("/images/primal/")) return false;
    return /\.(jpe?g|png|webp)$/i.test(path);
  } catch {
    return false;
  }
}

export function normalizeReferencedImage(
  value: unknown,
  allow: (url: string) => boolean = isReusablePrimalWebsiteMediaUrl,
): InventoryReferencedImage | null {
  const rec = asRecord(value);
  const url = typeof rec?.url === "string" ? rec.url.trim() : "";
  if (!url || !allow(url)) return null;
  const alt =
    typeof rec?.alt === "string" && rec.alt.trim() ? rec.alt.trim() : "Vehicle photo";
  return { url, alt };
}

export function normalizeReferencedMedia(
  value: unknown,
  allow: (url: string) => boolean = isReusablePrimalWebsiteMediaUrl,
): InventoryReferencedMedia {
  const rec = asRecord(value);
  if (!rec) return EMPTY;
  const primary = normalizeReferencedImage(rec.primary, allow);
  const gallery = Array.isArray(rec.gallery)
    ? rec.gallery
        .map((row) => normalizeReferencedImage(row, allow))
        .filter((row): row is InventoryReferencedImage => Boolean(row))
        .filter((row) => row.url !== primary?.url)
    : [];
  return { primary, gallery };
}
