/**
 * KXD OS 1.0 — Typography scale
 * Architectural rhythm. Serif for presence. Sans for precision.
 */

export const osFonts = {
  display: "var(--font-cormorant, 'Cormorant Garamond', Georgia, serif)",
  sans: "var(--font-outfit, 'Outfit', system-ui, sans-serif)",
  mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
} as const;

export const osTypography = {
  display: {
    fontSize: "2.5rem",
    lineHeight: 1.08,
    fontWeight: 300,
    letterSpacing: "-0.02em",
  },
  hero: {
    fontSize: "1.75rem",
    lineHeight: 1.15,
    fontWeight: 300,
    letterSpacing: "-0.01em",
  },
  title: {
    fontSize: "1.375rem",
    lineHeight: 1.2,
    fontWeight: 300,
    letterSpacing: "0",
  },
  section: {
    fontSize: "0.8125rem",
    lineHeight: 1.45,
    fontWeight: 500,
    letterSpacing: "0.01em",
    textTransform: "none" as const,
  },
  cardTitle: {
    fontSize: "1.0625rem",
    lineHeight: 1.35,
    fontWeight: 300,
    letterSpacing: "0",
  },
  body: {
    fontSize: "0.8125rem",
    lineHeight: 1.55,
    fontWeight: 400,
    letterSpacing: "0.01em",
  },
  bodyLg: {
    fontSize: "0.875rem",
    lineHeight: 1.6,
    fontWeight: 400,
    letterSpacing: "0.01em",
  },
  meta: {
    fontSize: "0.75rem",
    lineHeight: 1.45,
    fontWeight: 400,
    letterSpacing: "0.02em",
  },
  caption: {
    fontSize: "0.6875rem",
    lineHeight: 1.45,
    fontWeight: 400,
    letterSpacing: "0.02em",
  },
} as const;
