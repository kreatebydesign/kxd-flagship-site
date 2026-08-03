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

## Authenticated Operator Experience (product track)

This track is distinct from registry phase numbers and from Intelligence Pipeline Phase 17. It records recent authenticated-operator product work without renumbering historical engineering phases.

| Phase | Title | Status | Notes |
|-------|-------|--------|-------|
| Phase 2 | Authenticated theming + portal date stabilization | ✅ Complete (historical) | Theme: `lib/shell/theme.ts`, Light / Dark / System. Portal dates: `a94ca60`. Later staff/Intelligence commits remain legitimate current architecture. |
| Phase 3 | Client & Relationship Intelligence | ✅ Production-complete | Private operator workspace connecting clients, contacts, relationships, preferences, and events. Plan: `docs/PHASE-3-CLIENT-RELATIONSHIP-INTELLIGENCE.md`. Batches A–E published and production-verified at `fdb0348`. Closed — do not reopen. |
| **Phase 4** | **Multi-Client Portal Access & Account Context** | **Batches A–I code-complete; Batch J = identity security production rollout (paused with Primal analytics blockers)** | Plan: `docs/PHASE-4-MULTI-CLIENT-PORTAL.md`. Identity: `docs/PHASE-4-PORTAL-IDENTITY-SECURITY.md`. Batch J: `docs/PHASE-4-BATCH-J-IDENTITY-ROLLOUT.md` + pilot runbook. Verifiers: Batch H completion (`verify:phase4-multi-client-portal-completion`) + `verify:phase4-portal-identity-security`. Real client activation still pilot-gated. **Not fully production-complete.** Batch J.2B.2, Primal walkthrough, and reporting pilot remain paused. Future Connect/Support/Academy/Meetings/Social Studio/weather/personalized shell remain roadmap — not Batch J. |
| **Phase 5** | **Client Billing Visibility, Stripe Invoice Status & Monthly Work Summaries** | ✅ **Complete** (Batches 5A–5D; Batch 5E intentionally skipped) | Spec: `docs/PHASE-5-CLIENT-BILLING-VISIBILITY.md`. Parallel non-Primal lane; does not complete or waive Phase 4. Batch 5A: monthly summary on Work & Performance. Batch 5B: Stripe invoice read foundation. Batch 5C: portal Billing UI. Batch 5D: staff invoice visibility on Commercial Agreements detail. Batch 5E skipped so work-summary and invoice facts stay separate. TEST-mode read-only; no invoice management, live Stripe expansion, receipts, accounting, or Financial Command expansion. Hosting Transitions and KXD invoice emails excluded. |
| **Phase 6** | **KXD Connect** | **Batches C0–C6 complete** (through readiness review / internal release gate). Production rollout not authorized. | Spec: `docs/PHASE-6-KXD-CONNECT.md`. Runbook: `docs/PHASE-6-CONNECT-LOCAL-DOGFOOD-RUNBOOK.md`. C5: dogfood period. C6: readiness gate (meters auth hardened). **Does not block** KXD OS Founding Client Early Access. |
| **Phase 7** | **Today** | **Batches A–B approved; Batch C implemented** | Spec: `docs/PHASE-7-TODAY.md`. Today is the sole founder home. Batch C enforces home ownership, navigation philosophy, login landing, and product identity — no visual redesign. Next: Batch D (presentation alignment) when authorized. |

**Phase 3 product outcome:** durable private business context for future Business Memory — not portal, not public, not calendar rewrite, not ritual/Business Memory integration in this phase.

**Phase 3 privacy boundary:** relationship context, preferences, dietary notes, accessibility notes, and internal event intelligence stay authenticated and operator-only. Never enter public HTML, metadata, JSON-LD, public APIs, public serialized props, client portals, or client-facing API responses.

**Phase 4 product outcome:** one portal user may access multiple authorized independent clients with server-validated active-account context and no cross-account leakage — reusable architecture; Cusick first.

**Phase 5 product outcome:** clients see Stripe-backed invoice status with Stripe-hosted payment actions, plus an honest monthly completed-work summary — visibility and context only; not an accounting platform, payment vault, or Work Ledger. Reuses Phases 35–37; independent of Primal analytics.

**Phase 6 product outcome (C0–C6):** organization-owned Connect tenancy, secure messaging engine, staff-only `/admin/connect` UI, local activation controls, completed local dogfood operating period, and an engineering readiness / internal release gate — not the full Connect shell (no dock/Buddy List/notifications). Production enablement not authorized. Client Communications, Connected Workspace, and `message-kxd` remain distinct and unchanged.

**Phase 7 product outcome (through Batch C):** Today is the permanent founder home. Competing aggregators lose home semantics while remaining destinations. Navigation maps workflows (Today · Work · Clients · Business · Studio · System). Founder login lands on Today; staff landing unchanged. Batches D–G remain for presentation alignment, absorb/retire, weekly snapshot, and Connect seam.

---

## Commercial lifecycle (engineering status)

Local **Commercial Lifecycle Completion & Operator Experience** plus **Security & Controlled Release Gate** hardening are implemented for mock/script-free operator + client paths (private `commercial-documents`, simulated delivery, mock Stripe, adversarial token/document checks).

**Stripe TEST MODE integration** is wired (credential fail-closed, test customer/invoice adapter, commercial lifecycle webhook, operator TEST MODE actions). Real Stripe API execution remains blocked until protected `sk_test_` / `whsec_` credentials are configured locally — see `docs/KXD-OS-COMMERCIAL-LIFECYCLE-RELEASE-GATE.md`.

Production migration, live Stripe, and production email remain **blocked**. Product pillar order: `docs/KXD-OS-PRODUCT-ROADMAP.md` → Future systems.

**Phase 5 (product track)** reuses Phases 35–37 commercial foundations for **read-only** Stripe invoice visibility and monthly work summaries. It does **not** flip `STRIPE_COMMERCIAL_EXECUTION_AUTHORIZED`, does not broaden lifecycle TEST invoicing into live mutations, and does not replace Financial Command. Spec: `docs/PHASE-5-CLIENT-BILLING-VISIBILITY.md`.

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
| `PHASE-3-CLIENT-RELATIONSHIP-INTELLIGENCE.md` | Phase 3 definition + batches (production-complete) |
| `PHASE-4-MULTI-CLIENT-PORTAL.md` | Phase 4 definition + batches (next active phase) |
| `.cursor/rules/kxd-os-architecture.mdc` | Cursor agent rule |

---

## How to Update This Roadmap

1. Complete a phase → add row to Completed Phases with report path
2. Update `lib/platform/registry.ts` when platform phases ship
3. Update Current State when pipeline layers wire to UI
4. Do not invent phases that are not in the repository or reports
