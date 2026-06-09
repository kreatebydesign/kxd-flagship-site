# KXD Design DNA

**Audit date:** June 2026  
**Primary reference:** Screenshots in `public/reference/live-site/` (16 captures) + live CSS at kreatebydesign.com  
**Objective:** Evolve the existing KXD experience — not redesign it.

---

## 1. Emotional Tone

The live site makes visitors feel:

1. **"They are expensive."** — Black field, gold accents, cinematic photography, editorial restraint.
2. **"I understand exactly why."** — Clear hierarchy, direct copy, visible proof (cases, logos, metrics).

**KXD energy:** Dark. Bold. Sharp. Luxury. Confident. Dangerous.

**Not:** SaaS, corporate, soft, generic premium, agency-template, startup.

| Live signal | Expression |
|-------------|------------|
| Precision. Clarity. Presence. | Recurring manifesto line on hero, cases, footer |
| Built Beyond Standards. | Services section authority |
| Proof Over Promises. | Case study section headline |
| Let's Build What Others Can't. | Final conversion band |
| This is digital luxury by KXD. | Brand signature |

---

## 2. Color Palette

Sourced from live site CSS and screenshot verification.

| Token | Hex / value | Role |
|-------|-------------|------|
| Background | `#0a0a0a` → `#070707` | Page gradient (near-pure black) |
| Foreground | `#ffffff` | Primary headings, nav |
| Cream | `#faf8f5` | Warm body secondary |
| Gold | `#c9a962` | Logo, eyebrows, stats, links, rules |
| Gold light | `#d4ba7a` | Hover, gradient highlights |
| Gold dark | `#a88b4a` | Gradient depth |
| Muted | `#888888` | Body copy, dates, placeholders |
| Border | `#2a2a2a` | Cards, form fields, dividers |
| Card | `#111111` | Service cards, form container |

**Gold usage rules (from live site):**
- Section eyebrows (OUR SERVICES, OUR CASES, CLIENT FEEDBACK)
- Active nav underline
- Logo monogram
- Metric numbers (6+, 100%)
- Primary CTA fill (gold gradient)
- Text links (EXPLORE THE WORK →, View Case Study →)
- Horizontal rules and diamond hero flourish

**Do not default to:** Navy backgrounds, blue primary buttons, light-mode surfaces.

**Extended palette (rare use only):** KXD blue `#285bff`, crimson `#d94141` — not observed as primary UI on live marketing site.

---

## 3. Typography System

### Font pairing (live site)

| Role | Family | Usage |
|------|--------|-------|
| Display | **Cormorant Garamond** | LUXURY (gold), stacked hero, large editorial headlines, quotes |
| UI / Body | **Outfit** | Navigation, body, labels, buttons, card copy, form fields |

### Hierarchy patterns (observed)

| Level | Style | Example |
|-------|-------|---------|
| Hero display line 1 | Cormorant, uppercase, gold, ~clamp(4–8.5rem) | LUXURY |
| Hero display line 2 | Cormorant, uppercase, white, slightly smaller | WEBDESIGN |
| Section headline | Cormorant or Outfit large, white, sentence or uppercase | Built Beyond Standards. / Proof Over Promises. |
| Eyebrow | Outfit, 0.6875rem, uppercase, gold, wide tracking | OUR SERVICES |
| Body | Outfit 300, muted grey/cream, 1.65–1.75 line-height | Strategy. Design. Execution. |
| Nav | Outfit, uppercase, white, medium tracking | HOME · PROJECTS · ABOUT US |
| Button | Outfit, uppercase, 0.15em tracking | CONTACT US · GET IN TOUCH → |
| Case card title | Outfit/serif bold, uppercase, white | CUSICK MORGAN |
| Industry tag | Outfit, uppercase, small, on image pill | MOTOR RACING |
| Quote | Cormorant italic, white, large | Client feedback block |
| Founder name | Outfit bold, white, large | Matt Lunger |

### Typography rules

- **Uppercase editorial** for labels, nav, buttons, industry tags, service numbers
- **Stacked display** for hero — two-line composition, not single sentence-case headline
- **Gold + white contrast** on black — never low-contrast grey-on-grey
- **Wide letter-spacing** on eyebrows and CTAs (0.15em–0.2em)
- **Light body weight** (300) for supporting copy — keeps display type dominant

---

