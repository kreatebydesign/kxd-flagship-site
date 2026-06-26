/**
 * KXD OS — shared UI tokens (synced with design-system/os v2.0)
 */
export const KXD_OS = {
  bgPure: "#161719",
  bgBase: "#1a1b1d",
  bgElevated: "#2f3032",
  bgCard: "#27282a",
  bgInput: "#27282a",
  glass: "rgba(255, 255, 255, 0.05)",
  glassHover: "rgba(255, 255, 255, 0.062)",
  gold: "#c2aa72",
  goldDim: "rgba(194, 170, 114, 0.42)",
  goldFaint: "rgba(255, 255, 255, 0.05)",
  cream: "#f5f6f8",
  creamMuted: "rgba(245, 246, 248, 0.74)",
  creamSubtle: "rgba(245, 246, 248, 0.5)",
  border: "rgba(255, 255, 255, 0.05)",
  borderGold: "rgba(194, 170, 114, 0.05)",
  borderGoldStrong: "rgba(194, 170, 114, 0.1)",
  red: "#e07070",
  redFaint: "rgba(224, 112, 112, 0.1)",
  amber: "#d4af6a",
  amberFaint: "rgba(212, 175, 106, 0.08)",
  positive: "#6fbf8f",
  positiveFaint: "rgba(111, 191, 143, 0.1)",
  positiveBorder: "rgba(111, 191, 143, 0.12)",
  pearl: "rgba(245, 246, 248, 0.5)",
  pearlFaint: "rgba(255, 255, 255, 0.05)",
  pearlBorder: "rgba(255, 255, 255, 0.05)",
  slate: "#96b2d6",
  slateFaint: "rgba(150, 178, 214, 0.08)",
  slateBorder: "rgba(150, 178, 214, 0.1)",
  violet: "#b0a4cc",
  violetFaint: "rgba(176, 164, 204, 0.08)",
  violetBorder: "rgba(176, 164, 204, 0.1)",
  serif: "var(--font-cormorant, Georgia, 'Times New Roman', serif)",
  sans: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', var(--font-outfit, 'Helvetica Neue'), Arial, sans-serif",
} as const;

export const KXD_OS_TYPE = {
  label: {
    fontFamily: KXD_OS.sans,
    fontSize: "0.75rem",
    fontWeight: 500,
    letterSpacing: "-0.01em",
    textTransform: "none" as const,
    color: KXD_OS.creamSubtle,
  },
  labelGold: {
    fontFamily: KXD_OS.sans,
    fontSize: "0.75rem",
    fontWeight: 500,
    letterSpacing: "-0.01em",
    textTransform: "none" as const,
    color: KXD_OS.creamMuted,
  },
  body: {
    fontFamily: KXD_OS.sans,
    fontSize: "0.8125rem",
    lineHeight: 1.55,
    color: KXD_OS.creamMuted,
  },
  title: {
    fontFamily: KXD_OS.sans,
    fontSize: "1.25rem",
    fontWeight: 500,
    lineHeight: 1.22,
    letterSpacing: "-0.01em",
    color: KXD_OS.cream,
  },
  presence: {
    fontFamily: KXD_OS.serif,
    fontSize: "2rem",
    fontWeight: 300,
    lineHeight: 1.05,
    letterSpacing: "-0.02em",
    color: KXD_OS.cream,
  },
} as const;

export const KXD_OS_CARD = {
  background: KXD_OS.glass,
  border: "none",
  borderColor: "transparent",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 16px rgba(0,0,0,0.14)",
} as const;

export const KXD_OS_CARD_HOVER = {
  background: KXD_OS.glassHover,
  borderColor: "transparent",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.06), 0 12px 32px rgba(0,0,0,0.2)",
} as const;
