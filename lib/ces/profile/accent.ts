/**
 * Controlled CES brand expression — decorative brand vs accessible interactive accent.
 */

const INK_ACCENT = "#1c1917";
const PAGE_SURFACE = "#f4f2ee";
const WHITE = "#ffffff";

function parseHex(color: string): { r: number; g: number; b: number } | null {
  const raw = color.trim();
  const hex = raw.startsWith("#") ? raw.slice(1) : raw;
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(hex)) return null;
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((part) => `${part}${part}`)
          .join("")
      : hex;
  const value = Number.parseInt(full, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function channel(value: number): number {
  const scaled = value / 255;
  return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

function luminance(color: string): number | null {
  const rgb = parseHex(color);
  if (!rgb) return null;
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

export function contrastRatio(a: string, b: string): number | null {
  const left = luminance(a);
  const right = luminance(b);
  if (left == null || right == null) return null;
  const lighter = Math.max(left, right);
  const darker = Math.min(left, right);
  return (lighter + 0.05) / (darker + 0.05);
}

export function isSafeCesInteractiveAccent(color: string): boolean {
  const againstPage = contrastRatio(color, PAGE_SURFACE);
  const againstWhite = contrastRatio(color, WHITE);
  if (againstPage == null || againstWhite == null) return false;
  return againstPage >= 4.5 && againstWhite >= 3;
}

/** Brand color for restrained decorative marks. Falls back when unparseable. */
export function resolveCesBrandColor(accentColor: string, fallback = INK_ACCENT): string {
  return parseHex(accentColor) ? accentColor.trim() : fallback;
}

/**
 * Interactive accent used for text, focus, and selected nav.
 * Unsafe brand colors stay decorative only.
 */
export function resolveCesInteractiveAccent(
  accentColor: string,
  fallback = INK_ACCENT,
): string {
  const candidate = accentColor.trim();
  if (isSafeCesInteractiveAccent(candidate)) return candidate;
  return fallback;
}
