# KXD OS Architecture

**Edition 1 · Implementation Reference**  
**Status:** Permanent — reflects repository structure as source of truth  
**Companion:** `docs/KXD-OS-PHILOSOPHY.md`, `docs/KXD-OS-ROADMAP.md`, `docs/KXD-OS-CONSTITUTION.md`

---

## Overview

KXD OS is a monolithic **Next.js 16** application with **Payload CMS 3** embedded. Public marketing, studio operations, client portal, and CMS admin share one codebase and deployment.

```
kxd-rebuild/
├── app/
│   ├── (site)/              # Public marketing site
│   ├── (payload)/           # Payload admin + REST API
│   ├── admin/operations/    # KXD OS operations workspaces
│   └── portal/              # Client HQ (CES)
├── components/
│   ├── admin/operations/    # Operations UI
│   └── os/                  # Shared OS primitives
├── design-system/
│   ├── os/                  # KXD OS tokens and styles (kxd-os.css)
│   └── khig/                # KHIG phase reports
├── docs/                    # Architecture and product documentation
├── lib/                     # Business logic and loaders
├── payload/                 # Collections, access, hooks
└── scripts/                 # Seeds and verification
```

---

## Current Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 App Router (`next@16.2.7`) |
| CMS / ORM | Payload CMS 3 (`@payloadcms/*@3.84`) |
| Database | PostgreSQL (production) / SQLite (local fallback) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 + `design-system/os/styles/kxd-os.css` |
| Payments | Stripe (webhook prepared) |
| Analytics | GA4 / GTM (prepared) |

---

## Major Systems

### Shared Core

The **system of record** — Payload collections and server loaders that power operations.

| Area | Location | Notes |
|------|----------|-------|
| Collections | `payload/collections/` | Clients, tasks, timeline, requests, proposals, etc. |
| Client Command | `lib/client-command/` | Per-client operational HQ |
| Activity publishing | `lib/client-command/activity/` | Canonical client activity ingress |
| Financial Command | `lib/financial-command/` | Revenue and billing views |
| Platform registry | `lib/platform/registry.ts` | Subsystem maturity and phase tracking |

Shared Core loaders are reused across Intelligence, Observer, and workspaces. **Do not fork parallel data access.**

### Client Experience System (CES)

**CES powers the experience. Shared Core powers the platform.**

| Area | Location | Notes |
|------|----------|-------|
| CES core | `lib/ces/` | Types, modules, profile resolution |
| Experience profiles | `lib/ces/profile/` | Client identity, visual, hospitality |
| Website Review | `lib/ces/modules/website-review/` | First CES module |
| Portal language | `lib/ces/copy/` | Client-appropriate vocabulary |

Reference: `docs/CLIENT-EXPERIENCE-SYSTEM-ARCHITECTURE.md`

### Connected Workspace

The **client-facing connected workspace** — Portal modules under `/portal/*` that present Shared Core data through CES.

| Route area | Purpose |
|------------|---------|
| `/portal` | Client HQ home |
| `/portal/requests` | Client requests |
| `/portal/deliverables` | Deliverables |
| `/portal/reports` | Reports |
| `/portal/website-review` | Website Review (CES) |

Admin operations remain separate under `/admin/operations/*`.

### Timeline

Permanent **relationship memory** for the studio.

| Area | Location |
|------|----------|
| Executive Timeline | `lib/executive-timeline/` |
| Operations UI | `app/admin/operations/timeline/` |
| Activity Engine | `lib/client-command/activity/` |

Timeline reads `executive-timeline-events`. Activity Engine is the canonical publish path for client activity.

### Work Engine

The **execution layer** for studio work.

| Area | Location |
|------|----------|
| Work facade | `lib/work/` |
| Work Items | `lib/work-items/` |
| Work integration | `lib/work/integration/` |
| Operations UI | `app/admin/operations/work/` |

Work Items connect to Client Command, portal requests, and Activity Engine hooks.

### Executive Intelligence Engine (Phase 28)

The **canonical founder-level reasoning service**. Deterministic. No AI generation.

| Area | Location |
|------|----------|
| Engine domain | `lib/executive-intelligence/` |
| Evidence | `lib/executive-intelligence/evidence/` |
| Interpretation / Decision / Recommendation | `interpret/`, `decide/`, `recommend/` |
| Narrative input | `lib/executive-intelligence/narrative/` |
| Surface adapters | `lib/executive-intelligence/adapters/` |

