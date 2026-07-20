# Primal Motorsports — Executive Review Architecture

**Status:** Planning only — no application code in this document  
**Audience:** KXD product / engineering / founder  
**Client surface:** Primal Partnership Workspace inside KXD OS (`primal-motorsports`)  
**Not in scope:** Public Primal website repo · Primal OS platform delivery · pricing  

---

## 1. Executive product definition

### What it is

**Executive Review** is a living, board-ready leadership experience inside the Primal Partnership Workspace. Primal leadership opens it for board meetings, partnership reviews, investor/partner conversations, and recurring performance visibility.

It is:

- A **narrative operating review** of the digital partnership
- Evidence-backed, calm, editorial, and presentation-ready
- Continuously maintained as the partnership advances — not a one-time export
- Honest about **Built**, **Activating**, and **Future**

It is **not**:

- A PDF or slide deck
- A generic KPI dashboard
- A replacement for daily Overview (Executive Performance)
- A duplicate of Partnership (relationship briefing)
- A claim that Primal OS is delivered
- A pricing surface

### Product positioning (three layers)

| Layer | Role | Where it lives |
|---|---|---|
| **Public website** | Brand + customer-facing platform | `primalmotorsports.com` (live) → Primal 2.0 (staging → launch) |
| **KXD OS Partnership Workspace** | Collaboration, website management, inventory, executive visibility | `/portal/*` for Primal |
| **Primal OS** | Separate future motorsports operating system | Roadmap only — not delivered work |

### Central story (the spine)

1. The digital foundation KXD established under Primal ownership  
2. Evolution from the current live site to the new customer platform  
3. Google Ads and search performance as supporting evidence  
4. The Primal workspace — collaboration, website management, inventory, executive clarity  
5. Business impact and expansion readiness  
6. A clear next-phase roadmap  
7. A connected digital platform growing alongside Primal Motorsports  

### How it differs from existing Primal surfaces

| Surface | Job | Cadence | Tone |
|---|---|---|---|
| **Overview** (`/portal`) — Executive Performance | Daily operating pulse: where things stand, what needs attention | Continuous | Action-forward |
| **Partnership** (`/portal/partnership`) — Executive Briefing | Relationship memory and partnership narrative | Deep read | Documentary |
| **Executive Review** (`/portal/executive-review`) — *proposed* | Board-grade living review packet: foundation → evidence → workspace → roadmap | Periodic + always current | Board / leadership |

Executive Review **reuses** Executive Memory, reporting facts (when live), partnership milestones, and curated evidence. It does **not** replace Overview or Partnership.

---

## 2. Recommended module name

### Primary recommendation

**Executive Review**

### Why this name

- Matches how leadership already speaks (“board review,” “executive review”)
- Distinct from **Executive Performance** (daily Overview) and **Partnership** (briefing)
- Reusable across KXD clients without motorsports-specific branding
- Avoids “Report,” “Dashboard,” “Deck,” or “Brief” — each of which implies the wrong artifact

### Terminology (Primal profile)

| Key | Copy |
|---|---|
| Nav label | Executive Review |
| Page eyebrow | Leadership |
| Page title | Executive Review |
| Lead | A living view of the digital foundation, performance evidence, and what comes next. |
| Status line | Updated for leadership · [period label] |

### Names considered and rejected

| Name | Why not |
|---|---|
| Board Deck / Presentation | Implies slides; static |
| Performance Dashboard | Generic dashboard; wrong tone |
| Partnership Report | Sounds like a PDF monthly |
| Executive Briefing | Already used by `/portal/partnership` |
| Primal OS Review | Oversells undelivered platform |

---

## 3. Navigation placement

### Recommended location

**Headquarters** group, immediately after **Partnership**:

```
PARTNERSHIP WORKSPACE
├── Overview
├── Partnership
├── Executive Review   ← new
├── Website Review
├── Website Workspace
└── Inventory
```

### Route

`/portal/executive-review`

### Gating

- CES module entitlement: `executive-review` (new `CesModuleId`)
- Enabled only for Primal in V1 via `lib/ces/profile/primal.ts`
- Visible under CES launch safety (same pattern as `partnership` / inventory)
- Optional later: `briefingEnabled`-style presentation flag if other clients need soft rollout

### Why Headquarters (not Intelligence)

