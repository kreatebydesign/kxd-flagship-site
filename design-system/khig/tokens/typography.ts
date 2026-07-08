/**
 * KHIG Typography Scale
 * Editorial hierarchy for executive readability
 */

export const khigFonts = {
  /** Presence — page titles, narratives, client names */
  serif: "var(--font-cormorant, 'Cormorant Garamond', Georgia, serif)",
  /** Precision — body, controls, metadata */
  sans: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', var(--font-outfit, 'Outfit'), system-ui, sans-serif",
  /** Data — work numbers, IDs, monospace metrics */
  mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
} as const;

export const khigTypography = {
  /** Display — rare hero moments, edition landing */
  display: {
    role: "display",
    fontFamily: khigFonts.serif,
    fontSize: "2.75rem",
    lineHeight: 1.02,
    fontWeight: 300,
    letterSpacing: "-0.03em",
    use: "Edition hero, rare presence moments only",
  },

  /** Executive Heading — page entry, briefing narrative */
  executiveHeading: {
    role: "executive-heading",
    fontFamily: khigFonts.serif,
    fontSize: "clamp(1.5rem, 3.5vw, 2rem)",
    lineHeight: 1.55,
    fontWeight: 500,
    letterSpacing: "0.01em",
    use: "Intelligence narrative, page titles, executive brief opening",
  },

  /** Section Heading — panel labels, briefing sections */
  sectionHeading: {
    role: "section-heading",
    fontFamily: khigFonts.sans,
    fontSize: "0.6875rem",
    lineHeight: 1.45,
    fontWeight: 500,
    letterSpacing: "0.09em",
    textTransform: "uppercase" as const,
    use: "Section labels — quiet scan anchors",
  },

  /** Card Heading — recommendation titles, insight observations */
  cardHeading: {
    role: "card-heading",
    fontFamily: khigFonts.serif,
    fontSize: "1.3125rem",
    lineHeight: 1.35,
    fontWeight: 500,
    letterSpacing: "0",
    use: "Primary recommendation, card titles",
  },

  /** Metric — KPI values, health scores */
  metric: {
    role: "metric",
    fontFamily: khigFonts.serif,
    fontSize: "2.25rem",
    lineHeight: 1.06,
    fontWeight: 500,
    letterSpacing: "-0.03em",
    use: "Hero numbers — the story at a glance",
  },

  /** Body Large — creative brief, important prose */
  bodyLarge: {
    role: "body-large",
    fontFamily: khigFonts.serif,
    fontSize: "1.125rem",
    lineHeight: 1.55,
    fontWeight: 400,
    letterSpacing: "0.01em",
    use: "Review workspace brief, editorial prose blocks",
  },

  /** Body — default reading text */
  body: {
    role: "body",
    fontFamily: khigFonts.sans,
    fontSize: "0.9375rem",
    lineHeight: 1.55,
    fontWeight: 400,
    letterSpacing: "0.01em",
    use: "Default paragraphs, list content",
  },

  /** Body Small — compact lists */
  bodySmall: {
    role: "body-small",
    fontFamily: khigFonts.sans,
    fontSize: "0.8125rem",
    lineHeight: 1.5,
    fontWeight: 400,
    letterSpacing: "0.01em",
    use: "Compact rows, secondary list content",
  },

  /** Caption — timestamps, fine print */
  caption: {
    role: "caption",
    fontFamily: khigFonts.sans,
    fontSize: "0.75rem",
    lineHeight: 1.45,
    fontWeight: 400,
    letterSpacing: "0.01em",
    use: "Generated at, fine print",
  },

  /** Label — form labels, field names */
  label: {
    role: "label",
    fontFamily: khigFonts.sans,
    fontSize: "0.8125rem",
    lineHeight: 1.45,
    fontWeight: 500,
    letterSpacing: "0.01em",
    use: "Form labels, field identifiers",
  },

  /** Metadata — IDs, work numbers, system references */
  metadata: {
    role: "metadata",
    fontFamily: khigFonts.mono,
    fontSize: "0.875rem",
    lineHeight: 1.45,
    fontWeight: 400,
    letterSpacing: "0",
    use: "WK-000001, system IDs",
  },

  /** Recommendation — primary action titles */
  recommendation: {
    role: "recommendation",
    fontFamily: khigFonts.serif,
    fontSize: "1.5rem",
    lineHeight: 1.35,
    fontWeight: 500,
    letterSpacing: "0",
    use: "Primary recommendation headline",
  },

  /** Narrative — executive briefing opening paragraph */
  narrative: {
    role: "narrative",
    fontFamily: khigFonts.serif,
    fontSize: "clamp(1.5rem, 3.5vw, 2rem)",
    lineHeight: 1.55,
    fontWeight: 500,
    letterSpacing: "0.01em",
    use: "Intelligence executive narrative block",
  },

  /** Insight — observation prose */
  insight: {
    role: "insight",
    fontFamily: khigFonts.serif,
    fontSize: "1.125rem",
    lineHeight: 1.55,
    fontWeight: 400,
    letterSpacing: "0.01em",
    use: "Executive insight observations",
  },
} as const;

export type KhigTypographyRole = keyof typeof khigTypography;
