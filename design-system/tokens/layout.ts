/**
 * KXD Layout Tokens
 * Live-site composition: dark, tight, sharp, premium — not airy SaaS whitespace.
 */

export const layout = {
  maxWidth: "80rem",
  contentWidth: "72rem",
  narrowWidth: "42rem",

  section: {
    paddingY: "clamp(5rem, 10vw, 8rem)",
    paddingX: "clamp(1.25rem, 4vw, 2.5rem)",
    gap: "clamp(2rem, 5vw, 4rem)",
  },

  header: {
    height: "4.5rem",
    navTracking: "0.12em",
  },

  hero: {
    minHeight: "100svh",
    contentMax: "48rem",
  },

  grid: {
    caseStudies: "repeat(auto-fit, minmax(280px, 1fr))",
    partners: "repeat(auto-fit, minmax(140px, 1fr))",
    services: "repeat(auto-fit, minmax(260px, 1fr))",
  },
} as const;

export const layoutPrinciples = [
  "Black-first surfaces. Warm cream/white text. Gold for accent and hierarchy.",
  "Uppercase editorial headings anchor every major section.",
  "Spacing is premium and intentional — not excessive white space.",
  "Navigation stays minimal: logo, few links, one sharp CTA.",
  "Case study cards are dark, bordered, and bold — industry label, client name, view action.",
  "Partner logos sit in a restrained wall — muted until hover.",
  "Hero uses stacked display type: LUXURY / WEBDESIGN with manifesto line beneath.",
  "CTA bands are direct and confident — gold or white on black, no soft gradients as default.",
] as const;