Primal’s CES launch surface currently hides the standard Intelligence nav group (`reports`, `analytics`, etc.). Executive Review is a **leadership narrative**, not a reporting tool drawer. Headquarters keeps it beside Overview and Partnership — the executive cluster.

### Relationship links (cross-nav, not duplication)

| From | Link to Executive Review |
|---|---|
| Overview growth / reporting zone | “Open Executive Review” |
| Partnership hero | “Open Executive Review” (alongside existing briefing) |
| Website Review (optional) | Soft link only if relevant to launch chapter |

---

## 4. First-30-seconds experience

### Ideal landing: one composition, not a dashboard

Adam (and leadership) should understand **four things in ~30 seconds**:

1. **Where the partnership stands** — refining toward website launch; foundation is built  
2. **What KXD established** — rebuilt customer platform, advertising, search presence, private workspace  
3. **What the evidence shows** — demand is real; search is consolidating onto the primary brand domain; Ads are actively managed  
4. **What happens next** — finish launch cleanly; activate deeper reporting; expand only when ready  

### First viewport composition

```
┌─────────────────────────────────────────────────────────────┐
│  LEADERSHIP · EXECUTIVE REVIEW                              │
│  Primal Motorsports                                         │  ← brand hero signal
│  The digital foundation is in place.                        │
│  Now we finish the platform, prove the demand,              │
│  and grow with clear visibility.                            │
│                                                             │
│  [ Phase: Launch readiness ]  [ Focus: Final revisions ]    │
│  [ Next: Website launch ]     [ Updated: July 2026 ]        │
│                                                             │
│  Built · Activating · Future   (status legend, quiet)       │
└─────────────────────────────────────────────────────────────┘
```

Below the fold (still early scroll): a **story spine rail** — eight numbered chapters — so leadership can jump during a meeting without hunting.

### Tone rules for the opening

- Serif display for brand + chapter titles (existing CES editorial pattern)
- No KPI strip in the first viewport
- No “NOT YET” performance cards competing with the narrative
- No pricing, no Primal OS sales language
- One calm sentence that separates **customer site** vs **partnership workspace** vs **future platform**

---

## 5. Complete section-by-section architecture

### Information architecture decision

**One long editorial page** with:

- Sticky **chapter rail** (desktop) / section jump menu (mobile)
- Optional **Present mode** (fullscreen, larger type, hide chrome) — later phase
- Optional **Review editions** (dated snapshots) — later phase

**Not** multiple subpages for V1. Board meetings need a continuous story. Subpages fragment attention and recreate a dashboard IA.

---

### Section order (recommended)

| # | Section ID | Title |
|---|---|---|
| 00 | `opening` | Opening stance |
| 01 | `foundation` | Digital foundation |
| 02 | `platform` | Customer platform evolution |
| 03 | `demand` | Demand & visibility |
| 04 | `workspace` | Partnership workspace |
| 05 | `impact` | Business impact & readiness |
| 06 | `roadmap` | Next-phase roadmap |
| 07 | `vision` | Connected platform vision |

---

### 00 — Opening stance

| Field | Definition |
|---|---|
| **Executive question** | Where do we stand, and why does this review matter? |
| **Purpose** | Orient leadership in under 30 seconds; set the living-document contract |
| **Key message** | The foundation is built. Launch readiness is the active focus. This review stays current as the partnership advances. |
| **Metrics / evidence** | Phase, focus, next milestone, review period label (from Executive Memory + presentation) |
| **Screenshots / sources** | Workspace hero photography (existing EP hero asset); not website screenshots |
| **Visual treatment** | Editorial hero (CES exec/briefing pattern); relationship-at-a-glance strip; Built/Activating/Future legend |
| **Status** | **Built** (narrative) · hybrid data for glance fields |
| **Static / data / hybrid** | Hybrid |
| **Reusable** | Yes — opening stance pattern for any client Executive Review |

---

### 01 — Digital foundation

| Field | Definition |
|---|---|
| **Executive question** | What did KXD establish for Primal under this ownership chapter? |
| **Purpose** | Translate technical delivery into executive outcomes |
| **Key message** | Primal now operates on a coherent digital foundation: brand site rebuild, demand generation, search presence, and a private leadership workspace — not disconnected tools. |
| **Metrics / evidence** | Accomplishment items from Executive Memory (website rebuilt, Ads launched, search connected, workspace opened, review rhythm, lead tracking language only if evidence-backed) |
| **Screenshots / sources** | `Primal Client Portal:Workspace/overview.png`, `partnership-growth.png`; memory milestones |
| **Visual treatment** | Numbered “foundation pillars” (4–6). Outcome language only. No tech stack diagrams. |
| **Status** | **Built** for verified pillars; hide insufficient-evidence items |
| **Static / data / hybrid** | Hybrid (memory-driven + authored) |
| **Reusable** | Yes — foundation pillars from Executive Memory |

