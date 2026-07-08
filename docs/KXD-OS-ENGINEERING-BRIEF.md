# KXD OS Engineering Brief

**Edition 1 · Permanent Onboarding Document**  
**Audience:** Engineers and AI coding assistants working on KXD OS  
**Status:** Permanent — read before making architectural decisions  
**Companion:** `docs/KXD-OS-CURRENT-STATE.md`, `docs/KXD-OS-ARCHITECTURE.md`

---

## Purpose

This document orients anyone — human or AI — who works on KXD OS. It is not a feature spec. It is the **engineering contract** for how the system is built, extended, and protected.

KXD OS is long-lived studio software. Decisions should favor clarity, reuse, and calm authority over speed-at-any-cost.

---

## 1. Product Vision

### What KXD OS is

KXD OS is a **business operating system** designed to continuously understand and help operate a business.

It is studio software for Kreate by Design — the private environment where relationships, work, decisions, and momentum accumulate with calm authority.

Product value is **accumulated business context**. The ultimate KPI is **founder time reclaimed**.

### What KXD OS is not

| KXD OS is NOT | Why |
|---------------|-----|
| A CRM | Relationships are not pipeline rows |
| A dashboard | Dashboards display; KXD OS understands |
| An AI chatbot | Intelligence is moment-first and evidence-bound |
| A task manager | Work is execution with memory, not infinite cards |
| A generic admin panel | Operations should feel editorial and intentional |

### The operating system promise

KXD OS progressively:

1. **Remembers** — Timeline, Activity Engine, Business Memory
2. **Understands** — Observer through Executive Narrative
3. **Prepares** — Rituals, Intelligence, recommendations with evidence
4. **Executes** — Work Engine, automation (with human approval)

---

## 2. Architecture Principles

### Protect Edition 1 architecture

Edition 1 has a defined intelligence pipeline and platform layer order. Do not collapse layers, skip layers, or create parallel intelligence paths without explicit approval.

### Prefer additive development

Extend existing modules. Do not rewrite completed phases. New capability should plug into established entry points (`runObserver()`, `loadRitualIntelligence()`, `evaluateClientLaunchReadiness()`, etc.).

### Avoid duplicate systems

Before building, search for existing loaders, publishers, and adapters. Shared Core loaders are canonical. Intelligence layers consume observations — they do not re-query business systems for the same facts.

### Preserve system boundaries

Each layer has a single responsibility. Facts, interpretation, awareness, narrative, memory, presentation, and action are separate concerns.

### Facts before interpretation

Observer output is the source of truth for what happened. Brain, Pulse, and Narrative interpret — they do not invent events.

### Interpretation before action

Recommendations, automation, and execution consume interpreted state. They do not bypass the pipeline.

### No architecture drift

Do not introduce Edition 2 concepts, parallel platforms, or "temporary" shortcuts that become permanent forks.

### Premium software craftsmanship

KHIG standards apply: calm executive UI, editorial typography, intentional motion, evidence-bound language. Complex underneath. Simple on top. See `docs/KXD-OS-CONSTITUTION.md` and `design-system/os/`.

---

## 3. Intelligence Layer Responsibilities

### Architecture flow

```
Business Systems
      ↓
Observer
      ↓
Observation Registry + History
      ↓
Business Brain
      ↓
Pulse
      ↓
Executive Narrative
      ↓
Business Context
      ↓
Business Memory
      ↓
Executive Rituals
      ↓
Client Workspace
      ↓
Future Automation
```

### Layer reference

| Layer | Location | Responsibility | Entry point |
|-------|----------|----------------|-------------|
| **Observer** | `lib/observer/` | Facts only — what happened across business systems | `runObserver()` |
| **Business Brain** | `lib/business-brain/` | Meaning and patterns — what it means in business terms | `runBusinessBrain()` |
| **Pulse** | `lib/pulse/` | Movement and awareness — what changed, what to watch | `runPulse()` |
| **Executive Narrative** | `lib/executive-narrative/` | Founder-level explanation — how to understand the state | `runExecutiveNarrative()` |
| **Business Context** | `lib/business-context/` | Business-specific interpretation lens (agency, construction, etc.) | `loadBusinessContext()` |
| **Business Memory** | `lib/business-memory/` | Historical evolution — how the business changed over time | `runBusinessMemory()` |
| **Executive Rituals** | `lib/rituals/` | Presentation layer — Brief, Focus, Review | `loadRitualIntelligence()` |
| **Executive Intelligence** | `lib/intelligence/` | Live deterministic briefing system (parallel, not replaced) | `getExecutiveBriefing()` |
| **Automation** | `lib/automation/` | Future execution — rules exist; autonomous run requires approval | `createAutomationEvent()` |

### Rules per layer

**Observer — facts only.**  
Never recommend, automate, or render UI. Observations are registered and historied.

**Business Brain — meaning and patterns.**  
Never execute actions or mutate business systems.

**Pulse — movement and awareness.**  
Never recommend specific actions. Surfaces change, watchlist, posture.

**Executive Narrative — founder-level explanation.**  
Never decide or automate. Produces readable narrative sections.

