/**
 * Shared section numbering helpers for editorial report hierarchy.
 */

export function formatSectionIndex(index: number): string {
  return String(Math.max(1, Math.floor(index))).padStart(2, "0");
}
