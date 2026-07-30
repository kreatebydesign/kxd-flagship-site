/**
 * KXD Report Engine — shared brand tokens for client-facing deliverables.
 *
 * Extension boundary: tokens and presentation primitives only.
 * Domain content (audit findings, monthly metrics, ads data, etc.) stays
 * in each report type’s own module. Do not fold other report types into
 * Website Audit structures from here.
 */

export const KXD_REPORT_COLORS = {
  richBlack: "#080808",
  ink: "#0c0c0c",
  ivory: "#f7f1e6",
  paper: "#fffdf8",
  gold: "#c5a65c",
  goldMuted: "#9a8244",
  /** Solid stand-in for soft gold (PDF engines often mishandle rgba). */
  goldSoft: "#e6d7b0",
  muted: "#6f6a62",
  mutedOnBlack: "#a39e93",
  ivoryOnBlack: "#f7f1e6",
  line: "#e2d8c8",
  lineOnBlack: "#5c4f2f",
  panel: "#f3ebe0",
} as const;

export const KXD_REPORT_RADIUS_PX = 2;

export const KXD_REPORT_TYPE = {
  display: 'Georgia, "Iowan Old Style", "Palatino Linotype", Palatino, serif',
  body: 'system-ui, -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif',
  pdfDisplay: "Times-Roman",
  pdfBody: "Helvetica",
} as const;

export const KXD_REPORT_SCORE_SCALE = 100;
