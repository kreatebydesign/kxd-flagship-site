/**
 * Structured commercial markers embedded in commercialNotes / retainer notes.
 * Auditable operator provenance without inventing agreements.
 */

export const COMMERCIAL_MARKER_PREFIX = "kxd-commercial:v1";

export type CommercialMarkerKind =
  | "rate-correction"
  | "planned-mrr-increase"
  | "review-required"
  | "pricing-class"
  | "performance-rule";

export type CommercialMarker = {
  kind: CommercialMarkerKind;
  fields: Record<string, string>;
  raw: string;
};

export function buildCommercialMarker(
  kind: CommercialMarkerKind,
  fields: Record<string, string | number | boolean | null | undefined>,
): string {
  const parts = [`${COMMERCIAL_MARKER_PREFIX}|kind=${kind}`];
  for (const [key, value] of Object.entries(fields)) {
    if (value == null || value === "") continue;
    const safe = String(value).replace(/\|/g, "/").replace(/\s+/g, " ").trim();
    parts.push(`${key}=${safe}`);
  }
  return parts.join("|").slice(0, 900);
}

export function parseCommercialMarkers(text: string | null | undefined): CommercialMarker[] {
  if (!text || typeof text !== "string") return [];
  const out: CommercialMarker[] = [];
  for (const line of text.split(/\n+/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith(COMMERCIAL_MARKER_PREFIX)) continue;
    const fields: Record<string, string> = {};
    let kind: CommercialMarkerKind | null = null;
    for (const part of trimmed.split("|").slice(1)) {
      const eq = part.indexOf("=");
      if (eq <= 0) continue;
      const key = part.slice(0, eq).trim();
      const value = part.slice(eq + 1).trim();
      if (key === "kind") {
        kind = value as CommercialMarkerKind;
      } else {
        fields[key] = value;
      }
    }
    if (!kind) continue;
    out.push({ kind, fields, raw: trimmed });
  }
  return out;
}

export function upsertMarkerInNotes(
  existing: string | null | undefined,
  kind: CommercialMarkerKind,
  fields: Record<string, string | number | boolean | null | undefined>,
): string {
  const marker = buildCommercialMarker(kind, fields);
  const lines = String(existing ?? "")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => {
      if (!l.startsWith(COMMERCIAL_MARKER_PREFIX)) return true;
      const parsed = parseCommercialMarkers(l)[0];
      return !parsed || parsed.kind !== kind;
    });
  lines.push(marker);
  return lines.join("\n");
}
