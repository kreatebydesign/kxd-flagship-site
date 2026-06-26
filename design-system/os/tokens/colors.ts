/**
 * KXD OS 1.0 — Color tokens
 * Warm charcoal ladder. Cream light. Gold as machined accent — rare.
 */

export const osColors = {
  /** Canvas — warm near-black, never flat #000 */
  bg: {
    canvas: "#080808",
    page: "#0a0a09",
    surface: "#111010",
    elevated: "#161514",
    floating: "#1c1a18",
    panel: "#131211",
    muted: "rgba(255, 255, 255, 0.028)",
    overlay: "rgba(8, 8, 7, 0.94)",
  },
  text: {
    primary: "#F5F1E8",
    secondary: "rgba(245, 241, 232, 0.74)",
    muted: "rgba(245, 241, 232, 0.5)",
    faint: "rgba(245, 241, 232, 0.32)",
    inverse: "#0a0908",
  },
  gold: {
    accent: "#C9A962",
    soft: "rgba(201, 169, 98, 0.38)",
    whisper: "rgba(201, 169, 98, 0.1)",
    border: "rgba(201, 169, 98, 0.06)",
    glow: "rgba(201, 169, 98, 0.04)",
  },
  border: {
    /** Structural last resort — prefer depth and light */
    default: "rgba(255, 255, 255, 0.03)",
    strong: "rgba(255, 255, 255, 0.05)",
    divider: "rgba(255, 255, 255, 0.02)",
    focus: "rgba(245, 241, 232, 0.18)",
  },
  light: {
    /** Skylight — cream wash from above */
    skylight: "rgba(245, 241, 232, 0.035)",
    skylightSoft: "rgba(245, 241, 232, 0.015)",
    /** Rim — machined top edge catch */
    rim: "rgba(255, 255, 255, 0.055)",
    rimSoft: "rgba(255, 255, 255, 0.028)",
    /** Ambient fill in recessed areas */
    recess: "rgba(0, 0, 0, 0.22)",
  },
  shadow: {
    /** Warm undertone — weight, not decoration */
    rest: "rgba(10, 8, 6, 0.28)",
    mid: "rgba(10, 8, 6, 0.38)",
    deep: "rgba(10, 8, 6, 0.48)",
  },
  semantic: {
    critical: "#c45c5c",
    criticalMuted: "rgba(196, 92, 92, 0.12)",
    warning: "#c9a45a",
    warningMuted: "rgba(201, 164, 90, 0.1)",
    success: "#6b9e7a",
    successMuted: "rgba(107, 158, 122, 0.1)",
    info: "rgba(168, 180, 200, 0.68)",
    infoMuted: "rgba(168, 180, 200, 0.08)",
  },
} as const;

export const osGradients = {
  goldButton:
    "linear-gradient(180deg, rgba(228, 206, 148, 0.96) 0%, #c9a962 46%, #9a7d42 100%)",
  surfaceMilled:
    "linear-gradient(180deg, rgba(255, 255, 255, 0.042) 0%, rgba(255, 255, 255, 0.008) 14%, transparent 42%)",
  surfaceGlass:
    "linear-gradient(165deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.012) 38%, transparent 72%)",
  canvasSkylight:
    "radial-gradient(ellipse 120% 75% at 50% -38%, rgba(245, 241, 232, 0.038), transparent 56%)",
  canvasAmbient:
    "radial-gradient(ellipse 65% 45% at 88% 8%, rgba(245, 241, 232, 0.014), transparent 48%)",
} as const;