**Recommended pillars (V1):**

1. Flagship website rebuilt for the brand  
2. Advertising launched and refined with care  
3. Search presence established on the primary brand domain  
4. Private partnership workspace opened  
5. Shared website review rhythm introduced  
6. Leadership visibility prepared (Executive Performance)

---

### 02 — Customer platform evolution

| Field | Definition |
|---|---|
| **Executive question** | How is the public brand experience evolving from today’s site to the new platform? |
| **Purpose** | Show the before → after as a business upgrade, not a design vanity comparison |
| **Key message** | The live site carries the brand today. Primal 2.0 is the clearer, calmer customer platform — complete destination architecture, stronger inventory merchandising, and a path to driver experiences. |
| **Metrics / evidence** | Qualitative IA comparison; launch readiness status from memory (`awaiting-website-revisions`, `story-prep`, `story-launch`) |
| **Screenshots / sources** | **Current:** `Current Live Site - Screenshots/homepage.png`, `inventory.png`, `car-details.png`, `driving-schools.png` · **2.0:** `Primal 2.0 Rebuild Site - Screenshots/homepage.png`, `inventory.png`, `inventory-mega-menu.png`, `driving-schools.png`, `service.png` · **Future signal only:** `driver-portal.png` (labeled Future / not delivered as Primal OS) |
| **Visual treatment** | Side-by-side or sequenced “Then / Now / Next” frames. Caption each with a **business outcome** (clarity of paths, inventory confidence, service authority). Avoid critique language about the live site. |
| **Status** | Live site = **Built** · 2.0 = **Built / Activating** (staging → launch) · Driver Portal = **Future** |
| **Static / data / hybrid** | Hybrid (static screenshots + live launch status) |
| **Reusable** | Yes — “platform evolution” chapter with client screenshot packs |

**Outcome captions (examples):**

| Frame | Outcome language |
|---|---|
| Current homepage | Proven brand presence; high-energy customer entry |
| 2.0 homepage | Clearer destination architecture — schools, race programs, inventory, service |
| Current inventory | Established Radical commerce presence |
| 2.0 inventory | Editorial merchandising built for serious buyers |
| Driver portal screenshot | Future driver operating layer — roadmap honesty, not delivery claim |

---

### 03 — Demand & visibility

| Field | Definition |
|---|---|
| **Executive question** | Is the market responding — and is demand finding the right brand surfaces? |
| **Purpose** | Provide supporting evidence without turning the review into an Ads console |
| **Key message** | Qualified interest exists. Search is consolidating onto `primalmotorsports.com`. Paid demand is active across Search and Demand Gen for racing school growth — managed carefully, not maximally spent. |
| **Metrics / evidence** | See §7 Metrics and chart mapping |
| **Screenshots / sources** | Google Ads CSVs; GSC XLSX for both domains; optional small chart figures authored for V1 |
| **Visual treatment** | Two calm evidence panels: **Search** and **Advertising**. Narrative lead above charts. Domain migration callout (legacy → primary). Top intent themes as chips — not 3,000 search-term rows. |
| **Status** | Evidence = **Built** (curated from exports) · Live Ads facts in OS = **Activating** · GA4 site analytics = **Activating / Future entitlement** |
| **Static / data / hybrid** | Hybrid V1 (curated snapshot) → data-driven later |
| **Reusable** | Yes — demand chapter with capability-gated panels |

**Honesty rules for this section:**

- Label curated CSV/XLSX figures as **Prepared partnership evidence** until live ReportingFacts power the same panels  
- Do not imply GA4 website analytics are live (entitlement held; pipeline ready)  
- Do not show Cost / Conv. as “ROI” without conversion definition clarity  
- Prefer executive outcomes: qualified demand, brand findability, domain consolidation  

**Domain story (critical, evidence-backed):**

