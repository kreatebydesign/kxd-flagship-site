# KXD Design System

## Reference

All visual decisions trace to the live site at **kreatebydesign.com**. See [BRAND-DIRECTION.md](./BRAND-DIRECTION.md) for principles.

## Color System

Implemented in `app/globals.css` and `design-system/tokens/colors.ts`.

| Token | Value | Usage |
|-------|-------|-------|
| `--color-background` | `#0a0a0a` | Page base |
| `--color-background-deep` | `#070707` | Gradient depth |
| `--color-foreground` | `#ffffff` | Primary type |
| `--color-cream` | `#faf8f5` | Warm secondary type |
| `--color-gold` | `#c9a962` | Accent, eyebrows, rules |
| `--color-gold-light` | `#d4ba7a` | Hover states |
| `--color-muted` | `#888888` | Supporting copy |
| `--color-border` | `#2a2a2a` | Cards, dividers |
| `--color-card` | `#111111` | Case study cards |

Extended (sparingly): `--color-blue-primary`, `--color-crimson-600`

## Typography

| Role | Font | Usage |
|------|------|-------|
| Display | Cormorant Garamond | LUXURY WEBDESIGN, section headlines |
| UI / Body | Outfit | Nav, body, labels, buttons |

### Rules

- Display headlines: **uppercase**, wide tracking, light weight
- Section titles: uppercase editorial — "Proof Over Promises.", "Built Beyond Standards."
- Body: Outfit 300 weight, cream/white on black
- Buttons/labels: uppercase, `0.15em`–`0.18em` tracking

### Utility classes

| Class | Purpose |
|-------|---------|
| `.kxd-display` | Uppercase editorial display |
| `.kxd-display-hero` | Stacked hero sizing |
| `.kxd-display-section` | Section headline sizing |
| `.kxd-eyebrow` | Gold uppercase label |
| `.kxd-label` | Muted uppercase label |
| `.kxd-manifesto` | Hero supporting line |
| `.kxd-heading` | Card/section uppercase title |
| `.kxd-body` | Standard body copy |
| `.kxd-button-label` | CTA text style |

## Signature Elements

| Class | Purpose |
|-------|---------|
| `.kxd-accent-line` / `.kxd-gold-rule` | Gold gradient rules |
| `.kxd-grain` / `.noise-overlay` | Film grain texture |
| `.kxd-reveal` | Sharp fade-up entrance |
| `.kxd-case-card` | Dark bordered portfolio card |
| `.kxd-partner-wall` | Muted logo grid |
| `.kxd-btn-primary` | Gold gradient CTA |
| `.kxd-btn-ghost` | Outlined secondary CTA |

## Layout

Defined in `design-system/tokens/layout.ts`.

| Token | Value |
|-------|-------|
| Max width | `80rem` |
| Section padding | `clamp(5rem, 10vw, 8rem)` vertical |
| Header height | `4.5rem` |
| Card radius | `0.25rem` (sharp, not soft) |

Principles: minimal nav, premium spacing without SaaS airiness, black-first surfaces.

## Motion

Defined in `design-system/tokens/motion.ts`.

- Base transitions: `300ms`
- Reveals: `800ms` fade-up, tight distance
- Easing: standard material curve — no bounce
- Always respects `prefers-reduced-motion`

## Voice in UI

Preserve live KXD copy energy. Avoid buzzwords. CTAs: "CONTACT US", "VIEW CASES", "Start a Project →" — direct, confident, uppercase where the live site uses it.

## Do Not Use

- Navy backgrounds as primary (that was incorrect in v1 foundation)
- Geist / Source Serif (not live KXD fonts)
- Blue filled primary buttons
- Sentence-case soft heroes
- Large rounded cards (`1rem+` radius)
