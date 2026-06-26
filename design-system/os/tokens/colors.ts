/**
 * KXD OS 4.0 — Color tokens
 * Space Black Titanium. Cool, neutral, machined — Finder / Xcode dark mode.
 * No warmth in the chrome. Champagne appears only as a reward (< 3%).
 * Design with light, not color.
 */

export const osColors = {
  /** Canvas — cool neutral titanium, lifted off pure black */
  bg: {
    canvas: "#1a1b1d",
    page: "#1f2022",
    surface: "#27282a",
    elevated: "#2f3032",
    floating: "#393a3c",
    panel: "#2b2c2e",
    muted: "rgba(255, 255, 255, 0.05)",
    overlay: "rgba(26, 27, 29, 0.86)",
  },
  text: {
    /** Cool white — clean, never clinical */
    primary: "#F5F6F8",
    secondary: "rgba(245, 246, 248, 0.74)",
    muted: "rgba(245, 246, 248, 0.5)",
    faint: "rgba(245, 246, 248, 0.32)",
    inverse: "#1a1b1d",
  },
  gold: {
    /** Champagne metal — reward only, < 3% */
    accent: "#C2AA72",
    soft: "rgba(194, 170, 114, 0.3)",
    whisper: "rgba(194, 170, 114, 0.07)",
    border: "rgba(194, 170, 114, 0.05)",
    glow: "rgba(194, 170, 114, 0.04)",
  },
  border: {
    default: "rgba(255, 255, 255, 0.05)",
    strong: "rgba(255, 255, 255, 0.08)",
    divider: "rgba(255, 255, 255, 0.035)",
    focus: "rgba(245, 246, 248, 0.18)",
  },
  light: {
    /** Skylight — cool overhead diffusion */
    skylight: "rgba(255, 255, 255, 0.06)",
    skylightSoft: "rgba(255, 255, 255, 0.028)",
    /** Rim — top edge catch */
    rim: "rgba(255, 255, 255, 0.09)",
    rimSoft: "rgba(255, 255, 255, 0.045)",
    /** Recess — soft ambient occlusion */
    recess: "rgba(0, 0, 0, 0.12)",
  },
  shadow: {
    /** Cool near-black, soft */
    rest: "rgba(0, 0, 0, 0.18)",
    mid: "rgba(0, 0, 0, 0.24)",
    deep: "rgba(0, 0, 0, 0.32)",
  },
  semantic: {
    critical: "#e07070",
    criticalMuted: "rgba(224, 112, 112, 0.1)",
    warning: "#d4af6a",
    warningMuted: "rgba(212, 175, 106, 0.08)",
    success: "#6fbf8f",
    successMuted: "rgba(111, 191, 143, 0.1)",
    info: "rgba(150, 178, 214, 0.66)",
    infoMuted: "rgba(150, 178, 214, 0.08)",
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
