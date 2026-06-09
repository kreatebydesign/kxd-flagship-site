# KXD Homepage Strategy

**Audit date:** June 2026  
**References:** `public/reference/live-site/`, [KXD Design DNA](./KXD-DESIGN-DNA.md), [KXD Service Architecture](./KXD-SERVICE-ARCHITECTURE.md)  
**Status:** Strategy only — no page build until approved.

---

## 1. Homepage Objective

Convert qualified visitors into inquiries for **Luxury Website Experiences** while demonstrating the full KXD capability ladder.

**Visitor sequence:**

1. "They are expensive." (visual authority in < 3 seconds)
2. "I understand exactly why." (proof + clarity within 30 seconds)
3. Action: Contact / Start a Project

---

## 2. Section Architecture (live-site aligned)

| # | Section | Live anchor | Strategic role |
|---|---------|-------------|----------------|
| 1 | Hero | LUXURY WEBDESIGN | Tier 1 positioning, immediate authority |
| 2 | Technology Partners | TECHNOLOGY PARTNERS | Infrastructure credibility (not tech stack exposure) |
| 3 | Services | Built Beyond Standards. | New 4-tier model, Tier 1 dominant |
| 4 | Case Studies | Proof Over Promises. | Premium success stories, conversion proof |
| 5 | Client Logos | OUR CLIENTS | Trust wall |
| 6 | Metrics | 6+ / 100% | Quantified credibility |
| 7 | Final CTA | Let's Build What Others Can't. | Direct conversion |
| 8 | Footer | Precision. Clarity. Presence. | Navigation, services, connect |

**Not on homepage v1:** Pricing (dedicated page), Insights preview (phase 2), full About content, KXD OS references.

---

## 3. Section Specifications

### 3.1 Hero

**Preserve exactly:**

```
         ◆
    ──────────

      LUXURY        (gold, Cormorant, uppercase)
     WEBDESIGN      (white, Cormorant, uppercase)

Precision. Clarity. Presence.
This is digital luxury by KXD.

  [CONTACT US]    [VIEW CASES]

EST. 2020          SCROLL          DIGITAL EXCELLENCE
Los Angeles / Portland
```

**Evolution upgrades:**
- `hero-bg.jpg` texture with WebP fallback
- Responsive type clamp
- Preload critical assets
- Update location to Portland, Oregon (current studio) with LA heritage note in About only

**Primary message:** Luxury websites — not platforms, not agency services.

---

### 3.2 Technology Partners

**Label:** TECHNOLOGY PARTNERS

**Logos:** Supabase, Vercel, Figma, Cursor, Shopify, Anthropic, AWS — monochrome white, single row desktop, scroll or wrap mobile.

**Framing:** "We build on serious infrastructure" — not "we are a tech company."

**Do not:** Link to tech docs, expose stack on homepage.

---

### 3.3 Services — Built Beyond Standards.

**Headline (keep):** Built Beyond Standards.

**Body (update):** Strategy. Design. Execution. This is what happens when everything aligns.

**4 cards (new model, old visual pattern):**

| # | Title | Priority |
|---|-------|----------|
| 01 | Luxury Website Experiences | Featured — larger or first |
| 02 | Brand Systems & Identity | Standard card |
| 03 | Growth Infrastructure | Standard card |
| 04 | Enterprise Platforms & Operational Systems | Standard card |

**Card anatomy (preserve):** Gold line icon, number, title, description, LEARN MORE →

**Copy direction:** Outcomes, not features. No tech stack. No buzzwords.

---

### 3.4 Case Studies — Proof Over Promises.

**Layout:** Masonry image grid (left) + editorial column (right) on desktop. Stacked on mobile.

**Featured cases (priority order):**

1. Primal Motorsports
2. Cusick Morgan Motorsports
3. SBE (hospitality proof until Plate the Umpqua imagery available)
4. OTP / additional motorsports

**Card elements:**
- Cinematic image
- Industry tag pill (MOTOR RACING, LUXURY HOSPITALITY, etc.)
- Client name (uppercase)
- Year
- "Precision. Clarity. Presence."
- View Project →

**Right column:**
- OUR CASES (gold eyebrow)
- Proof Over Promises. (headline)
- Body: strategy, design, execution move as one
- Stats: 6+ Projects Delivered, 100% Client Satisfaction (gold numbers)
- EXPLORE THE WORK → →

**Evolution:** Link to full case study narratives (Challenge / Strategy / Execution / Results), not just project cards.

---

### 3.5 Client Logo Wall

**Label:** OUR CLIENTS

**Treatment:** Monochrome white SVGs, multi-row grid, muted default, full opacity on hover.

