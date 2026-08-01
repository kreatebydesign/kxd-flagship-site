# KXD OS Current State

**Edition 1 · Engineering Memory**  
**Status:** Permanent — repository is the source of truth  
**Last aligned:** July 27, 2026  
**Companion:** `docs/KXD-OS-ENGINEERING-BRIEF.md`, `docs/KXD-OS-ARCHITECTURE.md`, `docs/KXD-OS-ROADMAP.md`

---

## Edition 1 Status

KXD OS Edition 1 is an active, production-shaped business operating system for Kreate by Design. The platform has:

- A complete **Shared Core** (Payload CMS, client command, timeline, work engine)
- A live **client portal** (CES + Connected Workspace) with Website Review as the first external module
- A completed **deterministic intelligence pipeline** (Observer through Business Memory)
- **Executive Rituals** wired to the Phase 17 stack via adapter layer (Phase 18A)
- A **repeatable client launch readiness** pattern (Phase 18D)
- **Primal Motorsports** validated as the first external client workspace (Phase 18C)

Edition 1 is not feature-complete in the product roadmap sense. It is **architecturally coherent** and ready for additive development — not rewrites.

---

## Current Architecture

```
Business Systems (Shared Core — Payload, loaders)
      ↓
Observer                              — facts only
      ↓
Observation Registry + History
      ↓
Business Brain                        — meaning and patterns
      ↓
Pulse                                 — movement and awareness
      ↓
Executive Narrative                   — founder-level explanation
      ↓
Business Context                      — business-specific interpretation lens
      ↓
Business Memory                       — historical evolution
      ↓
Executive Rituals                     — presentation layer (Brief, Focus, Review)
      ↓
Client Workspace / Portal Experience  — CES, Connected Workspace, Website Review
      ↓
Future Automation                     — explicit human approval required
```

**Parallel live system:** `lib/intelligence/` (Executive Intelligence) remains the deterministic briefing engine for Intelligence workspace and legacy ritual data paths. Phase 18A added ritual adapters that consume the Phase 17 stack without replacing Executive Intelligence wholesale.

---

## Completed Major Phases

### Foundation

| Area | Location | Status |
|------|----------|--------|
| Shared Core | `payload/`, `lib/client-command/` | ✅ Operational |
| CES | `lib/ces/` | ✅ Website Review module live |
| Connected Workspace | `lib/portal/connected-workspace.ts`, `/portal/*` | ✅ Live |
| Timeline | `lib/executive-timeline/`, Activity Engine | ✅ Operational |
| Work Engine | `lib/work/`, `lib/work-items/` | ✅ Operational |
| Client Profiles | `lib/executive-client-profile/`, executive collections | ✅ Operational |
| Portal Authentication | `lib/portal/session.ts`, `/portal/login` | ✅ Live |
| Client Portal | `app/(portal)/portal/` | ✅ Live — Primal pilot |

### Intelligence

| Phase | Title | Location | UI wired |
|-------|-------|----------|----------|
| 17A | Observer | `lib/observer/` | No |
| 17B | Business Brain | `lib/business-brain/` | No |
| 17C | Pulse | `lib/pulse/` | No |
| 17D | Executive Narrative | `lib/executive-narrative/` | Rituals only (18A) |
| 17E | Business Context | `lib/business-context/` | Rituals only (18A) |

**Entry points:**

| Layer | Function |
|-------|----------|
| Observer | `runObserver()` |
| Business Brain | `runBusinessBrain()` |
| Pulse | `runPulse()` |
| Executive Narrative | `runExecutiveNarrative()` |
| Business Context | `loadBusinessContext()`, `interpretWithContext()` |
| Business Memory | `runBusinessMemory()` |

### Executive Experience