## 4. Spacing & Layout

| Pattern | Live behavior | Evolution target |
|---------|---------------|------------------|
| Max content width | ~80rem (7xl container) | Maintain |
| Section vertical rhythm | Large gaps between major bands | Keep premium, reduce dead air on mobile |
| Hero | Full viewport, centered stack, bottom meta band | Preserve composition |
| Case grid | Masonry / mixed-height image grid + right text column | Improve responsive collapse |
| Service cards | 4-column equal grid, dark card on black | Maintain; update service names |
| Logo wall | Multi-row, centered, even spacing | Maintain; add lazy load |
| Footer | 4-column + bottom bar | Maintain structure |
| About | Left-aligned editorial blocks, full-width vision image | Preserve founder-first layout |

**Spacing principle:** Premium, not airy. Black space is intentional — but content bands should feel dense with purpose, not empty.

---

## 5. Navigation

### Live structure (minimal)

```
[KXD logo]                    HOME   PROJECTS   ABOUT US   |   CONTACT US
```

| Element | Style |
|---------|-------|
| Logo | Gold Cormorant monogram, top-left |
| Links | Uppercase Outfit, white, no background |
| Active state | Thin gold underline (HOME on homepage) |
| Separator | Vertical gold line before CTA |
| CTA | Ghost button — thin white/cream border, uppercase, no fill |

### Evolution nav (strategic expansion — not visual overhaul)

Rebuild navigation can add Services, Platforms, Insights, Pricing — but **visual treatment stays identical**: minimal links, one ghost CTA, no mega-menu, no hamburger clutter on desktop.

Mobile: full-screen dark overlay (observed in live CSS) with same typographic treatment.

---

## 6. CTA Styling

| Type | Live pattern | Use |
|------|--------------|-----|
| Primary | Gold gradient fill, dark text, uppercase, arrow → | GET IN TOUCH, Start a Project |
| Secondary | Ghost border, white text, uppercase | CONTACT US (header), VIEW CASES |
| Tertiary | Gold text link with arrows | EXPLORE THE WORK → →, View Case Study → |
| Email fallback | Gold text, centered below CTA | matt@kreatebydesign.com |
| Flanking rules | Thin horizontal lines around small labels | — START A PROJECT —, — OR REACH US DIRECTLY — |

**Do not use:** Blue filled buttons, rounded pill SaaS buttons, "Get started free" patterns.

---

## 7. Hero Composition

```
                    ◆ (gold diamond)
              ─────────────────────

                   LUXURY          ← gold, Cormorant, uppercase
                  WEBDESIGN        ← white, Cormorant, uppercase

        Precision. Clarity. Presence.
        This is digital luxury by KXD.

           [CONTACT US]  [VIEW CASES]

    EST. 2020              SCROLL              DIGITAL
    Los Angeles            ↓                   EXCELLENCE
```

**Background:** Black silk/fabric texture (`hero-bg.jpg`) with subtle grain overlay and faint gold radial glow at top.

**Evolution upgrades:** WebP/AVIF delivery, responsive type clamping, preload hero texture, reduced layout shift — **same composition**.

---

## 8. Case Study Layouts

### Homepage grid (Proof Over Promises)

- **Left/center:** Masonry image cards with industry tag pill on image
- **Right column:** OUR CASES eyebrow, headline, body, gold stats, explore link
- **Card footer:** Client name (bold) + year (right) + "Precision. Clarity. Presence."

### Case study detail page (Cusick Morgan reference)

| Section | Content |
|---------|---------|
| Hero | Full-bleed cinematic image, breadcrumb, industry tag, year, serif title, manifesto line, scroll arrow |
| Challenge & Solution | White heading, grey body, 4 metadata cards (Client, Duration, Tech Stack, Services) |
| Client Feedback | Gold eyebrow, large gold quote mark, italic serif quote, attribution |
| Digital Experience | Browser chrome mockup with live site screenshot |
| More Projects | 3-card grid, year, title, tagline, View Case Study → |

### Evolution for flagship case studies

Expand narrative sections: **Challenge → Strategy → Execution → Results → Visual showcase** — but preserve the dark editorial frame, gold eyebrows, and browser mockup proof pattern.

**Priority case studies:** Primal Motorsports, Cusick Morgan Motorsports, Plate the Umpqua, AutoDV8ions.

---

## 9. Project Card Design

