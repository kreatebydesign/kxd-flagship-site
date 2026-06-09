/**
 * KXD Typography Tokens
 * Matches live site: Cormorant Garamond (display) + Outfit (UI/body).
 */

export const typography = {
  fonts: {
    display: 'var(--font-cormorant), "Cormorant Garamond", Georgia, serif',
    sans: 'var(--font-outfit), "Outfit", system-ui, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  },
  scale: {
    /** Stacked hero: LUXURY / WEBDESIGN */
    heroPrimary: {
      size: "clamp(4rem, 12vw, 8.5rem)",
      lineHeight: "0.88",
      tracking: "0.02em",
      weight: "300",
      transform: "uppercase",
    },
    heroSecondary: {
      size: "clamp(3.5rem, 10vw, 7.5rem)",
      lineHeight: "0.9",
      tracking: "0.04em",
      weight: "300",
      transform: "uppercase",
    },
    section: {
      size: "clamp(2rem, 5vw, 3.5rem)",
      lineHeight: "1",
      tracking: "0.06em",
      weight: "400",
      transform: "uppercase",
    },
    cardTitle: {
      size: "clamp(1.5rem, 3vw, 2.25rem)",
      lineHeight: "1.05",
      tracking: "0.04em",
      weight: "400",
      transform: "uppercase",
    },
    body: {
      lg: { size: "1.0625rem", lineHeight: "1.7", weight: "300" },
      md: { size: "0.9375rem", lineHeight: "1.65", weight: "300" },
      sm: { size: "0.8125rem", lineHeight: "1.6", weight: "400" },
    },
    label: {
      md: { size: "0.75rem", lineHeight: "1.4", tracking: "0.18em", weight: "500" },
      sm: { size: "0.6875rem", lineHeight: "1.35", tracking: "0.2em", weight: "500" },
    },
    button: {
      size: "0.75rem",
      tracking: "0.15em",
      weight: "500",
      transform: "uppercase",
    },
  },
} as const;

export const typographyRules = {
  /** Editorial headlines are uppercase, sharp, and confident — never soft or SaaS-like */
  displayStyle: "uppercase editorial",
  bodyStyle: "light weight, high contrast on black",
  labelStyle: "uppercase, wide tracking, gold or muted",
  buttonStyle: "uppercase, 0.15em tracking",
  avoid: [
    "sentence-case hero headlines",
    "rounded friendly SaaS typography",
    "soft serif body copy at large sizes",
    "generic Inter/Geist system feel",
  ],
} as const;