| Phase | Title | Status | Report |
|-------|-------|--------|--------|
| 16B | KHIG Implementation | ✅ | `design-system/khig/PHASE-16B-IMPLEMENTATION-REPORT.md` |
| 16C | Emotional Design & Daily Rituals | ✅ | `design-system/khig/PHASE-16C-IMPLEMENTATION-REPORT.md` |
| 18A | Executive Ritual Intelligence Integration | ✅ | `design-system/khig/PHASE-18A-EXECUTIVE-RITUAL-INTEGRATION-REPORT.md` |
| 18B | Business Memory & Evolution | ✅ Foundation | `design-system/khig/PHASE-18B-BUSINESS-MEMORY-REPORT.md` |

**Ritual routes:** `/admin/operations/brief`, `/focus`, `/review`  
**Ritual adapters:** `lib/rituals/intelligence/` → `loadRitualIntelligence()`

### Client Operations

| Phase | Title | Status | Report |
|-------|-------|--------|--------|
| 18C | Primal Workspace Validation | ✅ | `design-system/khig/PHASE-18C-PRIMAL-WORKSPACE-VALIDATION-REPORT.md` |
| 18D | Client Launch Readiness | ✅ | `design-system/khig/PHASE-18D-CLIENT-LAUNCH-READINESS-REPORT.md` |

**Primal status:** Core portal and Website Review ready. First external client pilot.  
**Launch readiness:** `lib/client-launch/` — `evaluateClientLaunchReadiness()`, `npm run verify:client-launch`

---

## Current Intelligence Pipeline

### Layer responsibilities

| Layer | Question | Must NOT |
|-------|----------|----------|
| Observer | What happened? | Recommend, automate, render UI |
| Business Brain | What does it mean? | Execute, mutate systems |
| Pulse | What changed? What deserves awareness? | Recommend actions |
| Executive Narrative | How should a founder understand this? | Decide, automate |
| Business Context | How does this business interpret events? | Override facts |
| Business Memory | How has the business evolved over time? | Invent history |
| Executive Rituals | How does the founder start the day? | Replace full workspaces without request |
| Automation | What runs automatically? | Run without explicit approval |

### Separation principle

```
Facts → Interpretation → Awareness → Narrative → Memory → Presentation → Action
```

### Wiring status (as of Phase 18D)

| Consumer | Phase 17 stack | Executive Intelligence |
|----------|----------------|------------------------|
| Morning Brief | ✅ Via `lib/rituals/intelligence/` | Partial legacy paths remain |
| Focus Mode | ✅ Via ritual adapters | Partial legacy paths remain |
| Weekly Review | ✅ Via ritual adapters | Partial legacy paths remain |
| Intelligence workspace | ❌ Not replaced | ✅ Primary surface |
| Business Memory | ❌ Foundation only — no UI | — |
| Client Portal | ❌ Not applicable | — |

---

## Active Systems

### Studio operations (admin)

| System | Route / location |
|--------|------------------|
| Today cockpit | `/admin/operations/today` |
| Client Command | `/admin/operations/client-command` |
| Client Portfolio | `/admin/operations/clients` |
| Work Engine | `/admin/operations/work` |
| Timeline | `/admin/operations/timeline` |
| Review Inbox | `/admin/operations/review-inbox` |
| Portal Access | `/admin/operations/portal-access` |
| Client Launch Wizard | `/admin/operations/client-launch` |
| Executive Dashboard | `/admin/operations/executive` |
| Executive Intelligence | `/admin/operations/intelligence` |
| Executive Rituals | `/admin/operations/brief`, `/focus`, `/review` |
| Automation (rules) | `/admin/operations/automation` |
| Brain workspace | `/admin/operations/brain` |

### Client experience (portal)

| System | Route |
|--------|-------|
| Portal login | `/portal/login` |
| Client HQ home | `/portal` |
| Website Review | `/portal/website-review` |
| Visual review session | `/portal/website-review/session/[revisionId]` |
| Welcome flow | `/portal/welcome` |

### Core libraries

