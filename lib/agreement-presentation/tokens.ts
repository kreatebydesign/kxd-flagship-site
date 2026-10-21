/**
 * KXD agreement document presentation tokens — HTML + PDF parity.
 * Presentation only; does not affect stored agreement text or signing hashes.
 */

export const KXD_AGREEMENT_LOGO_PUBLIC_PATH = "/migrated-assets/brand/kxd-logo-transparent.png";

export const KXD_AGREEMENT_COLORS = {
  surface: "#f7f3eb",
  surfaceRaised: "#faf7f1",
  ink: "#2c2824",
  inkMuted: "#5c564f",
  inkFaint: "#6e675e",
  gold: "#c2aa72",
  goldRule: "rgba(194, 170, 114, 0.35)",
  goldBorder: "rgba(194, 170, 114, 0.28)",
  headingInk: "#1f1c19",
} as const;

export const KXD_AGREEMENT_FONTS = {
  sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  serif: "Georgia, 'Iowan Old Style', Palatino, serif",
} as const;

/**
 * Solid colors for @react-pdf only. PDF engines often mis-render rgba() as teal/red hues;
 * use these hex values for borders, rules, and panels (matches KXD Classic gold + neutral ink).
 */
export const KXD_AGREEMENT_PDF_COLORS = {
  gold: "#c2aa72",
  goldMuted: "#8a7a5c",
  goldRule: "#c2aa72",
  goldBorder: "#d4c4a0",
  /** Full-width footer / signature separators */
  goldHairline: "#c2aa72",
  /** Section underlines — warm neutral (avoid cool gray that PDF engines tint teal) */
  inkHairline: "#d9cdb8",
  noticeBorder: "#d4c4a0",
} as const;
