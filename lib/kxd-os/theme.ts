/**
 * KXD OS — shared luxury UI tokens (Apple Pro / premium agency)
 * Visual only — import in dashboards, launcher, and junior surfaces.
 */
export const KXD_OS = {
  bgPure: "#050505",
  bgBase: "#080808",
  bgElevated: "#0B0B0B",
  bgCard: "#101010",
  bgInput: "#0B0B0B",
  /** Glass cards — no gold/olive panel fills */
  glass: "rgba(255,255,255,0.035)",
  glassHover: "rgba(255,255,255,0.045)",
  gold: "#C9A962",
  goldDim: "rgba(201,169,98,0.55)",
  /** @deprecated Use `glass` for card fills — kept for compat */
  goldFaint: "rgba(255,255,255,0.035)",
  cream: "#F5F1E8",
  creamMuted: "rgba(245,241,232,0.72)",
  creamSubtle: "rgba(245,241,232,0.52)",
  border: "rgba(255,255,255,0.08)",
  borderGold: "rgba(201,169,98,0.16)",
  borderGoldStrong: "rgba(201,169,98,0.24)",
  red: "#d25a5a",
  redFaint: "rgba(210,90,90,0.1)",
  amber: "#E8C468",
  amberFaint: "rgba(255,255,255,0.04)",
  positive: "#C9A962",
  positiveFaint: "rgba(255,255,255,0.04)",
  positiveBorder: "rgba(201,169,98,0.16)",
  pearl: "rgba(245,241,232,0.52)",
  pearlFaint: "rgba(255,255,255,0.035)",
  pearlBorder: "rgba(255,255,255,0.1)",
  slate: "#A8B4C8",
  slateFaint: "rgba(255,255,255,0.04)",
  slateBorder: "rgba(255,255,255,0.1)",
  violet: "#C4B0D8",
  violetFaint: "rgba(255,255,255,0.04)",
  violetBorder: "rgba(255,255,255,0.1)",
  serif: "var(--font-cormorant, Georgia, 'Times New Roman', serif)",
  sans: "var(--font-outfit, 'Helvetica Neue', Arial, sans-serif)",
} as const;

/** Readable interface typography — sans-first */
export const KXD_OS_TYPE = {
  label: {
    fontFamily: KXD_OS.sans,
    fontSize: "0.6875rem",
    fontWeight: 600,
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    color: "rgba(245,241,232,0.52)",
  },
  labelGold: {
    fontFamily: KXD_OS.sans,
    fontSize: "0.6875rem",
    fontWeight: 600,
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    color: KXD_OS.goldDim,
  },
  body: {
    fontFamily: KXD_OS.sans,
    fontSize: "0.875rem",
    lineHeight: 1.55,
    color: KXD_OS.creamMuted,
  },
  bodySm: {
    fontFamily: KXD_OS.sans,
    fontSize: "0.8125rem",
    lineHeight: 1.5,
    color: KXD_OS.creamMuted,
  },
  metric: {
    fontFamily: KXD_OS.serif,
    fontWeight: 300,
    fontSize: "1.5rem",
    lineHeight: 1.1,
    color: KXD_OS.cream,
  },
  hero: {
    fontFamily: KXD_OS.serif,
    fontWeight: 300,
    fontSize: "clamp(1.875rem, 5vw, 3rem)",
    lineHeight: 1.05,
    color: KXD_OS.cream,
  },
} as const;

export const KXD_OS_CARD = {
  background: KXD_OS.glass,
  border: `1px solid ${KXD_OS.border}`,
} as const;

export const KXD_OS_CARD_HOVER = {
  borderColor: "rgba(255,255,255,0.12)",
  background: KXD_OS.glassHover,
} as const;
