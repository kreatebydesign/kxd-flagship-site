/**
 * KXD OS 1.0 — Interaction states
 * Physical weight — hover rises, press settles.
 */

export const osInteraction = {
  focusRingWidth: "3px",
  focusRingOffset: "0",
  hoverLift: "translateY(-1px)",
  hoverSettle: "translateY(0)",
  pressedShift: "translateY(1px)",
  pressedScale: "scale(0.99)",
  minTapTarget: "2.25rem",
  controlHeight: {
    sm: "2rem",
    md: "2.5rem",
    lg: "2.75rem",
  },
} as const;
