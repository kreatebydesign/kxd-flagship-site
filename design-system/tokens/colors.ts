/**
 * KXD Color Tokens — strict black / gold / cream system
 */

export const colors = {
  black: {
    pure: "#000000",
    deep: "#030303",
    rich: "#050505",
    base: "#080808",
    soft: "#0b0b0b",
    elevated: "#111111",
  },
  charcoal: {
    DEFAULT: "#161616",
    light: "#1c1c1c",
  },
  cream: {
    white: "#ffffff",
    DEFAULT: "#f8f3ea",
    soft: "#e8ded0",
    muted: "#bfb7aa",
  },
  gold: {
    DEFAULT: "#c9a962",
    light: "#d9be73",
    dark: "#b9974e",
    deep: "#8f7434",
  },
  border: {
    white: "rgba(255, 255, 255, 0.08)",
    whiteStrong: "rgba(255, 255, 255, 0.12)",
    gold: "rgba(201, 169, 98, 0.22)",
    goldStrong: "rgba(201, 169, 98, 0.38)",
  },
} as const;

export const gradients = {
  page: "linear-gradient(180deg, #0b0b0b 0%, #030303 100%)",
  goldRadial:
    "radial-gradient(ellipse 72% 48% at 50% 0%, rgba(201, 169, 98, 0.055) 0%, transparent 68%)",
  goldButton: "linear-gradient(180deg, #d9be73 0%, #c9a962 42%, #b9974e 100%)",
  goldSubtle:
    "linear-gradient(135deg, rgba(201, 169, 98, 0.05), rgba(201, 169, 98, 0.1) 50%, rgba(201, 169, 98, 0.05))",
  accentLine:
    "linear-gradient(90deg, rgba(201, 169, 98, 0.85) 0%, rgba(201, 169, 98, 0.15) 100%)",
} as const;

export const shadows = {
  goldSm: "0 1px 0 rgba(255, 255, 255, 0.12) inset, 0 8px 24px rgba(0, 0, 0, 0.45)",
  goldLg: "0 1px 0 rgba(255, 255, 255, 0.16) inset, 0 12px 36px rgba(201, 169, 98, 0.18)",
  card: "0 0 0 1px rgba(255, 255, 255, 0.08)",
  editorial: "0 24px 64px rgba(0, 0, 0, 0.55)",
} as const;

export const radii = {
  sm: "0.25rem",
  md: "0.375rem",
  lg: "0.5rem",
  xl: "0.75rem",
} as const;