| Domain | Role in story |
|---|---|
| `primalmotorsports.com` | Primary brand domain — GSC shows rising clicks and improving average position through mid-2026 |
| `primalracing.com` | Legacy domain — historically strong volume; sharp decline after early 2026 as traffic consolidates |

This is **migration / brand consolidation evidence**, not a failure narrative.

---

### 04 — Partnership workspace

| Field | Definition |
|---|---|
| **Executive question** | How does leadership actually operate with KXD day to day? |
| **Purpose** | Make the workspace tangible as a partnership operating system — not “a portal” |
| **Key message** | Primal has a private place to refine the site, manage inventory, track revisions, and see executive context — without email chaos. |
| **Metrics / evidence** | Enabled modules; Website Review rhythm; inventory publish capability; EP presence |
| **Screenshots / sources** | `overview.png`, `website-front-end-cms.png`, `inventory-front-end-cms.png`, `partnership-growth.png` |
| **Visual treatment** | Four capability cards with one screenshot each + outcome line. Deep links into live modules (“Open Inventory”). |
| **Status** | **Built** for Overview, Partnership, Website Review, Website Workspace, Inventory |
| **Static / data / hybrid** | Hybrid |
| **Reusable** | Yes — workspace capability chapter driven by enabled CES modules |

**Capability map (client-facing):**

| Capability | Outcome | Status |
|---|---|---|
| Overview · Executive Performance | Calm leadership view of focus and next steps | Built |
| Partnership briefing | Shared memory of what was built and what is next | Built |
| Website Review | Precise revision rhythm; nothing gets lost | Built |
| Website Workspace | Structured page/section update requests | Built |
| Inventory | Publish vehicle listings without waiting on a developer | Built |

---

### 05 — Business impact & readiness

| Field | Definition |
|---|---|
| **Executive question** | What business outcomes are we positioned for — and are we ready to expand? |
| **Purpose** | Connect digital work to Primal’s commercial engines without inventing attribution |
| **Key message** | The foundation supports three engines: **driver development**, **race programs**, and **Radical inventory commerce** — with leadership visibility and launch readiness as the near-term unlock. |
| **Metrics / evidence** | Intent themes (schools, Radical for sale); inventory as commerce surface; launch readiness; “what’s working” signals only when evidence-backed |
| **Screenshots / sources** | 2.0 inventory + schools; Ads search terms themes; GSC query themes |
| **Visual treatment** | Three engine columns + readiness meter (qualitative). No fake ROI. |
| **Status** | Engines = **Built** (platform) · Attribution depth = **Activating** · Expansion programs = **Future** |
| **Static / data / hybrid** | Hybrid |
| **Reusable** | Yes — impact engines defined per client business model |

**Three engines (Primal):**

1. **Experience & schools** — findability and conversion paths for driving schools  
2. **Race programs** — authority and clarity for Radical Cup / race participation  
3. **Inventory commerce** — Radical vehicle discovery and inquiry  

---

### 06 — Next-phase roadmap

| Field | Definition |
|---|---|
| **Executive question** | What comes next — and what is honestly not ready yet? |
| **Purpose** | Create a shared forward plan with Built / Activating / Future discipline |
| **Key message** | Finish launch. Activate deeper reporting. Grow into lead follow-through and richer executive rhythm. Treat Primal OS as a separate expansion conversation. |
| **Metrics / evidence** | Executive Memory opportunities; reporting capability entitlements; platform opportunity item |
| **Screenshots / sources** | `partnership-growth.png` growth cards; memory `opportunity-*` and `platform-primal-os` |
| **Visual treatment** | Three lanes: **Now**, **Next**, **Later**. Status tags only. No pricing. |
| **Status** | Mixed — see §8 |
| **Static / data / hybrid** | Hybrid |
| **Reusable** | Yes — roadmap lane pattern |

**Lane content (V1):**

| Lane | Items |
|---|---|
| **Now (Activating)** | Final website revisions with leadership · Website launch · Keep Ads refinement careful |
| **Next (Activating → Built)** | Live Search evidence in-product · GA4 website analytics when entitlement enabled · Recurring executive reporting rhythm |
| **Later (Future)** | Lead management · Customer journey continuity · Expansion programs · **Primal OS** (separate engagement) |

---

### 07 — Connected platform vision

