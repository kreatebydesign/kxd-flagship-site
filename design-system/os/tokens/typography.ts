/**
 * KXD OS v1 — Typography
 * Native Apple-style system stack. No serif in product UI.
 * Hierarchy is carried by size, weight, and spacing — never decoration.
 */

export const osFonts = {
  display:
    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", sans-serif',
  sans: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", sans-serif',
  mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
} as const;

export const osTypography = {
  /** Page / product title */
  display: {
    fontSize: "1.75rem",
    lineHeight: 1.15,
    fontWeight: 600,
    letterSpacing: "-0.022em",
  },
  displayPresence: {
    fontSize: "1.875rem",
    lineHeight: 1.12,
    fontWeight: 600,
    letterSpacing: "-0.022em",
  },
  /** Zone / screen section title (e.g. Executive Summary) */
  hero: {
    fontSize: "1.25rem",
    lineHeight: 1.22,
    fontWeight: 600,
    letterSpacing: "-0.018em",
  },
  title: {
    fontSize: "1.125rem",
    lineHeight: 1.25,
    fontWeight: 600,
    letterSpacing: "-0.016em",
  },
  /**
   * Quiet section label above a list (Accomplished, Recent, What’s working).
   * Clearly subordinate to item headings.
   */
  section: {
    fontSize: "0.6875rem",
    lineHeight: 1.4,
    fontWeight: 500,
    letterSpacing: "-0.01em",
    textTransform: "none" as const,
  },
  /**
   * List / card item heading — authority via size + color, not heavy weight.
   * Regular weight reads more premium than blunt 600 “dashboard bold.”
   */
  itemHeading: {
    fontSize: "0.9375rem",
    lineHeight: 1.35,
    fontWeight: 400,
    letterSpacing: "-0.016em",
  },
  cardTitle: {
    fontSize: "0.9375rem",
    lineHeight: 1.3,
    fontWeight: 400,
    letterSpacing: "-0.016em",
  },
  /** Primary supporting copy */
  body: {
    fontSize: "0.875rem",
    lineHeight: 1.5,
    fontWeight: 400,
    letterSpacing: "-0.01em",
  },
  bodyLg: {
    fontSize: "0.9375rem",
    lineHeight: 1.5,
    fontWeight: 400,
    letterSpacing: "-0.01em",
  },
  /** Secondary support under an item heading */
  support: {
    fontSize: "0.8125rem",
    lineHeight: 1.5,
    fontWeight: 400,
    letterSpacing: "-0.01em",
  },
  meta: {
    fontSize: "0.75rem",
    lineHeight: 1.4,
    fontWeight: 400,
    letterSpacing: "-0.006em",
  },
  caption: {
    fontSize: "0.6875rem",
    lineHeight: 1.4,
    fontWeight: 400,
    letterSpacing: "-0.006em",
  },
} as const;
