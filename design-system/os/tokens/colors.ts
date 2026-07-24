/**
 * KXD OS v1 — Color tokens
 * Clean light-first product system (Apple-inspired clarity, original KXD identity).
 * System blue is the primary interactive accent. Gold is optional and rare.
 */

export const osColors = {
  bg: {
    canvas: "#F5F5F7",
    page: "#F5F5F7",
    surface: "#FFFFFF",
    elevated: "#FAFAFC",
    floating: "#FFFFFF",
    panel: "#F0F0F2",
    muted: "rgba(29, 29, 31, 0.04)",
    overlay: "rgba(29, 29, 31, 0.36)",
    selected: "rgba(0, 113, 227, 0.08)",
  },
  text: {
    primary: "#1D1D1F",
    secondary: "#6E6E73",
    muted: "#6E6E73",
    faint: "#86868B",
    inverse: "#FFFFFF",
  },
  /** Interactive accent — restrained system blue */
  accent: {
    primary: "#0071E3",
    hover: "#0077ED",
    soft: "rgba(0, 113, 227, 0.14)",
    whisper: "rgba(0, 113, 227, 0.08)",
    border: "rgba(0, 113, 227, 0.28)",
  },
  gold: {
    /** Optional brand identity only — never default chrome */
    accent: "#C2AA72",
    hover: "#D0B984",
    soft: "rgba(194, 170, 114, 0.22)",
    whisper: "rgba(194, 170, 114, 0.08)",
    border: "rgba(194, 170, 114, 0.28)",
    glow: "rgba(194, 170, 114, 0.05)",
  },
  border: {
    default: "#D2D2D7",
    strong: "#C7C7CC",
    divider: "#E5E5EA",
    focus: "rgba(0, 113, 227, 0.55)",
  },
  light: {
    skylight: "transparent",
    skylightSoft: "transparent",
    rim: "rgba(255, 255, 255, 0.9)",
    rimSoft: "rgba(255, 255, 255, 0.65)",
    recess: "rgba(29, 29, 31, 0.04)",
  },
  shadow: {
    rest: "rgba(29, 29, 31, 0.04)",
    mid: "rgba(29, 29, 31, 0.08)",
    deep: "rgba(29, 29, 31, 0.12)",
  },
  semantic: {
    critical: "#E30000",
    criticalMuted: "rgba(227, 0, 0, 0.08)",
    warning: "#B25000",
    warningMuted: "rgba(178, 80, 0, 0.1)",
    success: "#248A3D",
    successMuted: "rgba(36, 138, 61, 0.1)",
    info: "#0071E3",
    infoMuted: "rgba(0, 113, 227, 0.08)",
    disabled: "rgba(29, 29, 31, 0.28)",
  },
  roles: {
    canvas: "bg.canvas",
    canvasElevated: "bg.page",
    surface: "bg.surface",
    surfaceSubtle: "bg.muted",
    surfaceSelected: "bg.selected",
    borderSubtle: "border.default",
    borderStrong: "border.strong",
    textPrimary: "text.primary",
    textSecondary: "text.secondary",
    textMuted: "text.muted",
    accent: "accent.primary",
    accentHover: "accent.hover",
    accentSubtle: "accent.whisper",
    positive: "semantic.success",
    warning: "semantic.warning",
    destructive: "semantic.critical",
    focusRing: "border.focus",
    disabled: "semantic.disabled",
  },
} as const;

/** Dark theme mirror — applied via html[data-theme="dark"] CSS tokens (Batch E). */
export const osDarkColors = {
  bg: {
    canvas: "#1C1C1E",
    page: "#1C1C1E",
    surface: "#2C2C2E",
    elevated: "#3A3A3C",
    floating: "#2C2C2E",
    panel: "#3A3A3C",
    muted: "rgba(255, 255, 255, 0.06)",
    overlay: "rgba(0, 0, 0, 0.55)",
    selected: "rgba(10, 132, 255, 0.18)",
  },
  text: {
    primary: "#F5F5F7",
    secondary: "#A1A1A6",
    muted: "#A1A1A6",
    faint: "#8E8E93",
    inverse: "#1D1D1F",
  },
  accent: {
    primary: "#0A84FF",
    hover: "#409CFF",
    soft: "rgba(10, 132, 255, 0.22)",
    whisper: "rgba(10, 132, 255, 0.18)",
    border: "rgba(10, 132, 255, 0.35)",
  },
  border: {
    default: "#48484A",
    strong: "#636366",
    divider: "#38383A",
    focus: "rgba(10, 132, 255, 0.6)",
  },
  semantic: {
    critical: "#FF453A",
    criticalMuted: "rgba(255, 69, 58, 0.16)",
    warning: "#FF9F0A",
    warningMuted: "rgba(255, 159, 10, 0.16)",
    success: "#30D158",
    successMuted: "rgba(48, 209, 88, 0.16)",
    info: "#0A84FF",
    infoMuted: "rgba(10, 132, 255, 0.18)",
    disabled: "rgba(235, 235, 245, 0.3)",
  },
} as const;

export const osGradients = {
  goldButton: "none",
  surfaceMilled: "none",
  surfaceGlass: "none",
  canvasSkylight: "none",
  canvasAmbient: "none",
} as const;