Pipeline:

```
Evidence → Interpretation → Decision → Recommendation → Narrative Input
```

**Permanent rule:** No new founder-level recommendation logic may be introduced outside `lib/executive-intelligence/`.

Boundaries:

| System | Role after Phase 28B |
|--------|----------------------|
| `lib/executive-intelligence/` | Cross-domain arbitration; one primary recommendation; confidence; explainability |
| `lib/intelligence/` | Portfolio analysis evidence supplier — must not choose the founder’s primary action |
| `lib/executive-signals/` | Signal detection evidence supplier — must not outrank the engine |
| `lib/executive-context/` | Transport/composition — carries engine result; does not silently arbitrate |
| `lib/kxd-intelligence/` | Operational coaching consumer — must not re-rank executive priorities |
| Observer → Brain → Pulse → Narrative | Intact platform pipeline — facts/meaning/awareness/prose; does not replace the engine |

Cross-domain arbitration uses DecisionClass 0–5 (integrity → calm). Schedule and portfolio candidates compete in one pool.

Why deterministic before AI: executive trust requires explainable, reproducible judgment. AI may enrich narrative later; it must never own the decision.

Why one primary recommendation: competing primaries recreate the old multi-engine problem. Surfaces adapt presentation; they do not re-rank.

How future systems integrate: add typed evidence adapters; consume `composeExecutiveIntelligence()`; never invent surface-local priority chains.

### Portfolio Intelligence (`lib/intelligence/`)

The **portfolio analysis system** — briefings, health, growth, infrastructure.

| Area | Location |
|------|----------|
| Intelligence engine | `lib/intelligence/` |
| Executive Briefing | `lib/intelligence/briefings/` |
| Briefing narrative | `lib/intelligence/briefings/narrative.ts` |
| Operations UI | `app/admin/operations/intelligence/` |

Briefing priorities and enriched recommendations are **supporting context** after Phase 28B. Primary founder action comes from the Executive Intelligence Engine.

### Executive Rituals

**Daily ritual presentation modes** — not separate products.

| Ritual | Route | Framework |
|--------|-------|-----------|
| Morning Brief | `/admin/operations/brief` → Today | `lib/rituals/` (first action from engine) |
| Focus Mode | `/admin/operations/focus` | `lib/rituals/focus-builder.ts` (engine primary) |
| Weekly Review | `/admin/operations/review` | `lib/rituals/review-builder.ts` (period context; full engine migration deferred) |
| Executive Today | `/admin/operations/today` | `lib/executive-today/` (engine + calendar evidence) |

Rituals present engine decisions. They must not independently decide what matters.

---

## Intelligence Pipeline (Phase 17 Foundations)

Additive layers that compose without replacing Executive Intelligence.

```
Business Systems
      ↓
Observer (lib/observer/)
      ↓
Observation Registry + History
      ↓
Business Brain (lib/business-brain/)
      ↓
Pulse (lib/pulse/)
      ↓
Executive Narrative (lib/executive-narrative/)
      ↓
Executive Rituals (future wiring)
      ↓
Automation (lib/automation/ — future execution)
```

| Layer | Entry point | Question |
|-------|-------------|----------|
| Observer | `runObserver()` | What happened? |
| Business Brain | `runBusinessBrain()` | What does it mean? |
| Pulse | `runPulse()` | What changed? What deserves awareness? |
| Executive Narrative | `runExecutiveNarrative()` | How should a founder understand this? |
| Business Context | `loadBusinessContext()` | How does this business interpret events? |

### Separation of concerns

| Concern | Layer | Rule |
|---------|-------|------|
| Facts | Observer | Never recommend or automate |
| Meaning | Business Brain | Never execute |
| Movement | Pulse | Never recommend actions |
| Explanation | Executive Narrative | Never decide |
| Context | Business Context | Never override facts |
| Action | Automation / Intelligence recommendations | Explicit human commit |

### Observer modules (`lib/observer/observers/`)

Timeline, work, review, communications, client-request, deliverables, business-health, relationship-health, operational-health, brain-memory.

### Business Context (`lib/business-context/`)

Interpretation lenses per business model (agency, construction, restaurant, etc.). In-process default: `KXD_STUDIO_BUSINESS_CONTEXT`.

---

## Architecture Flow (End to End)