| Field | Definition |
|---|---|
| **Executive question** | What does the long game look like if we keep building together? |
| **Purpose** | Close with ambition that is honest — connected digital platform growing with Primal |
| **Key message** | Customer platform + partnership workspace + (future) operational layers can grow as one connected system — paced thoughtfully. |
| **Metrics / evidence** | None invented; vision prose + optional Driver Portal as **Future illustration** |
| **Screenshots / sources** | `driver-portal.png` only with **Future** label and copy: “Illustrative direction — not included in current delivery.” |
| **Visual treatment** | Quiet closing composition. Three concentric rings: Customer · Partnership · Operations (Future). Partner mark. |
| **Status** | Vision = editorial · Primal OS / Driver Portal = **Future** |
| **Static / data / hybrid** | Static (authored) |
| **Reusable** | Yes — vision close with client-specific future illustration |

---

## 6. Screenshot and asset mapping

### Asset inventory → section usage

| Asset | Maps to | Role |
|---|---|---|
| `Current Live Site - Screenshots/homepage.png` | §02 | “Today” brand presence |
| `Current Live Site - Screenshots/inventory.png` | §02, §05 | Live inventory commerce |
| `Current Live Site - Screenshots/car-details.png` | §02 | Vehicle detail depth (today) |
| `Current Live Site - Screenshots/driving-schools.png` | §02, §05 | Schools experience (today) |
| `Primal 2.0 Rebuild Site - Screenshots/homepage.png` | §02 | New destination architecture |
| `Primal 2.0 Rebuild Site - Screenshots/inventory.png` | §02, §05 | Editorial inventory merchandising |
| `Primal 2.0 Rebuild Site - Screenshots/inventory-mega-menu.png` | §02 | Navigation clarity for inventory |
| `Primal 2.0 Rebuild Site - Screenshots/driving-schools.png` | §02, §05 | Schools path in 2.0 |
| `Primal 2.0 Rebuild Site - Screenshots/service.png` | §02 | Service authority |
| `Primal 2.0 Rebuild Site - Screenshots/driver-portal.png` | §07 only | Future illustration — never “Built” |
| `Primal Client Portal:Workspace/overview.png` | §01, §04 | Leadership workspace reality |
| `Primal Client Portal:Workspace/partnership-growth.png` | §01, §04, §06 | Progress + growth lanes |
| `Primal Client Portal:Workspace/website-front-end-cms.png` | §04 | Website collaboration |
| `Primal Client Portal:Workspace/inventory-front-end-cms.png` | §04 | Inventory operating capability |
| `Google Ad Reports/*.csv` | §03, §07 metrics | Prepared Ads evidence |
| `Google Search Console Reports/**/*.xlsx` | §03 | Prepared search evidence |
| EP hero `/migrated-assets/projects/primal-motorsports-hero.jpg` | §00 | Brand photography (not a UI screenshot) |
| Primal logo `/migrated-assets/logos/primal.svg` | Shell / hero | Identity |

### Audit folders note

`docs/primal-executive-review/audits/` and `00-project-overview.md` are currently empty placeholders. This architecture document is the first filled planning artifact. Future audit write-ups should feed §02/§03 evidence notes without changing the IA spine.

### Behind-the-scenes assets (do not show client-facing)

- Raw CSV/XLSX downloads as files  
- Internal evidence labels (`provider:ads:not-implemented`, GA4 property IDs, entitlement flags)  
- `evidenceStrength: insufficient` memory items (e.g. landing-pages until verified)  
- Platform pricing models inside `platformOpportunity.pricing`  
- Internal-only executive timeline events  
- KXD cost/margin or agency process detail  

---

## 7. Metrics and chart mapping

### Principles

1. **Outcomes over console metrics** — translate to demand quality, findability, consolidation  
2. **Never fabricate** — if live facts are missing, show curated “Prepared evidence” or Activating empty states  
3. **Few charts, large meaning** — max 3–4 chart figures in the whole review  
4. **Period honesty** — always show date range on every figure  

### Advertising (prepared from Google Ads exports)

**Source files**

- `Primal-Google-Ads-Campaigns-Full-History.csv`  
- `Primal-Google-Ads-Monthly-Performance.csv`  
- `Primal-Google-Ads-Search-Terms-Full-History.csv`  

**Period:** March 31, 2026 – July 20, 2026  

**Executive-safe headline figures (campaign totals):**