**Business Context — interpretation lens.**  
Never overrides facts. Reframes signals for business model context.

**Business Memory — historical evolution.**  
Never invents history. Traces milestones and trends to trusted sources.

**Executive Rituals — presentation layer.**  
Consume intelligence via adapters (`lib/rituals/intelligence/`). No direct business system queries. No new intelligence logic in UI components.

---

## 4. Development Standards

### Reuse existing loaders

| Need | Use |
|------|-----|
| Client operational data | `lib/client-command/` loaders |
| Timeline writes | `lib/executive-timeline/create-event.ts`, Activity Engine publish paths |
| Portal session | `lib/portal/session.ts` |
| CES profile | `lib/ces/server.ts` → `resolveExperienceProfile()` |
| Ritual intelligence | `lib/rituals/intelligence/load.ts` |
| Client launch readiness | `lib/client-launch/readiness.ts` |
| Briefing (live) | `lib/intelligence/` |

Do not create parallel data access for the same concern.

### Maintain separation of concerns

- **Payload hooks** publish activity; they do not render UI.
- **Server loaders** fetch and compose; they do not contain presentation logic.
- **React components** present; they do not query Payload directly.
- **Intelligence layers** interpret; they do not execute.

### Avoid direct database queries from presentation layers

UI routes and components call server loaders or API routes. Loaders use Payload with `overrideAccess` where appropriate. No raw SQL from components.

### Avoid business logic duplication

If logic exists in Observer, Brain, Pulse, or Narrative — extend it there. Rituals and Intelligence UI are consumers, not re-implementations.

### Payload-safe modules for hooks and CLI

Modules imported by `payload.config.ts` hooks and `tsx` scripts must not use `import "server-only"`. Follow the pattern in `lib/financial-command/timeline-publish.ts` and `lib/work/integration/events.ts`.

### Prioritize reliability and maintainability

- Idempotent seeds and verification scripts
- Explicit error handling in hooks (log, do not throw on publish failure)
- `npm run build` after major implementation
- Minimal scope diffs — solve the root problem, not adjacent refactors

### UI and automation gates

- **No UI changes** unless explicitly requested
- **No automation execution** without explicit approval
- **No AI generation** in Edition 1 intelligence foundations unless requested
- **No commits** unless the user asks

---

## 5. Platform Systems (Non-Intelligence)

These are active Edition 1 systems. Do not duplicate them.

| System | Location | Role |
|--------|----------|------|
| Shared Core | `payload/`, `lib/client-command/` | System of record |
| CES | `lib/ces/` | Client-facing experience layer |
| Connected Workspace | `lib/portal/connected-workspace.ts` | Portal home data composition |
| Timeline | `lib/executive-timeline/` | Relationship memory |
| Work Engine | `lib/work/`, `lib/work-items/` | Execution layer |
| Client Launch | `lib/client-launch/` | Launch wizard + readiness evaluation |
| Website Review Inbox | `lib/website-review-inbox/` | Admin review workflow |
| Portal | `app/(portal)/portal/`, `lib/portal/` | Client authentication and HQ |
| Platform registry | `lib/platform/registry.ts` | Subsystem maturity tracking |

---

## 6. Future Direction

Edition 1 evolves toward:

### Premium executive experience

Rituals and Intelligence should feel like a trusted chief of staff — calm, evidence-bound, never alarmist. KHIG is the craft standard.

### Trusted business understanding

The Phase 17 stack deepens over time. Business Memory adds longitudinal context. Context lenses adapt interpretation without changing facts.

### Human-approved automation

Automation rules and Observer metadata prepare for execution. Nothing runs autonomously without explicit phase approval and human commit.

### Scalable client operations

Every new client follows the launch path validated in Phase 18C–18D:

```
Client created → Workspace configured → Modules enabled →
Portal access created → Welcome complete → Client ready
```

Use `lib/client-launch/` and `npm run verify:client-launch` — not one-off scripts per client.

---

## 7. Before You Build

Ask:

1. Does this strengthen the whole platform?
2. Does it improve business understanding?
3. Is it additive to an existing layer — not a parallel one?
4. Does it respect facts → interpretation → awareness → narrative → memory → action?
5. Is there an existing loader or adapter to reuse?
6. Will this cause architecture drift or duplicate intelligence?

If any answer is uncertain, read `docs/KXD-OS-CURRENT-STATE.md` and the relevant phase report in `design-system/khig/`.

---

## 8. Source of Truth Hierarchy

| Priority | Document |
|----------|----------|
| 1 | Repository implementation (`lib/`, `payload/`, `app/`) |
| 2 | `docs/KXD-OS-CURRENT-STATE.md` |
| 3 | `docs/KXD-OS-ARCHITECTURE.md` |
| 4 | `design-system/khig/PHASE-*-REPORT.md` |
| 5 | `docs/KXD-OS-ROADMAP.md` |
| 6 | `.cursor/rules/kxd-os-architecture.mdc` |

When docs and code disagree, **code wins** — then update the docs.

---

*This brief is permanent engineering memory. It does not replace phase reports or architecture reference — it orients builders before they touch the system.*
