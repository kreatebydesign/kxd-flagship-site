/**
 * KXD OS 1.0 — Elevation & shadow
 * Weight through warm shadow. Rim through inset light. No outline rings.
 */

export const osElevation = {
  flat: "none",
  /** Resting machined plate — subtle rim + grounded shadow */
  rest:
    "inset 0 1px 0 rgba(255, 255, 255, 0.028), 0 1px 2px rgba(10, 8, 6, 0.16), 0 8px 28px rgba(10, 8, 6, 0.2)",
  raised:
    "inset 0 1px 0 rgba(255, 255, 255, 0.042), 0 2px 6px rgba(10, 8, 6, 0.2), 0 16px 40px rgba(10, 8, 6, 0.28)",
  floating:
    "inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 4px 12px rgba(10, 8, 6, 0.24), 0 28px 64px rgba(10, 8, 6, 0.36)",
  /** Magnetic focus — cream pull, not gold flash */
  focus:
    "0 0 0 1px rgba(245, 241, 232, 0.1), 0 0 0 3px rgba(245, 241, 232, 0.06), 0 6px 24px rgba(245, 241, 232, 0.04)",
  /** Hover lift — object rises, shadow deepens */
  hover:
    "inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 4px 10px rgba(10, 8, 6, 0.22), 0 20px 48px rgba(10, 8, 6, 0.32)",
  /** Pressed — weight settles */
  pressed:
    "inset 0 2px 6px rgba(10, 8, 6, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.02), 0 1px 2px rgba(10, 8, 6, 0.12)",
} as const;

export const osElevationLevels = {
  flat: 0,
  rest: 1,
  raised: 2,
  floating: 3,
  focus: 4,
} as const;
