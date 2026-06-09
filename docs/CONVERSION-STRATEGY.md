# KXD Conversion Strategy

**Audit date:** June 2026  
**References:** Live site screenshots, [KXD Design DNA](./KXD-DESIGN-DNA.md), [KXD Service Architecture](./KXD-SERVICE-ARCHITECTURE.md)  
**Status:** Strategy only — no page build until approved.

---

## 1. Conversion Philosophy

KXD does not sell through urgency tactics. The site converts through:

1. **Visual authority** — immediate "they are expensive" feeling
2. **Proof density** — cases, logos, metrics, reviews
3. **Clarity** — visitor understands exactly what KXD does and why
4. **Direct access** — one click to contact, no gatekeeping

**Not:** Pop-ups, chatbots, countdown timers, lead magnets, free audits, "book a demo" SaaS patterns.

---

## 2. Primary Conversion Goal

**Qualified inquiries for Luxury Website Experiences** → matt@kreatebydesign.com

| Metric | Definition |
|--------|------------|
| Primary conversion | Inquiry form submission or direct email click |
| Secondary conversion | Platform application (enterprise tier) |
| Micro-conversion | Case study view, service page view, pricing page view |

---

## 3. Visitor Feeling Sequence

```
Land on homepage
      ↓
"They are expensive"        ← Hero: LUXURY WEBDESIGN, black/gold, texture
      ↓
"These are serious"         ← Tech partners + services: Built Beyond Standards
      ↓
"They've done real work"    ← Proof Over Promises: masonry cases + stats
      ↓
"Brands I respect trust them" ← Client logo wall
      ↓
"Others confirm it"         ← Google Reviews 4.5+ (when live)
      ↓
"I understand exactly why"  ← Clear tier model, direct copy
      ↓
"Let's talk"                ← Let's Build What Others Can't → contact
```

---

## 4. Conversion Architecture

```
┌─────────────────────────────────────────────────────────┐
│  AWARENESS                                              │
│  Homepage hero · SEO landing · Insights articles        │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│  CONSIDERATION                                          │
│  Case studies · Work index · Service pages              │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│  EVALUATION                                             │
│  Pricing (Tier 1 ranges) · About/founder · Reviews     │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│  ACTION                                                  │
│  Contact form · Direct email · Platform application     │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│  QUALIFICATION                                          │
│  Payload inquiry → matt@kreatebydesign.com              │
│  [Future: Stripe discovery deposit]                     │
│  [Future: KXD OS CRM sync]                              │
└─────────────────────────────────────────────────────────┘
```

---

## 5. CTA Hierarchy (live-site aligned)

| Priority | Label | Style | Destination |
|----------|-------|-------|-------------|
| 1 | GET IN TOUCH → | Gold gradient fill | `/contact` |
| 2 | CONTACT US | Ghost border (header) | `/contact` |
| 3 | VIEW CASES | Ghost border (hero) | `/work` |
| 4 | START A PROJECT → | Gold text + rules | `/contact` |
| 5 | LEARN MORE → | Gold text link | `/services/[slug]` |
| 6 | View Case Study → | Gold text link | `/work/[slug]` |
| 7 | EXPLORE THE WORK → → | Gold text link | `/work` |
| 8 | matt@kreatebydesign.com | Gold text email | `mailto:` |

**Remove from rebuild:** Blue filled "Start a project" buttons (incorrect v1 foundation).

---

## 6. Entry Points by Intent

| Visitor intent | Path | Primary CTA | Service tier |
|----------------|------|-------------|--------------|
| Needs a luxury website | Home → Services → Contact | GET IN TOUCH | Tier 1 |
| Evaluating portfolio | Home → Work → Case Study → Contact | View Case Study → | Tier 1 |
| Needs brand work | Services → Brand Systems → Contact | LEARN MORE → | Tier 2 |
| Needs SEO/growth systems | Services → Growth Infrastructure → Contact | LEARN MORE → | Tier 3 |
| Needs internal platform | Platforms → Application | Platform application | Tier 4 |
| Price shopping | Pricing → Contact | GET IN TOUCH | Tier 1 |
| Researching studio | About → Contact | CONTACT US | General |
| Reading thought leadership | Insights → Service page CTA | LEARN MORE → | Varies |

---

## 7. Contact Form Strategy

**Headline (preserve):** Let's Create Something Great.

**Fields:**

| Field | Purpose |
|-------|---------|
| Name | Required |
| Email | Required |
| Service (dropdown) | Routes to correct tier messaging |
| Message | Required |
| Source (hidden) | Page/campaign attribution |

**Service dropdown options:**

1. Luxury Website Experiences
2. Brand Systems & Identity
3. Growth Infrastructure
4. Enterprise Platforms & Operational Systems
5. General Inquiry

**Routing:** All submissions → Payload `inquiries` or `platform-applications` → matt@kreatebydesign.com

**Pre-fill:** `?service=luxury-website-experiences` from service card LEARN MORE links (live site pattern).

---

## 8. Trust Signal System

### Tier A — Always visible (homepage)