| Metric | Value | Client language |
|---|---|---|
| Impressions | 71,357 | Reach into the racing-school market |
| Clicks | 2,547 | Qualified visits driven with intent |
| Spend | $10,661.91 | Investment managed with care |
| Conversions | 29 | Tracked conversion actions in-period |
| Blended CTR | 3.57% | Engagement with ads |
| Search campaign CTR | 5.77% | Strong bottom-funnel engagement |
| Search impression share | 37.43% | Room to grow visibility carefully |

**Campaign structure (executive framing):**

| Campaign | Type | Role |
|---|---|---|
| Bottom Funnel · Racing School | Search | Capture high-intent school demand |
| Upper Funnel & Remarketing · Racing School | Demand Gen | Expand awareness and remarket |

**Monthly trend (named campaigns only — for one small chart):**

| Month | Clicks | Cost | Conversions |
|---|---|---|---|
| April 2026 | 498 | $2,559 | 9 |
| May 2026 | 469 | $3,064 | 7 |
| June 2026 | 954 | $3,054 | 12 |
| July 2026 (partial through Jul 20) | 627 | $1,985 | 1 |

**Intent themes (from search terms — chips, not tables):**  
`racing school` · `racing school atlanta` · `performance driving school` · `scca racing school` · `road atlanta` variants  

**Charts recommended**

1. Monthly clicks + conversions (dual series, calm)  
2. Optional: Search vs Demand Gen share of clicks (simple split)  

**Do not chart in V1 client view**

- Full 3,191 search-term rows  
- Optimization scores  
- Absolute top impression % minutiae  
- Cost/conv as “customer acquisition cost” without definition  

---

### Search (prepared from Search Console exports)

**Source files**

- `primalmotorsports.com/PrimalMotorsports-Search-Console-Full-History.xlsx`  
- `primalracing.com/PrimalRacing-Search-Console-Full-History.xlsx`  

**Primary domain (`primalmotorsports.com`) — monthly clicks / impressions / position:**

| Period | Clicks | Impressions | Avg position |
|---|---|---|---|
| Mar 2026 | 226 | 2,418 | 23.5 |
| Apr 2026 | 269 | 4,280 | 12.6 |
| May 2026 | 302 | 3,562 | 12.2 |
| Jun 2026 | 390 | 7,076 | 9.5 |
| Jul 1–20 2026 | 250 | 4,630 | 8.8 |

**Executive read:** Brand findability is strengthening on the primary domain; average position improved materially.

**Top query themes (primary domain):**  
Brand (`primal racing school`, `primal motorsports`, `primal racing`) · Inventory (`radical sr1/sr3 for sale`) · Category (`racing school near me`)

**Legacy domain (`primalracing.com`):** historically high volume through 2025; collapses after March 2026 as consolidation proceeds. Present as **domain transition evidence**, not decline panic.

**Charts recommended**

1. Primary-domain clicks + average position over months  
2. Optional annotation: legacy domain wind-down  

**Live OS posture:** Search Console capability is connected in KXD OS; panels should prefer live ReportingFacts when present, else fall back to prepared evidence with clear labeling.

---

### Website analytics (GA4)

| Status | Treatment |
|---|---|
| Pipeline prepared; entitlement held | **Activating** empty state — “Website analytics will appear when access is verified.” |
| Do not show fabricated sessions/users | Absolute rule |

---

## 8. Built / Activating / Future rules

### Definitions

| Status | Meaning | Visual |
|---|---|---|
| **Built** | Exists in production partnership workspace or verified delivery | Quiet positive marker / no badge needed if ambient |
| **Activating** | Designed/connected/partial; awaiting data, launch, or entitlement | Soft “Activating” tag |
| **Future** | Honest roadmap; not purchased/delivered | “Future” tag; never looks complete |

### Application matrix

| Item | Status |
|---|---|
| Live public site | Built |
| Primal 2.0 rebuild on staging | Built / Activating (launch pending) |
| Website Review / Workspace / Inventory | Built |
| Overview · Executive Performance shell | Built |
| Partnership briefing | Built |
| Search Console connection | Built (capability) |
| Live Search panels with facts | Activating (facts-dependent) |
| Google Ads management (partnership work) | Built |
| Live Ads ReportingFacts in OS | Activating (provider not fully implemented) |
| Prepared Ads/GSC evidence in Executive Review | Built (curated) |
| GA4 website analytics in OS | Activating / entitlement-held |
| Lead management | Future |
| Customer journey OS | Future |
| Expansion programs | Future |
| Primal OS / Driver Portal product | Future (separate engagement) |

