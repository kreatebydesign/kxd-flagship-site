/**
 * KXD OS 4.0 — Color tokens
 * Space Black Titanium. Cool, neutral, machined — Finder / Xcode dark mode.
 * No warmth in the chrome. Champagne appears only as a reward (< 3%).
 * Design with light, not color.
 */

export const osColors = {
  /** Canvas — cool neutral titanium, lifted off pure black */
  bg: {
    canvas: "#151617",
    page: "#1b1c1e",
    surface: "#242528",
    elevated: "#2c2d30",
    floating: "#35363a",
    panel: "#28292c",
    muted: "rgba(255, 255, 255, 0.045)",
    overlay: "rgba(21, 22, 23, 0.88)",
    selected: "rgba(194, 170, 114, 0.1)",
  },
  text: {
    /** Cool white — long-session readable hierarchy */
    primary: "#F3F4F6",
    secondary: "rgba(243, 244, 246, 0.78)",
    muted: "rgba(243, 244, 246, 0.54)",
    faint: "rgba(243, 244, 246, 0.34)",
    inverse: "#151617",
  },
  gold: {
    /** Champagne metal — signal, not decoration */
    accent: "#C2AA72",
    hover: "#D0B984",
    soft: "rgba(194, 170, 114, 0.28)",
    whisper: "rgba(194, 170, 114, 0.08)",
    border: "rgba(194, 170, 114, 0.22)",
    glow: "rgba(194, 170, 114, 0.05)",
  },
  border: {
    default: "rgba(255, 255, 255, 0.07)",
    strong: "rgba(255, 255, 255, 0.12)",
    divider: "rgba(255, 255, 255, 0.055)",
    focus: "rgba(194, 170, 114, 0.55)",
  },
  light: {
    /** Skylight — cool overhead diffusion */
    skylight: "rgba(255, 255, 255, 0.045)",
    skylightSoft: "rgba(255, 255, 255, 0.02)",
    /** Rim — top edge catch */
    rim: "rgba(255, 255, 255, 0.08)",
    rimSoft: "rgba(255, 255, 255, 0.04)",
    /** Recess — soft ambient occlusion */
    recess: "rgba(0, 0, 0, 0.16)",
  },
  shadow: {
    /** Cool near-black, soft */
    rest: "rgba(0, 0, 0, 0.18)",
    mid: "rgba(0, 0, 0, 0.24)",
    deep: "rgba(0, 0, 0, 0.32)",
  },
  semantic: {
    critical: "#d98484",
    criticalMuted: "rgba(217, 132, 132, 0.12)",
    warning: "#cbb07a",
    warningMuted: "rgba(203, 176, 122, 0.1)",
    success: "#7aaf90",
    successMuted: "rgba(122, 175, 144, 0.12)",
    info: "rgba(150, 178, 214, 0.7)",
    infoMuted: "rgba(150, 178, 214, 0.08)",
    disabled: "rgba(243, 244, 246, 0.28)",
  },
  /** Role aliases used by Launch Pipeline and future OS surfaces */
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
    accent: "gold.accent",
    accentHover: "gold.hover",
    accentSubtle: "gold.whisper",
    positive: "semantic.success",
    warning: "semantic.warning",
    destructive: "semantic.critical",
    focusRing: "border.focus",
    disabled: "semantic.disabled",
  },
} as const;

export const osGradients = {
  goldButton:
    "linear-gradient(180deg, rgba(255, 255, 255, 0.18) 0%, transparent 44%), linear-gradient(180deg, #d4bf86 0%, #c2aa72 50%, #9c8856 100%)",
  surfaceMilled:
    "linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.01) 9%, transparent 32%)",
  surfaceGlass:
    "linear-gradient(165deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.012) 26%, transparent 58%)",
  canvasSkylight:
    "radial-gradient(ellipse 150% 95% at 50% -28%, rgba(255, 255, 255, 0.05), transparent 64%)",
  canvasAmbient:
    "radial-gradient(ellipse 85% 60% at 100% 0%, rgba(255, 255, 255, 0.025), transparent 58%)",
} as const;
