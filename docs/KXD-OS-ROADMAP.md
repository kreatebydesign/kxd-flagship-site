# KXD OS Roadmap

**Edition 1 · Engineering & Foundation Progress**  
**Status:** Living document — implementation truth from repository  
**Companion:** `docs/KXD-OS-PRODUCT-ROADMAP.md` (5–10 year product compass)

> This roadmap tracks **what is built** and **what is next** in Edition 1.  
> For long-term product eras (Foundation → Founder Freedom), see the Product Roadmap.

---

## Edition 1 North Star

KXD OS evolves from software that **organizes** work → **understands** work → **prepares** work → **executes** repeatable work — becoming calmer as it becomes more capable.

**Current registry phase:** `12A.2` — KXD Work Items Foundation (`lib/platform/registry.ts`)

---

## Completed Phases

### Platform & Operations (registry)

| Phase | Title | Status |
|-------|-------|--------|
| 6B | Executive Dashboard | ✅ Complete |
| 8A | Edition Framework | ✅ Complete |
| 10A | Performance Reports | ✅ Complete |
| 11A | Architecture Assessment | ✅ Complete |
| 11B | Platform Language Map | ✅ Complete |
| 11C | Platform Boundary Inventory | ✅ Complete |
| 11D | Platform Progress Dashboard | ✅ Complete |
| 12A.2 | KXD Work Items Foundation | ✅ Complete |

### Experience & Craft (KHIG)

| Phase | Title | Status | Report |
|-------|-------|--------|--------|
| 16B | KHIG Implementation | ✅ Complete | `design-system/khig/PHASE-16B-IMPLEMENTATION-REPORT.md` |
| 16C | Emotional Design & Daily Rituals | ✅ Complete | `design-system/khig/PHASE-16C-IMPLEMENTATION-REPORT.md` |

**16C deliverables:** Morning Brief (`/brief`), Focus Mode (`/focus`), Weekly Review (`/review`), `lib/rituals/`, ritual CSS, OperationsShell links.

### Intelligence Pipeline Foundations (Phase 17)

Additive layers — **not yet wired to UI, rituals, or Executive Intelligence replacement.**

| Phase | Title | Status | Location |
|-------|-------|--------|----------|
| 17A | Observer | ✅ Complete | `lib/observer/` |
| 17B | Business Brain | ✅ Complete | `lib/business-brain/` |
| 17C | Pulse Engine | ✅ Complete | `lib/pulse/` |
| 17D | Executive Narrative | ✅ Complete | `lib/executive-narrative/` |
| 17E | Business Context | ✅ Complete | `lib/business-context/` |

| Phase | Report |
|-------|--------|
| 17A | `design-system/khig/PHASE-17A-IMPLEMENTATION-REPORT.md` |
| 17B | `design-system/khig/PHASE-17B-BUSINESS-BRAIN-REPORT.md` |
| 17C | `design-system/khig/PHASE-17C-PULSE-REPORT.md` |
| 17D | `design-system/khig/PHASE-17D-EXECUTIVE-NARRATIVE-REPORT.md` |
| 17E | `design-system/khig/PHASE-17E-BUSINESS-CONTEXT-REPORT.md` |

---

## Current State — Phase 17

Phase 17 established the **deterministic intelligence stack**:

```
Observer → Business Brain → Pulse → Executive Narrative
                ↑
         Business Context (interpretation lens)
```

### What works today

| Capability | Entry point | Wired to UI |
|------------|-------------|-------------|
| Observer | `runObserver()` | No |
| Business Brain | `runBusinessBrain()` | No |
| Pulse | `runPulse()` | No |
| Executive Narrative | `runExecutiveNarrative()` | No |
| Business Context | `loadBusinessContext()` | No |
| Executive Intelligence | `getExecutiveBriefing()` | Yes — Intelligence + Rituals |
| Executive Rituals | `/brief`, `/focus`, `/review` | Yes |

