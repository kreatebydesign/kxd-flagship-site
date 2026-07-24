/**
 * KXD OS v1 — Elevation & shadow
 * Light-first, Apple-inspired: quiet depth, no decorative glow.
 * Prefer luminance + space; shadows only when objects need lift.
 */

export const osElevation = {
  flat: "none",
  /** Resting surface on soft canvas */
  rest: "0 1px 2px rgba(29, 29, 31, 0.04), 0 1px 3px rgba(29, 29, 31, 0.03)",
  /** Slightly raised interactive panel */
  raised: "0 2px 8px rgba(29, 29, 31, 0.06), 0 1px 2px rgba(29, 29, 31, 0.04)",
  /** Modals / floating chrome */
  floating: "0 8px 28px rgba(29, 29, 31, 0.12), 0 2px 8px rgba(29, 29, 31, 0.06)",
  /** Focus ring — system blue, restrained */
  focus: "0 0 0 3px rgba(0, 113, 227, 0.28)",
  /** Hover — barely lifts */
  hover: "0 2px 8px rgba(29, 29, 31, 0.08), 0 1px 2px rgba(29, 29, 31, 0.04)",
  /** Pressed — settles */
  pressed: "inset 0 1px 2px rgba(29, 29, 31, 0.08)",
} as const;

export const osElevationLevels = {
  flat: 0,
  rest: 1,
  raised: 2,
  floating: 3,
  focus: 4,
} as const;
