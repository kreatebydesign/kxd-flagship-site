/**
 * KXD OS 1.0 — Motion
 * Physical glide. Weight shifts. No bounce.
 */

export const osMotion = {
  duration: {
    instant: "100ms",
    fast: "140ms",
    base: "220ms",
    slow: "320ms",
  },
  easing: {
    standard: "cubic-bezier(0.4, 0, 0.2, 1)",
    enter: "cubic-bezier(0, 0, 0.2, 1)",
    exit: "cubic-bezier(0.4, 0, 1, 1)",
    glide: "cubic-bezier(0.22, 1, 0.36, 1)",
    settle: "cubic-bezier(0.32, 0.72, 0, 1)",
  },
  transition: {
    color: "color 140ms cubic-bezier(0.22, 1, 0.36, 1)",
    opacity: "opacity 140ms cubic-bezier(0.22, 1, 0.36, 1)",
    transform: "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
    surface:
      "background-color 140ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 220ms cubic-bezier(0.22, 1, 0.36, 1)",
    lift:
      "transform 220ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 220ms cubic-bezier(0.22, 1, 0.36, 1)",
    weight:
      "transform 220ms cubic-bezier(0.32, 0.72, 0, 1), box-shadow 220ms cubic-bezier(0.32, 0.72, 0, 1)",
  },
} as const;