```
┌─────────────────────────────────────────────────────────────┐
│                    SHARED CORE (Payload)                     │
│  clients · tasks · timeline · requests · proposals · ...    │
└───────────────────────────┬─────────────────────────────────┘
                            │ loaders
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
  Client Command      Work Engine          Intelligence
  Timeline            Portal/CES          Executive Dashboard
        │                   │                   │
        └───────────────────┼───────────────────┘
                            ▼
                    Observer (facts)
                            ▼
              Business Brain → Pulse → Narrative
                            │
              Business Context (interpretation lens)
                            ▼
              Rituals · Intelligence UI · Automation (future)
```

---

## Folder Organization (Key `lib/` Modules)

| Module | Path |
|--------|------|
| Observer | `lib/observer/` |
| Business Brain | `lib/business-brain/` |
| Pulse | `lib/pulse/` |
| Executive Narrative | `lib/executive-narrative/` |
| Business Context | `lib/business-context/` |
| Intelligence | `lib/intelligence/` |
| Rituals | `lib/rituals/` |
| Client Command | `lib/client-command/` |
| Executive Timeline | `lib/executive-timeline/` |
| Work / Work Items | `lib/work/`, `lib/work-items/` |
| CES | `lib/ces/` |
| Automation | `lib/automation/` |
| Brain (portfolio) | `lib/brain/` |
| Platform registry | `lib/platform/` |
| Editions | `lib/editions/` |
| Design tokens | `lib/kxd-os/`, `design-system/os/` |

---

## Completed Foundations

### Platform (registry — `lib/platform/registry.ts`)

| Phase | Title | Status |
|-------|-------|--------|
| 6B | Executive Dashboard | Completed |
| 8A | Edition Framework | Completed |
| 10A | Performance Reports | Completed |
| 11A–11D | Architecture assessment, language map, boundaries, progress dashboard | Completed |
| 12A.2 | KXD Work Items Foundation | Completed |

### KHIG & Rituals

| Phase | Title | Report |
|-------|-------|--------|
| 16B | KHIG Implementation | `design-system/khig/PHASE-16B-IMPLEMENTATION-REPORT.md` |
| 16C | Emotional Design & Daily Rituals | `design-system/khig/PHASE-16C-IMPLEMENTATION-REPORT.md` |

### Intelligence Pipeline (additive, not wired to UI)

| Phase | Title | Location |
|-------|-------|----------|
| 17A | Observer | `lib/observer/` |
| 17B | Business Brain | `lib/business-brain/` |
| 17C | Pulse | `lib/pulse/` |
| 17D | Executive Narrative | `lib/executive-narrative/` |
| 17E | Business Context | `lib/business-context/` |

---

## Operations Routes (Primary)

| Route | System |
|-------|--------|
| `/admin/operations/today` | Today cockpit |
| `/admin/operations/intelligence` | Executive Intelligence |
| `/admin/operations/brief` | Morning Brief ritual |
| `/admin/operations/focus` | Focus Mode ritual |
| `/admin/operations/review` | Weekly Review ritual |
| `/admin/operations/work` | Work Engine |
| `/admin/operations/timeline` | Timeline |
| `/admin/operations/client-command` | Client Command |
| `/admin/operations/executive` | Executive Dashboard |
| `/admin/operations/brain` | Brain workspace |
| `/admin/operations/automation` | Automation (rules, not auto-execution in foundations) |

---

## Development Rules

1. Prefer additive changes over rewrites
2. Reuse existing loaders — do not duplicate observer or briefing logic
3. Do not query business systems from Brain/Pulse/Narrative if observations already provide context
4. No UI changes unless explicitly requested
5. No automation execution without explicit approval
6. Preserve KHIG calm executive standards
7. Run `npm run build` after major implementation

---

## Related Documents

| Document | Purpose |
|----------|---------|
| `KXD-OS-CONSTITUTION.md` | Experience standard |
| `KXD-OS-VISUAL-MANIFESTO.md` | Visual craft |
| `STUDIO-INTELLIGENCE-ARCHITECTURE.md` | Long-term intelligence architecture |
| `CLIENT-EXPERIENCE-SYSTEM-ARCHITECTURE.md` | CES architecture |
| `KXD-OS-PRODUCT-ROADMAP.md` | Long-term product compass (5–10 year) |
| `.cursor/rules/kxd-os-architecture.mdc` | Cursor agent architecture rule |
