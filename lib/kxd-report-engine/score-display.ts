/**
 * Shared score presentation helpers for KXD client reports.
 * Uses the stored 0–100 Website Auditor scale when applicable.
 * Does not invent performance claims beyond deterministic bands.
 */

import { KXD_REPORT_SCORE_SCALE } from "./tokens.ts";

export function scoreConditionLabel(score: number | null | undefined): string | null {
  if (score == null || Number.isNaN(Number(score))) return null;
  const n = Number(score);
  if (n >= 90) return "Strong";
  if (n >= 80) return "Solid";
  if (n >= 70) return "Serviceable with clear gaps";
  if (n >= 60) return "Uneven";
  return "Underperforming";
}

/** Explicit scale display, e.g. "72 / 100". */
export function formatScoreOutOf(
  score: number | null | undefined,
  scale: number = KXD_REPORT_SCORE_SCALE,
): string {
  if (score == null || Number.isNaN(Number(score))) return "—";
  return `${Number(score)} / ${scale}`;
}

/**
 * Meaningful grade line — never a bare letter without context.
 * Example: "Grade C · Serviceable with clear gaps"
 */
export function formatGradeContext(
  grade: string | null | undefined,
  score: number | null | undefined,
): string | null {
  const g = grade?.trim();
  if (!g) return null;
  const condition = scoreConditionLabel(score);
  return condition ? `Grade ${g} · ${condition}` : `Grade ${g}`;
}