| Element | Style |
|---------|-------|
| Image | Full-bleed, cinematic, aspect varies in masonry |
| Tag | Black/semi-transparent pill, white uppercase industry |
| Title | Bold uppercase white |
| Year | Gold or muted, right-aligned |
| Tagline | Muted grey — "Precision. Clarity. Presence." |
| Action | Gold text link with arrow |
| Hover | Subtle border gold shift, no bounce |

---

## 10. Logo Wall Presentation

### Technology Partners (above services)

- Label: TECHNOLOGY PARTNERS (muted uppercase)
- Logos: Supabase, Vercel, Figma, Cursor, Shopify, Anthropic, AWS
- Style: Monochrome white/grey, single row, even spacing

### Our Clients (below cases)

- Label: OUR CLIENTS (muted uppercase, centered)
- Logos: Multi-row grid, all monochrome white
- 20+ client SVGs preserved in `public/migrated-assets/logos/`
- Hover: Full opacity + optional subtle gold tint

**Evolution:** Lazy load, SVG sprite option, CMS-managed partner collection — same visual treatment.

---

## 11. Founder Positioning

From About screenshots:

| Element | Treatment |
|---------|-----------|
| Hero | "More Than an Agency." — serif headline, frequency-line texture background |
| Mission | "To design with intention..." — large white sans left-aligned |
| Values | 4-column grid: Simplicity, Intention, Integrity, Precision |
| Vision | Full-width architectural 3D render background |
| Founder note | "A NOTE FROM THE FOUNDER" gold eyebrow, left-aligned editorial |
| Name | Matt Lunger — bold white |
| Title | FOUNDER & CREATIVE DIRECTOR, KXD — gold uppercase |
| Portrait | B&W or desaturated photography in team grid |

**Exclude:** Ben Fier / Fier Media / old team structures (per business direction).

---

## 12. Contact Experience

| Element | Style |
|---------|-------|
| Headline | "Let's Create Something Great." — gold Cormorant, centered |
| Subhead | Muted sans, centered |
| Form container | Dark card `#111`, subtle gold top glow, starfield texture |
| Fields | Dark inputs, thin borders, uppercase placeholders |
| Service dropdown | Tied to service offerings |
| Routing | matt@kreatebydesign.com |

**Evolution:** Payload inquiry collection, GA4 events, optional Stripe discovery deposit — same visual shell.

---

## 13. Signature UI Elements

| Element | Purpose |
|---------|---------|
| Gold diamond + rules | Hero section marker |
| Noise/grain overlay | Cinematic texture (full-page subtle) |
| Gold horizontal rules | Section transitions, CTA flanking |
| Scroll indicator | Vertical line + SCROLL label |
| Browser chrome mockup | Case study digital experience proof |
| Stats band | Large gold numbers + muted labels |
| Floating settings icon | Bottom-right (accessibility/widget — evaluate for rebuild) |

---

## 14. What the Rebuild Must Preserve

- Black/gold/cream contrast language
- Stacked LUXURY WEBDESIGN hero
- Manifesto copy system
- Minimal 3-link + ghost CTA navigation
- Masonry case grid with industry tags
- Monochrome logo walls
- Gold gradient primary CTA
- Case study narrative structure with client feedback + browser mockup
- Founder-led About page tone
- Dark form contact experience

## 15. What the Rebuild Must Elevate

- Performance (image formats, font loading, Core Web Vitals)
- Responsive behavior (masonry → intentional mobile stacks)
- SEO (schema, metadata, case study depth)
- CMS flexibility (Payload-driven cases, services, reviews, partners)
- Trust signals (Google Reviews 4.5+, aggregate rating, metrics)
- Service positioning (new 4-tier model)
- Case study depth (Challenge / Strategy / Execution / Results)
- Conversion paths (service-specific inquiry routing)

## 16. Anti-Patterns (remove from rebuild)

- Sentence-case soft heroes ("Digital presence with intention.")
- Navy-blue SaaS backgrounds
- Blue primary CTAs
- Geist / Inter / Source Serif font stacks
- Generic Apple/Stripe minimalism without KXD gold/black DNA
- Over-white-spaced corporate layouts
- Exposing tech stack on case studies (replace with outcome-focused services list)
- KXD OS UI on public site

---

*This document is the visual authority for all page builds. No page development proceeds without alignment to this DNA.*