**Source:** `public/migrated-assets/logos/` (20 preserved) + CMS `partners` collection for future additions.

**Include:** Plate the Umpqua logo (preserved), Primal, Cusick Morgan, SBE, etc.

---

### 3.6 Trust Band (new — evolution)

Between logo wall and final CTA, add compact trust signals:

| Signal | Source |
|--------|--------|
| Google Reviews aggregate | Payload `reviews` — 4.5+ only |
| Star rating display | Computed aggregate |
| Optional testimonial pull | Payload `testimonials` — single rotating quote |

**Visual:** Gold stars, muted count, fits dark editorial band — not a bright widget.

---

### 3.7 Final CTA — Let's Build What Others Can't.

**Preserve:**

```
         — START A PROJECT —

   Let's Build What Others Can't.

We partner with brands that are serious about
building at the highest level. If that's you, let's talk.

        [ GET IN TOUCH → ]

      — OR REACH US DIRECTLY —
      matt@kreatebydesign.com
```

**Gold gradient button.** Centered. Grain overlay. Cinematic radial glow.

---

### 3.8 Footer

**4 columns (preserve):**

1. Brand — logo, manifesto, EST. 2020, location
2. Navigation — Home, Work, Services, About, Contact
3. Services — 4 new tier names
4. Connect — social, email

**Bottom bar:** © KXD, Privacy, Terms

---

## 4. Homepage SEO

| Element | Value |
|---------|-------|
| Title | KXD \| Luxury Web Design & Brand Strategy |
| Description | Precision. Clarity. Presence. This is digital luxury by KXD. |
| Schema | Organization + LocalBusiness + WebSite + Review (when populated) |
| H1 | LUXURY WEBDESIGN (visual — semantic H1 via stacked display) |
| Primary keyword | Luxury Website Design |
| Secondary | Portland Web Design Agency, Oregon Web Design Agency |

---

## 5. Homepage Performance Targets

| Metric | Target |
|--------|--------|
| LCP | < 2.5s |
| CLS | < 0.1 |
| Hero texture | Preloaded, WebP, responsive sizes |
| Fonts | Cormorant + Outfit subset, display swap |
| Images | Next/Image, lazy below fold |
| JS | Minimal client components on homepage |

---

## 6. Homepage Conversion Paths

| CTA | Destination | Event |
|-----|-------------|-------|
| CONTACT US (header) | `/contact` | `contact_click` |
| VIEW CASES (hero) | `/work` | `project_view` |
| GET IN TOUCH (final) | `/contact` | `contact_click` |
| LEARN MORE (service card) | `/services/[slug]` | `service_view` |
| View Project (case card) | `/work/[slug]` | `case_study_view` |
| EXPLORE THE WORK | `/work` | `project_view` |
| Email link | `mailto:matt@kreatebydesign.com` | `contact_click` |

All form submissions → Payload → matt@kreatebydesign.com.

---

## 7. Mobile Strategy

| Desktop pattern | Mobile adaptation |
|-----------------|-------------------|
| Masonry case grid | Vertical stack, full-width cards |
| 4-column services | Horizontal scroll or 1-column stack |
| Side-by-side case + text | Text block above grid |
| Partner rows | 2-column logo grid or horizontal scroll |
| Minimal nav | Full-screen dark overlay menu (live pattern) |

**Preserve:** Same typography, same black/gold, same copy hierarchy.

---

## 8. What NOT to Build on Homepage

- KXD OS references
- Tech stack badges
- Pricing tables
- Blog/insights feed (phase 2)
- Chat widgets / pop-ups
- Generic "trusted by" SaaS strips
- Sentence-case soft hero alternative

---

## 9. Content Dependencies Before Build

| Dependency | Status |
|------------|--------|
| Design DNA approved | Pending review |
| Service Architecture approved | Pending review |
| Migrated hero texture | ✅ Ready |
| Migrated project images | ✅ Partial (6 projects) |
| Plate the Umpqua imagery | ❌ Needs sourcing |
| AutoDV8ions imagery | ❌ Needs sourcing |
| Tech partner SVGs | ❌ Manual sourcing |
| Google Reviews in Payload | ❌ Future integration |
| Case study long-form copy | ❌ Content phase |

---

## 10. Build Sequence (post-approval)

1. Homepage shell + navigation (live nav pattern)
2. Hero section (exact composition)
3. Technology partners band
4. Services grid (new copy, old layout)
5. Case studies masonry + stats
6. Client logo wall
7. Trust/reviews band
8. Final CTA
9. Footer
10. SEO schema + performance pass

---

*Homepage strategy complete. Awaiting review before implementation.*
