# KXD Service Architecture

**Audit date:** June 2026  
**Context:** Live site services no longer reflect current business model. This document defines the new offering structure for the rebuild.

---

## 1. Positioning Statement

**Kreate by Design is NOT a marketing agency.**  
**Kreate by Design is NOT a software company.**  
**Kreate by Design is a luxury digital partner.**

### Public-facing line

> Luxury websites, growth infrastructure, and operational systems built for brands that refuse average.

### Visitor feeling target

1. "They are expensive."
2. "I understand exactly why."

---

## 2. Service Tier Model

### Tier 1 — Luxury Website Experiences *(Primary)*

| Attribute | Value |
|-----------|-------|
| Priority | **#1 — flagship entry point** |
| Sales cycle | Fastest |
| Volume | Highest |
| Homepage weight | Hero, services, cases, CTAs all anchor here |

**What it is:** Premium websites built for ambitious brands — editorial design, performance discipline, conversion clarity.

**Outcomes (public language):**
- A digital presence that matches the standard of the brand
- Custom design and build — not templates
- Fast, intentional, built to convert

**Live site mapping:** Replaces "Web Development" as the lead offering. Absorbs the energy of LUXURY WEBDESIGN hero positioning.

**URL:** `/services/luxury-website-experiences`

---

### Tier 2 — Brand Systems & Identity

| Attribute | Value |
|-----------|-------|
| Priority | Secondary — natural upsell from website work |
| Relationship | Often paired with Tier 1 |

**What it is:** Brand refinement, messaging, visual identity systems, strategic positioning.

**Outcomes:**
- Coherent brand language across touchpoints
- Visual systems that scale beyond the website
- Positioning clarity before or during digital build

**Live site mapping:** Evolves "Branding & Identity" — more strategic, less logo-shop framing.

**URL:** `/services/brand-systems-identity`

---

### Tier 3 — Growth Infrastructure

| Attribute | Value |
|-----------|-------|
| Priority | Secondary — retention and expansion revenue |
| Relationship | Follows website launch or pairs with Tier 1 |

**What it is:** SEO, analytics, conversion optimization, lead generation systems, marketing automation, operational efficiencies.

**Outcomes:**
- Measurable traffic and conversion improvement
- Systems that turn the website into a growth engine
- Data-informed decisions without agency fluff

**Live site mapping:** Evolves "Growth & Strategy" — more infrastructure, less vague "data-driven strategies."

**Public language:** Never say "marketing agency." Frame as systems behind the brand.

**URL:** `/services/growth-infrastructure`

---

### Tier 4 — Enterprise Platforms & Operational Systems

| Attribute | Value |
|-----------|-------|
| Priority | Premium enterprise — longest sales cycle |
| Relationship | Existing brand partners, complex organizations |

**What it is:** Custom internal business platforms, operational dashboards, client portals, membership environments, business infrastructure.

**Outcomes:**
- One system replacing disconnected tools
- Client-facing portals and internal dashboards
- Business operations that match brand standard

**Live site mapping:** Evolves "Custom Solution" — repositioned as enterprise infrastructure, not bespoke dev shop.

**Critical rule:** **Do NOT expose underlying tech stack publicly.** No Payload, Next.js, Stripe, or stack badges on marketing pages. Focus on outcomes.

**URL:** `/platforms` (capability overview) + `/services/enterprise-platforms-operational-systems` (detail)

**Application path:** Platform qualification form (Payload `platform-applications`) — separate from standard website inquiries.

---

## 3. Service Hierarchy on Site

```
                    ┌─────────────────────────────┐
                    │  Luxury Website Experiences │  ← PRIMARY
                    └──────────────┬──────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          ▼                        ▼                        ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────────────┐
│ Brand Systems    │   │ Growth           │   │ Enterprise Platforms &   │
│ & Identity       │   │ Infrastructure   │   │ Operational Systems      │
└──────────────────┘   └──────────────────┘   └──────────────────────────┘
     Secondary            Secondary                  Premium enterprise
```

---

## 4. Navigation Mapping

