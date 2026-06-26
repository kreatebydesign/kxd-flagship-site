/**
 * KXD OS 1.1 — Typography scale
 * Sans-first hierarchy. Serif reserved for presence moments.
 */

export const osFonts = {
  display: "var(--font-cormorant, 'Cormorant Garamond', Georgia, serif)",
  sans: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', var(--font-outfit, 'Outfit'), system-ui, sans-serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
} as const;

export const osTypography = {
  display: {
    fontSize: "2.25rem",
    lineHeight: 1.06,
    fontWeight: 500,
    letterSpacing: "-0.03em",
  },
  displayPresence: {
    fontSize: "2.75rem",
    lineHeight: 1.02,
    fontWeight: 300,
    letterSpacing: "-0.03em",
  },
  hero: {
    fontSize: "1.5rem",
    lineHeight: 1.18,
    fontWeight: 500,
    letterSpacing: "-0.02em",
  },
  title: {
    fontSize: "1.25rem",
    lineHeight: 1.22,
    fontWeight: 500,
    letterSpacing: "-0.01em",
  },
  section: {
    fontSize: "0.8125rem",
    lineHeight: 1.45,
    fontWeight: 500,
    letterSpacing: "0.01em",
    textTransform: "none" as const,
  },
  cardTitle: {
    fontSize: "1rem",
    lineHeight: 1.35,
    fontWeight: 500,
    letterSpacing: "-0.01em",
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
    letterSpacing: "0.01em",
  },
  caption: {
    fontSize: "0.6875rem",
    lineHeight: 1.45,
    fontWeight: 400,
    letterSpacing: "0.01em",
  },
} as const;
