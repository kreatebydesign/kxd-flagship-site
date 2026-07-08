/**
 * KHIG Elevation & Surface System
 */

export const khigElevation = {
  /** Level 0 — flush with page */
  flat: {
    level: 0,
    shadow: "none",
    use: "Inline content, typography blocks",
  },

  /** Level 1 — resting object */
  rest: {
    level: 1,
    shadow:
      "inset 0 1px 0 rgba(255,255,255,0.028), 0 1px 2px rgba(0,0,0,0.16), 0 8px 28px rgba(0,0,0,0.2)",
    use: "Default cards, list containers",
  },

  /** Level 2 — raised on hover */
  raised: {
    level: 2,
    shadow:
      "inset 0 1px 0 rgba(255,255,255,0.042), 0 2px 6px rgba(0,0,0,0.2), 0 16px 40px rgba(0,0,0,0.28)",
    use: "Hovered rows, emphasized panels",
  },

  /** Level 3 — floating */
  floating: {
    level: 3,
    shadow:
      "inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 12px rgba(0,0,0,0.24), 0 28px 64px rgba(0,0,0,0.36)",
    use: "Modals, popovers, primary recommendation",
  },
} as const;

export const khigRadius = {
  /** Buttons, inputs, badges */
  sm: "6px",
  /** Cards, panels */
  md: "10px",
  /** Modals, large surfaces */
  lg: "14px",
  /** Pills, avatars */
  full: "9999px",
} as const;

export const khigGlass = {
  /** Standard glass surface */
  background:
    "linear-gradient(165deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.012) 26%, transparent 58%)",
  border: "rgba(255, 255, 255, 0.08)",
  blur: "12px",
  use: "Intelligence cards, briefing surfaces — not every panel",
} as const;