### What Phase 17 explicitly did not do

- Replace `lib/intelligence/briefings/`
- Modify Morning Brief, Focus Mode, or Weekly Review behavior
- Build Pulse UI
- Execute automation
- Add AI generation

---

## Planned Platform Phases (registry)

From `lib/platform/registry.ts` — not yet implemented:

| Phase | Title | Focus |
|-------|-------|-------|
| 12 | Timeline Unification | Activity Engine as sole timeline ingress |
| 13 | Workspace Consolidation | Client Command canonical; consolidate Client Workspace |
| 14 | Automation Module Connection | Wire modules to automation publishers |
| 15 | Intelligence Performance | Incremental loading, caching, materialized health |
| 16 | Live Analytics Completion | GA4 / Search Console into reporting |
| 17 (registry) | Lead Funnel Unification | Normalize research-leads, sales-leads, audits |

> **Note:** Registry "Phase 17" (Lead Funnel) is distinct from engineering "Phase 17" (Intelligence Pipeline Foundations).

---

## Future Direction (Edition 1 Priorities)

Ordered by architectural dependency:

### 1. Intelligence pipeline integration

Wire Phase 17 outputs into Executive Rituals and Intelligence — without replacing existing briefing behavior until explicitly approved.

| Target | Source |
|--------|--------|
| Morning Brief narrative enrichment | `runExecutiveNarrative()` digest |
| Focus Mode awareness | Pulse watchlist + priorities |
| Weekly Review changes | Pulse changes + stable signals |
| Brain signal reframing | Business Context lenses |

### 2. Business Context persistence

Move from in-process default (`KXD_STUDIO_BUSINESS_CONTEXT`) to durable storage — without changing read APIs.

### 3. Timeline unification (registry Phase 12)

Retire legacy `client-timeline-events` writes. Enforce Activity Engine as sole ingress.

### 4. Workspace consolidation (registry Phase 13)

Make Client Command the canonical per-client HQ. Reduce parallel Client Workspace paths.

### 5. Automation connection (registry Phase 14)

Connect Observer `automation` metadata and Pulse posture to automation rules — **execution requires explicit approval per phase.**

### 6. CES expansion

Extend CES module registry beyond Website Review — reports, assets, mobile — per `CLIENT-EXPERIENCE-SYSTEM-ARCHITECTURE.md`.

---

## Subsystem Maturity (snapshot)

From `lib/platform/registry.ts`:

| Subsystem | Maturity | Status |
|-----------|----------|--------|
| Client Command | production | stable |
| Executive Dashboard | production | stable |
| Intelligence | production | stable |
| Sales / Proposals | production | stable |
| Timeline | beta | consolidation |
| Activity Engine | beta | active |
| Portal | beta | active |
| Brain | beta | active |
| Automation | beta | active |
| Client Success | alpha | planned |
| Editions | alpha | active |

---

## Edition 1 Boundaries (do not cross without explicit request)

- No Edition 2 multi-tenant SaaS concepts
- No AI / LLM generation in intelligence foundations
- No platform redesign
- No duplicate intelligence layers
- No automation execution without approval
- No UI changes unless requested

---

## Documentation Map

| Document | Purpose |
|----------|---------|
| `KXD-OS-ARCHITECTURE.md` | Systems, folders, pipeline |
| `KXD-OS-PHILOSOPHY.md` | Vision and principles |
| `KXD-OS-ROADMAP.md` | This document — build progress |
| `KXD-OS-PRODUCT-ROADMAP.md` | 5–10 year product eras |
| `KXD-OS-CONSTITUTION.md` | Experience standard |
| `.cursor/rules/kxd-os-architecture.mdc` | Cursor agent rule |

---

## How to Update This Roadmap

1. Complete a phase → add row to Completed Phases with report path
2. Update `lib/platform/registry.ts` when platform phases ship
3. Update Current State when pipeline layers wire to UI
4. Do not invent phases that are not in the repository or reports
