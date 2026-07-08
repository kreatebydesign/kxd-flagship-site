/**
 * KXD Human Interface Guidelines (KHIG)
 * Edition 1 — Design Constitution
 *
 * Documentation: design-system/khig/
 * This module exports semantic tokens for tooling and future alignment.
 *
 * Phase 16A: Standards only — no runtime CSS changes.
 */

export { khigColors, type KhigColorRole } from "./tokens/colors";
export { khigTypography, khigFonts, type KhigTypographyRole } from "./tokens/typography";
export { khigSpace, khigLayout, khigVerticalRhythm } from "./tokens/spacing";
export { khigElevation, khigRadius, khigGlass } from "./tokens/elevation";
export { khigMotion, khigMotionPrinciples } from "./tokens/motion";

/** KHIG version for tooling and scorecard references */
export const KHIG_VERSION = "1.0.0" as const;

/** Minimum ship grade per 09-scorecard.md */
export const KHIG_MINIMUM_SHIP_GRADE = "B" as const;
