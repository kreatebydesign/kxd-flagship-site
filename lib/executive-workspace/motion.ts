/**
 * Permanent motion language for the Executive Workspace.
 * Use these tokens everywhere — never invent one-off timings.
 */

export const EXECUTIVE_MOTION = {
  durationFast: "120ms",
  durationBase: "200ms",
  durationDrawer: "280ms",
  easeGlide: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
  easeSettle: "cubic-bezier(0.33, 1, 0.68, 1)",
} as const;

export const EXECUTIVE_MOTION_CSS_VARS = {
  "--kxd-exec-duration-fast": EXECUTIVE_MOTION.durationFast,
  "--kxd-exec-duration-base": EXECUTIVE_MOTION.durationBase,
  "--kxd-exec-duration-drawer": EXECUTIVE_MOTION.durationDrawer,
  "--kxd-exec-ease-glide": EXECUTIVE_MOTION.easeGlide,
  "--kxd-exec-ease-settle": EXECUTIVE_MOTION.easeSettle,
} as const;