| Signal | Source | Treatment |
|--------|--------|-----------|
| Case study grid | Payload `projects` + `case-studies` | Masonry, cinematic |
| Client logo wall | Payload `partners` + migrated SVGs | Monochrome grid |
| Metrics | CMS or static until dynamic | 6+ Projects, 100% Satisfaction — gold numbers |
| Manifesto repetition | Brand copy | Precision. Clarity. Presence. |

### Tier B — Case study depth

| Signal | Source | Treatment |
|--------|--------|-----------|
| Client feedback quote | Payload `testimonials` | Gold quote mark, serif italic |
| Results highlights | Case study `resultsHighlights` | Gold numbers + labels |
| Browser mockup | Case study gallery | Digital experience proof |
| Related projects | Case study relations | 3-card grid |

### Tier C — Site-wide (phase 2)

| Signal | Source | Treatment |
|--------|--------|-----------|
| Google Reviews | Payload `reviews` (4.5+ only) | Aggregate rating + selected quotes |
| Review schema | SEO layer | AggregateRating JSON-LD |
| Founder positioning | About page | Matt Lunger, editorial |
| Technology partners | Static/CMS | Infrastructure credibility |

**Review rules:**
- Only display reviews rated **4.5 stars and above**
- Managed through Payload
- Google Business Profile sync prepared — not exposed technically
- Never show raw sync fields publicly

---

## 9. Case Studies as Conversion Engine

Case studies are not portfolio pages — they are **premium success stories**.

### Priority case studies to build

| Project | Tier emphasis | Industry | Status |
|---------|---------------|----------|--------|
| Primal Motorsports | Tier 1 + Tier 4 | Motorsports | Images preserved |
| Cusick Morgan Motorsports | Tier 1 + Tier 2 | Motorsports | Full case on live site |
| Plate the Umpqua | Tier 1 + Tier 3 | Hospitality | Logo only — needs imagery |
| AutoDV8ions | Tier 1 + Tier 2 | Automotive | Needs all assets |

### Case study structure (conversion-optimized)

1. **Hero** — cinematic image, immediate authority
2. **Challenge** — the problem, in client's world
3. **Strategy** — what KXD decided and why
4. **Execution** — what was built (outcomes, not tech stack)
5. **Results** — measurable or qualitative wins
6. **Visual showcase** — browser mockup, gallery
7. **Client feedback** — testimonial block
8. **CTA** — Start a Project → contact

**Every case study ends with conversion path** — not a dead end.

---

## 10. Pricing Page Conversion Role

| Tier | Pricing page behavior |
|------|----------------------|
| Luxury Website Experiences | Published investment ranges — reduces friction |
| Brand Systems | Range or "from" pricing |
| Growth Infrastructure | "Scoped based on current state" |
| Enterprise Platforms | No public price — "Request a conversation" → platform application |

Pricing page CTA always routes to contact with service pre-selected.

---

## 11. Measurement (GA4 / GTM)

| Event | Trigger |
|-------|---------|
| `contact_click` | Any contact CTA or email click |
| `inquiry_submit` | Form submission success |
| `discovery_call_request` | Future Stripe deposit initiation |
| `platform_application` | Enterprise form submission |
| `case_study_view` | Case study page load |
| `project_view` | Work index / project card click |
| `service_view` | Service page load |
| `pricing_view` | Pricing page load |
| `review_interaction` | Review section engagement |

Environment variables: `NEXT_PUBLIC_GA4_MEASUREMENT_ID`, `NEXT_PUBLIC_GTM_ID`

---

## 12. Future Conversion Layers (prepared, not active)

| Layer | Architecture status |
|-------|---------------------|
| Stripe discovery call deposit | `lib/stripe/config.ts` |
| Project deposit | Inquiry `stripe` group in Payload |
| Package purchase | Stripe metadata contract |
| KXD OS lead sync | `lib/kxd-os/integration.ts` |
| Client portal | Routes reserved: `/portal`, `/dashboard`, `/ops` |

---

## 13. Copy Principles

- Direct, human, strategic — not marketing agency fluff
- "Expensive" is a feature, not something to apologize for
- Show proof before asking for contact
- Every service description answers: what outcome does the client get?
- Preserve live KXD signature lines
- Avoid buzzword list from brand guidelines

---

## 14. Anti-Conversion Patterns (never implement)

- Exit-intent pop-ups
- Chat widgets ("How can I help you today?")
- "Schedule a free consultation" SaaS framing
- Discount codes or limited-time offers
- Multi-step lead qualifiers before contact
- Generic "Get started" without context
- Blue SaaS buttons
- Social proof counters that feel fabricated

---

## 15. Success Criteria

| KPI | Target (6 months post-launch) |
|-----|------------------------------|
| Inquiry volume | Increase vs. old site baseline |
| Tier 1 inquiry % | > 60% of total inquiries |
| Case study → contact rate | Track via GA4 funnel |
| Organic traffic | Growth on priority keywords |
| Review display | 4.5+ aggregate visible when GBP connected |
| Page speed | Core Web Vitals pass |

---

*Conversion strategy complete. Awaiting review before page implementation.*
