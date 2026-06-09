/**
 * KXD Motion Tokens
 * Sharp luxury studio energy — confident, not floaty or SaaS-bouncy.
 */

export const motion = {
  duration: {
    instant: "120ms",
    fast: "200ms",
    base: "300ms",
    slow: "500ms",
    reveal: "800ms",
  },
  easing: {
    standard: "cubic-bezier(0.4, 0, 0.2, 1)",
    enter: "cubic-bezier(0, 0, 0.2, 1)",
    exit: "cubic-bezier(0.4, 0, 1, 1)",
    emphasis: "cubic-bezier(0.22, 1, 0.36, 1)",
  },
  stagger: {
    sm: "80ms",
    md: "120ms",
    lg: "160ms",
  },
} as const;

export const motionPrinciples = [
  "Motion should feel sharp and deliberate — like the live KXD site, not a product landing page.",
  "Hero reveals are cinematic but fast enough to feel dangerous, not dreamy.",
  "Hover states snap with confidence. No bounce, overshoot, or playful easing.",
  "Grain/noise overlays stay subtle — texture, not decoration.",
  "Scroll cues and section entrances use fade-up with tight distance.",
  "Always respect prefers-reduced-motion.",
] as const;
