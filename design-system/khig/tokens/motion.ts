/**
 * KHIG Motion Tokens
 * Physical glide — no bounce
 */

export const khigMotion = {
  duration: {
    instant: "100ms",
    fast: "140ms",
    base: "220ms",
    slow: "320ms",
  },
  easing: {
    /** Default state changes */
    standard: "cubic-bezier(0.4, 0, 0.2, 1)",
    /** Elements entering */
    enter: "cubic-bezier(0, 0, 0.2, 1)",
    /** Elements leaving */
    exit: "cubic-bezier(0.4, 0, 1, 1)",
    /** Hover lift, surface transitions */
    glide: "cubic-bezier(0.22, 1, 0.36, 1)",
    /** Press settle */
    settle: "cubic-bezier(0.32, 0.72, 0, 1)",
  },
  transition: {
    color: "color 140ms cubic-bezier(0.22, 1, 0.36, 1)",
    opacity: "opacity 140ms cubic-bezier(0.22, 1, 0.36, 1)",
    transform: "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
    surface:
      "background-color 140ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 220ms cubic-bezier(0.22, 1, 0.36, 1)",
    expand: "height 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 140ms cubic-bezier(0.22, 1, 0.36, 1)",
  },
} as const;

export const khigMotionPrinciples = {
  transitions: "140–220ms for state changes. Perceptible, never sluggish.",
  expansion: "Evidence and context expand inline — 220ms glide, no bounce.",
  collapse: "Faster than expand (140ms) — content yields gracefully.",
  loading: "Skeleton pulse or opacity breathe — no aggressive spinners.",
  hover: "Surface lift + shadow deepen — 220ms glide.",
  focus: "Instant ring appearance — no animation delay for accessibility.",
  navigation: "Content crossfade or subtle slide — shell persists.",
  pageChanges: "220ms opacity + transform — turning a page, not a slot machine.",
  modal: "Overlay 140ms fade in; modal 220ms glide up 8px.",
} as const;
