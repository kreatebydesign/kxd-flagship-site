/**
 * Portal sidebar logo contrast on dark chrome.
 *
 * Presentation-only. Does not invent logo artwork.
 * Prefer a light resting panel for dark wordmarks; never globally invert logos.
 */

export type LogoOnDarkTreatment = "default" | "light-panel";

function normalizeSlug(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

/**
 * Clients whose current brand mark is a dark wordmark and needs a light
 * resting surface on the dark portal sidebar.
 *
 * Expand carefully — light logos must remain on `default`.
 */
const LIGHT_PANEL_SLUGS = new Set([
  "de-bois",
  "de-bois-entertainment",
  "debois",
  "debois-entertainment",
]);

export function isDarkWordmarkClient(input: {
  clientSlug?: string | null;
  clientName?: string | null;
}): boolean {
  const slug = normalizeSlug(input.clientSlug);
  if (slug && [...LIGHT_PANEL_SLUGS].some((key) => slug === key || slug.startsWith(`${key}-`))) {
    return true;
  }
  const name = String(input.clientName ?? "").trim();
  return /de\s*bois/i.test(name);
}

export function resolveLogoOnDarkTreatment(input: {
  clientSlug?: string | null;
  clientName?: string | null;
  configured?: LogoOnDarkTreatment | null;
}): LogoOnDarkTreatment {
  if (input.configured === "light-panel" || input.configured === "default") {
    return input.configured;
  }
  if (isDarkWordmarkClient(input)) return "light-panel";
  return "default";
}