### Copy rules

- Never say “included” for Future items  
- Never show pricing  
- Prefer “available as a separate conversation” for Primal OS  
- Prefer “will appear when connected” for Activating analytics  

---

## 9. Reusable KXD OS framework considerations

### Reuse first (do not rebuild)

| Existing system | Reuse as |
|---|---|
| `lib/executive-memory/` | Narrative facts, pillars, roadmap, platform honesty |
| `lib/executive-client-summary/` | Chapter composition patterns / evidence filtering |
| `lib/ces/executive-performance/` | Status glance, presentation tokens, accents |
| `lib/reporting/` | Live metrics when capabilities + facts exist |
| `components/ces/executive-briefing/` | Editorial chapter UI patterns (`.kxd-ces-briefing*`) |
| `design-system/ces/styles/kxd-ces.css` | Hero, type, motion, status tags |
| CES module registry + Primal profile | Entitlement + terminology |
| Executive timeline (portal-safe) | Optional “recent partnership moments” footnote — not the spine |

### New reusable framework: **Executive Review Pack**

Propose a client-agnostic pack model (eventually):

```
ExecutiveReviewPack {
  clientSlug
  periodLabel
  opening
  chapters[]  // ordered section definitions
  evidenceSnapshots[]  // curated metrics with provenance
  mediaRefs[]  // screenshots with captions + status
  roadmapLanes[]  // now / next / later
  vision
  provenance  // prepared | live | mixed
}
```

Primal V1 can hard-author the pack from source assets + memory. Later clients get the same renderer with different packs.

### What not to duplicate

- Do not fork a second Executive Performance workspace  
- Do not create a parallel reporting engine  
- Do not invent a Primal-only CSS system — extend CES tokens  
- Do not put Primal OS implementation inside this module  

---

## 10. Data and integration posture

### V1 (build now from current assets)

| Data | Source | Presentation |
|---|---|---|
| Opening glance | Executive Memory + EP presentation | Live compose |
| Foundation / roadmap / vision prose | Executive Memory + authored pack | Authored |
| Platform evolution | Screenshot pack in repo docs (or migrated CMS media) | Static media |
| Ads metrics | Curated from CSV → evidence snapshot | Prepared |
| Search metrics | Curated from GSC XLSX → evidence snapshot | Prepared |
| Workspace capabilities | Enabled modules + screenshots | Hybrid |

### Wait for live integrations

| Integration | Unlock |
|---|---|
| Search panels from ReportingFacts | Already capability-ready; show live when facts exist for period |
| Google Ads provider → ReportingFacts | Replace prepared Ads snapshot |
| GA4 entitlement enabled | Website panel |
| Review editions / period picker | Persisted packs + monthly report linkage |
| Auto chart refresh | Live fact series |

### Eventual data model (only if packs become multi-client / multi-period)

Optional Payload collection later:

- `executive-review-packs` — period, status (`draft|ready|published`), chapter JSON, media refs, evidence snapshot refs  
- Link to `monthly-reports` and/or ReportingFacts period keys  
- Activity: `executive-review.published`, `executive-review.viewed`  

**V1 does not require** a new collection if a Primal-authored pack in code/config is sufficient for the first board-ready release.

### Provenance labeling (required)

Every metrics block must declare one of:

- `Live from connected reporting`  
- `Prepared partnership evidence` (exports curated by KXD)  
- `Awaiting connection`  

---

## 11. Accessibility and responsive considerations

### Accessibility

- Semantic `<article>` + numbered `<section>` landmarks with visible headings  
- Charts require text summaries (not chart-only meaning)  
- Status is never color-only — include text tags (Built / Activating / Future)  
- Respect `prefers-reduced-motion` (CES motion tokens already do)  
- Screenshot figures need meaningful `alt` describing the **business point**, not “screenshot”  
- Focus order follows chapter rail → content  

### Responsive

| Viewport | Behavior |
|---|---|
| Desktop | Sticky chapter rail + wide editorial column |
| Tablet | Collapsible chapter menu; stacked Then/Now frames |
| Mobile | Single column; chapter jump as select/list; screenshots full-bleed with captions below |

### Presentation / board use

- High contrast already fits dark CES shell  
- Avoid hover-only reveals for key claims  
- Present mode (later): hide sidebar, enlarge type, keep chapter rail  