| Nav item | Primary service connection |
|----------|---------------------------|
| Home | Luxury websites hero + proof |
| Work | Case studies across all tiers |
| Services | 4-tier overview, Tier 1 featured |
| Platforms | Tier 4 capability (not software pitch) |
| Pricing | Tier 1 ranges prominent; Tier 4 "scoped on discovery" |
| Insights | SEO content supporting all tiers |
| About | Founder, studio, trust |
| Contact | Tier-aware inquiry form |

---

## 5. Live Site → New Model Translation

| Old (live site) | New (rebuild) | Change |
|-----------------|---------------|--------|
| Web Development | Luxury Website Experiences | Elevated positioning, primary |
| Branding & Identity | Brand Systems & Identity | More strategic framing |
| Growth & Strategy | Growth Infrastructure | Systems language, not agency |
| Custom Solution | Enterprise Platforms & Operational Systems | Enterprise outcomes, no tech exposure |

### Copy direction for services section

**Keep live headline:** Built Beyond Standards.

**Update body:** Strategy. Design. Execution. — aligned to new tier names and outcomes.

**Card structure:** Preserve numbered cards (01–04), gold icons, dark card grid — update titles and descriptions only.

---

## 6. Case Study ↔ Service Mapping

| Project | Primary tier | Secondary tier | Industry |
|---------|-------------|----------------|----------|
| Primal Motorsports | Luxury Website Experiences | Enterprise Platforms (membership/ops) | Motorsports |
| Cusick Morgan Motorsports | Luxury Website Experiences | Brand Systems | Motorsports |
| Plate the Umpqua | Luxury Website Experiences | Growth Infrastructure | Hospitality |
| AutoDV8ions | Luxury Website Experiences | Brand Systems | Automotive |

Case studies should tag applicable tiers without exposing tech stack.

---

## 7. Payload CMS Service Collection

Update `services` collection categories to:

```typescript
[
  { label: "Luxury Website Experiences", value: "luxury-website-experiences" },
  { label: "Brand Systems & Identity", value: "brand-systems-identity" },
  { label: "Growth Infrastructure", value: "growth-infrastructure" },
  { label: "Enterprise Platforms & Operational Systems", value: "enterprise-platforms" },
]
```

Set `order` field: 1, 2, 3, 4. Mark Tier 1 as `featured: true`.

---

## 8. Inquiry Routing by Service

| Inquiry type | Collection | Recipient |
|--------------|------------|-----------|
| Luxury website | `inquiries` | matt@kreatebydesign.com |
| Brand systems | `inquiries` | matt@kreatebydesign.com |
| Growth infrastructure | `inquiries` | matt@kreatebydesign.com |
| Enterprise platform | `platform-applications` | matt@kreatebydesign.com |
| General | `inquiries` | matt@kreatebydesign.com |

Contact form service dropdown mirrors the 4 tiers.

---

## 9. Pricing Architecture (future page)

| Tier | Pricing approach |
|------|------------------|
| Luxury Website Experiences | Published investment ranges — fastest conversion |
| Brand Systems & Identity | Range or "from" pricing, often bundled |
| Growth Infrastructure | Monthly or project-based — scoped |
| Enterprise Platforms | No public price — qualification → discovery |

Stripe deposits attach to discovery calls for Tier 1 and Tier 4 — architecture prepared, not active.

---

## 10. SEO Keyword Mapping

| Keyword cluster | Primary page |
|-----------------|--------------|
| Luxury Website Design | `/`, `/services/luxury-website-experiences` |
| Hospitality Website Design | `/work`, case: Plate the Umpqua |
| Motorsports Website Development | `/work`, cases: Primal, Cusick Morgan |
| Portland / Oregon Web Design Agency | `/`, `/about` |
| Enterprise Website Development | `/services/enterprise-platforms-operational-systems` |
| Membership Platform Development | `/platforms` |
| Operational Platform Development | `/platforms` |

---

## 11. What We Never Say Publicly

- "Marketing agency"
- "Software company"
- "Payload CMS" / "Next.js" / "headless" on marketing pages
- "AI-powered" / "cutting-edge" / buzzword list from brand guidelines
- KXD OS / internal operational tooling

---

## 12. KXD OS Boundary

KXD OS is separate. Public site routes reserved:

- `/portal` — future client portal
- `/dashboard` — future client dashboard
- `/ops` — future internal workspace

No operational functionality on public marketing site at this stage.

---

*Service architecture approved pending review. Payload collection category update deferred until page build phase.*
