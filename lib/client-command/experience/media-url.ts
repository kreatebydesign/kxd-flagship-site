/**
 * Resolve a Payload media reference to a usable URL.
 * Handles hydrated docs, filename-only docs, and numeric IDs (no URL).
 */

type MediaLike = {
  id?: unknown;
  url?: unknown;
  filename?: unknown;
  sizes?: Record<string, { url?: unknown } | undefined>;
};

export function relMediaId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number(value.trim());
  if (value && typeof value === "object" && "id" in value) {
    const id = Number((value as { id: unknown }).id);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

export function resolveMediaAssetUrl(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const doc = value as MediaLike;
  const direct = typeof doc.url === "string" ? doc.url.trim() : "";
  if (direct) return direct;
  const sized =
    (typeof doc.sizes?.card?.url === "string" && doc.sizes.card.url.trim()) ||
    (typeof doc.sizes?.thumbnail?.url === "string" && doc.sizes.thumbnail.url.trim()) ||
    "";
  if (sized) return sized;
  const filename = typeof doc.filename === "string" ? doc.filename.trim() : "";
  if (filename) return `/media/${filename.replace(/^\/+/, "")}`;
  return null;
}