| Module | Path |
|--------|------|
| Observer | `lib/observer/` |
| Business Brain | `lib/business-brain/` |
| Pulse | `lib/pulse/` |
| Executive Narrative | `lib/executive-narrative/` |
| Business Context | `lib/business-context/` |
| Business Memory | `lib/business-memory/` |
| Executive Intelligence | `lib/intelligence/` |
| Rituals | `lib/rituals/` |
| CES | `lib/ces/` |
| Client Launch Readiness | `lib/client-launch/` |
| Portal | `lib/portal/` |
| Client Command | `lib/client-command/` |
| Work Engine | `lib/work/`, `lib/work-items/` |
| Timeline | `lib/executive-timeline/` |
| Automation | `lib/automation/` |
| Platform registry | `lib/platform/registry.ts` |

---

## Current Development Focus

Edition 1 is in the **operate and extend** phase — not redesign.

### Completed product phase (closed)

**Phase 3 — Client & Relationship Intelligence** — ✅ Production-complete (Batches A–E published and verified; HEAD `fdb0348`).

- Plan: `docs/PHASE-3-CLIENT-RELATIONSHIP-INTELLIGENCE.md`
- Operator-only contacts + relationship events; Clients Relationship tab; Events workspace; portfolio connections; privacy hardening
- Remains portal-inaccessible; do not reopen

### Approved next product phase

**Phase 4 — Multi-Client Portal Access & Account Context** — Batches A–H implemented in repository. **Code-complete; awaiting authenticated production rollout QA** (not fully production-complete). Production membership migration already applied; Batches F–H have **no** new migration.

- Plan: `docs/PHASE-4-MULTI-CLIENT-PORTAL.md`
- Rollout checklist: `docs/PHASE-4-PRODUCTION-ROLLOUT-CHECKLIST.md`
- Batch A collection: `portal-client-memberships` (`payload/collections/PortalClientMemberships.ts`)
- Batch A migration: `migrations/20260728_phase4_portal_client_memberships.ts` (additive; backfills from legacy `portal-users.client`)
- Batch A–H verify: `verify:phase4-multi-client-membership`, `verify:phase4-account-switcher`, `verify:phase4-workspace-personalization`, `verify:phase4-work-performance`, `verify:phase4-analytics-visibility`, `verify:phase4-authorized-portfolio`, `verify:phase4-requests-files-reports`, `verify:phase4-multi-client-portal-completion`
- Session resolves authorized `clientId` from memberships (+ legacy fallback); cookie still signs portal user id only
- Portal Access manages memberships; account switcher present; analytics/website-health/reports scoped to active account; authorized portfolio at `/portal/portfolio` for multi-membership users only
- Batch G: requests/files/deliverables/reports/Website Review/Workspace isolation verified; portal “client approvals” locked to existing awaiting-input review/request states (no Approvals product)
- Batch H: completion verifier; account-switcher keyboard/a11y + long-name overflow; rollout checklist; authenticated multi-client production QA **blocked** pending safe production identity inventory
- Remaining open risk: pre-existing public Payload `/media/...` onboarding-asset exposure (not redesigned in Batch H)
- No Cusick production linking yet
- First production configuration remains Cusick account group (four independent clients) after ops readiness + Don/Cusick live QA

### Parallel ops track (migration-independent)

**OTP Carts Launch Readiness — Batch A (Gate Hardening)** — code/docs gate only. Verifier: `npm run verify:otp-carts-readiness`. Does **not** claim Phase 3 or Phase 4 database migrations are complete, does **not** start Phase 4 Batch B, and does **not** invent or link production client IDs.

**Hosting Renewal Readiness — Batch A (Operator Visibility)** — provider-neutral renewal posture on Infrastructure Command from existing `client-infrastructure` fields (`hostingProvider`, `nextRenewalDate`, `domainExpirationDate`, SSL). Verifier: `npm run verify:hosting-renewal-readiness`. Wix is a classification/filter only — **not** a separate system. Hosting-transition **automation** remains deferred (founding-client post-v1). No migration, cron, email, or production data mutation.