---

## 12. Build phases

### Phase A — Architecture & pack authoring (this document)

- IA locked  
- Asset → section mapping locked  
- Metrics curation rules locked  

### Phase B — Version 1 experience (recommended build)

- Module registration + Primal enablement + nav placement  
- Single editorial page with 8 chapters  
- Authored evidence snapshots for Ads + GSC  
- Screenshot figures with status labels  
- Reuse briefing/EP visual patterns  
- Cross-links from Overview + Partnership  
- No new Payload collection required  

### Phase C — Live evidence upgrade

- Prefer ReportingFacts for Search (and Ads when provider ready)  
- GA4 panel when entitlement enabled  
- Soft empty states remain for anything not live  

### Phase D — Review editions & present mode

- Dated packs  
- Present mode  
- Optional PDF *export* (export only — product remains living page)  

### Phase E — Multi-client framework

- Generalized Executive Review Pack  
- Second client only after Primal V1 proves the pattern  

---

## 13. Risks and open decisions

### Risks

| Risk | Mitigation |
|---|---|
| Confused with Partnership briefing | Distinct nav label + first-line job statement; cross-link, don’t merge |
| Looks like a dashboard | No KPI strip in first viewport; narrative-first sections |
| Overselling analytics | Provenance labels; Activating empty states; no fake GA4 |
| Overselling Primal OS | Future-only; no pricing; separate engagement language |
| Domain traffic drop misread | Frame as consolidation to `primalmotorsports.com` |
| Conversion metric ambiguity | Say “tracked conversion actions,” not “customers won” |
| Screenshot staleness | Caption with date; refresh pack when 2.0 launches |
| Empty audit docs | Do not block V1; fill audits later as evidence appendices |

### Open decisions

1. **Present mode in V1?** Recommendation: no — Phase D  
2. **Persist packs in Payload for V1?** Recommendation: no — authored pack first  
3. **Include Driver Portal visual?** Recommendation: yes, only in Vision with Future label  
4. **Show absolute Ads spend?** Recommendation: yes — leadership already owns the investment; keep framing calm  
5. **Default period?** Recommendation: “Partnership evidence through July 20, 2026” until live period picker exists  
6. **Who is primary audience copy?** Recommendation: Adam + leadership (board-ready), not day-to-day operators  

---

## 14. Final recommended build scope for Version 1

### In scope (V1)

- Module name **Executive Review** at `/portal/executive-review`  
- Headquarters nav placement after Partnership  
- One long editorial page with sticky/jump chapter rail  
- All 8 sections (§00–§07) with Built / Activating / Future discipline  
- Curated Ads + GSC evidence snapshots with provenance labels  
- Screenshot-driven platform evolution and workspace chapters  
- Roadmap lanes + honest Primal OS Future close  
- Reuse CES briefing/EP visual language and Executive Memory  
- Cross-links from Overview and Partnership  
- TypeScript-safe CES registration + Primal profile enablement  
- No pricing · no fake live analytics · no Primal OS delivery claims  

### Out of scope (V1)

- Application work beyond planning is gated until implementation is requested  
- Live Ads provider implementation  
- GA4 entitlement enablement  
- PDF/slide generators as the product  
- New Payload collection (unless pack authorship becomes painful)  
- Multi-client rollout  
- Present mode / review edition history  

### Success criteria for V1

Adam can open Executive Review and, within 30 seconds, understand:

1. The foundation is built  
2. The customer platform is evolving toward launch  
3. Demand and search evidence support the investment  
4. The partnership workspace is how leadership operates with KXD  
5. What is Built vs Activating vs Future — including Primal OS honesty  

---

## Appendix A — Suggested V1 chapter rail labels

1. Stance  
2. Foundation  
3. Platform  
4. Demand  
5. Workspace  
6. Impact  
7. Roadmap  
8. Vision  

## Appendix B — Systems map (for implementers later)

```
Business systems / source assets
        ↓
Executive Memory + curated Evidence Snapshots
        ↓
Executive Review Pack (Primal)
        ↓
CES Executive Review page (portal)
        ↓
Leadership reading / board presentation
```

Live reporting joins later at the Evidence Snapshots layer — not by replacing the narrative spine.

---

*Document owner: KXD OS product architecture*  
*Created for planning only — no application code changes accompany this file.*
