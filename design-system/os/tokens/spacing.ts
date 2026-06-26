/**
 * KXD OS 1.0 — Spacing scale (4px base)
 */

export const osSpace = {
  0: "0",
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
  16: "4rem",
  20: "5rem",
  24: "6rem",
} as const;

export const osLayout = {
  pageMax: "80rem",
  contentMax: "72rem",
  narrowMax: "42rem",
  headerHeight: "4.5rem",
  pagePaddingX: osSpace[6],
  pagePaddingY: osSpace[12],
  sectionGap: osSpace[8],
  cardPadding: osSpace[6],
  stackGap: osSpace[4],
} as const;