**Client Resource Directory — Batch A (Operator Visibility)** — allowlisted safe links and system metadata on Infrastructure client detail from existing `client-infrastructure` (+ `clients.companyWebsite`, soft onboarding access booleans). Verifier: `npm run verify:client-resource-directory`. Not a credential vault; no secrets, migrations, portal exposure, or automated access tests. Secure Credential Vault and broader Internal Resource Center remain deferred.

### Immediate priorities

1. **Phase 4 — Multi-Client Portal Access & Account Context** — Production DB identity gate **cleared** (Vercel Neon store `kxd-flagship-db` / project `mute-violet-81514071` ≡ Target A). Backup/PITR gate **conditionally cleared** on Free plan (instant restore history window max **6 hours**; take a manual Neon snapshot immediately before any production migrate; Launch upgrade recommended for 7-day retention). Production migrations applied successfully (`20260727_phase3_client_relationship_intelligence`, `20260728_phase4_portal_client_memberships`, `20260810_website_audit_report_generator`; `migrate:status` batch 46, Ran = Yes); no production migrations remain pending. Batches A–H implemented in repository (`verify:phase4-multi-client-portal-completion`). Phase 4 remains **not fully production-complete** until authenticated multi-client rollout QA + Don/Cusick four-account readiness. Do not begin a later roadmap phase until that decision is explicit.
2. **Client operations at scale** — Repeat the Primal launch pattern using `lib/client-launch/` for every new client workspace (including OTP Carts readiness before Cusick membership linking). Gate Batch A: `verify:otp-carts-readiness`.
3. **Business Memory integration** — Wire `runBusinessMemory()` into rituals or intelligence when explicitly requested; foundation exists, UI does not. Phase 3 prepared durable relationship context but does not integrate Business Memory yet.
4. **Executive experience polish** — Premium ritual presentation (KHIG) without new intelligence layers.
5. **Human-approved automation** — Connect Observer automation metadata and Pulse posture to rules; no autonomous execution without approval.

### Explicitly not in scope without request

- Edition 2 concepts or platform redesign
- Replacing `lib/intelligence/` with Phase 17 pipeline wholesale
- New duplicate intelligence systems
- AI generation in intelligence foundations
- Autonomous automation execution

### Registry-planned work (not yet implemented)

From `lib/platform/registry.ts` and `docs/KXD-OS-ROADMAP.md`:

- Timeline unification (Activity Engine as sole ingress)
- Workspace consolidation (Client Command canonical)
- Automation module connection
- Intelligence performance (caching, incremental loading)
- Lead funnel unification

---

## Verification Commands

| Command | Purpose |
|---------|---------|
| `npm run build` | Production build gate |
| `npm run verify:client-launch -- --client <slug>` | Client launch readiness |
| `npm run verify:primal-portal` | Primal portal core config (legacy script) |
| `npm run seed:clients` | Seed client roster |
| `npm run seed:primal-experience` | Primal CES profile |

---

## Related Documents

| Document | Purpose |
|----------|---------|
| `KXD-OS-ENGINEERING-BRIEF.md` | Engineer and AI onboarding |
| `KXD-OS-ARCHITECTURE.md` | Full architecture reference |
| `KXD-OS-PHILOSOPHY.md` | Product vision |
| `KXD-OS-ROADMAP.md` | Edition 1 progress and next phases |
| `PHASE-3-CLIENT-RELATIONSHIP-INTELLIGENCE.md` | Phase 3 plan (production-complete) |
| `PHASE-4-MULTI-CLIENT-PORTAL.md` | Phase 4 plan (Batches A–H code-complete; awaiting authenticated rollout QA) |
| `PHASE-4-PRODUCTION-ROLLOUT-CHECKLIST.md` | Phase 4 production rollout / authenticated QA checklist |
| `KXD-OS-CONSTITUTION.md` | Experience standard |
| `CLIENT-EXPERIENCE-SYSTEM-ARCHITECTURE.md` | CES architecture |
| `.cursor/rules/kxd-os-architecture.mdc` | Cursor permanent context |

---

*This document is permanent engineering memory. Update when a major phase completes or architecture wiring changes.*
