# Studio Intelligence Architecture

**Version 1.0 · Foundational Architecture**  
**Status:** Permanent planning standard — no implementation in this document  
**Governed by:** `docs/KXD-OS-CONSTITUTION.md` (experience)  
**Companion documents:** Visual Manifesto, Client Command, Client Success, Business Development, Platform Architecture

> Studio Intelligence is **not** a product inside KXD OS.  
> It is the intelligence layer that quietly exists throughout KXD OS.

---

## Document purpose

This document defines the **long-term architecture** for Studio Intelligence — how KXD OS becomes naturally intelligent without becoming an AI assistant, chatbot, or sidebar product.

**This document does not specify:**

- Database schemas
- API routes
- UI components
- Model providers
- Implementation phases

**This document does specify:**

- Philosophy and boundaries
- Knowledge and context models
- Assistance patterns and triggers
- Teaching and learning lifecycles
- Progressive autonomy levels
- Trust and approval rules
- Realistic five-year product evolution

Architecture governs implementation. The Constitution governs experience. Studio Intelligence must satisfy both.

---

## Relationship to existing KXD OS systems

Studio Intelligence is the **umbrella architecture** for capabilities that already exist in early form and will mature over time. This document does not redesign them — it explains how they compose.

| Existing capability | Current role | Studio Intelligence role |
|---------------------|--------------|--------------------------|
| Activity Engine / Timeline | Permanent relationship memory | Primary evidence source |
| Client Memory (Phase 8D) | Deterministic client signals and scores | Client-scoped intelligence substrate |
| Work Items | Execution layer | Context for "what to do next" |
| Playbooks | Repeatable automation | Level 3–4 execution vehicle |
| Client Success categories | Advisory taxonomy | Output channel for recommendations |
| Executive Notes / Strategy | Founder knowledge | Canonical standards input |
| Brain layer (planned) | Portfolio reasoning | Cross-client synthesis |
| Payload collections | System of record | Ground truth for all knowledge |

Studio Intelligence **extends** these systems. It does not replace them with a parallel intelligence product.

---

## 1. Core philosophy

### What is Studio Intelligence?

Studio Intelligence is the **decision-support and operational memory layer** embedded across KXD OS.

It exists to:

- help the studio make better decisions
- reduce mistakes before they ship
- preserve knowledge across people and time
- teach team members how Kreate works
- automate repeatable work through playbooks
- progressively operate more of Kreate by Design

It is experienced as **the OS knowing what you need** — not as a separate tool you open.

### What Studio Intelligence is not

| Not this | Why |
|----------|-----|
| Chatbot | Conversation is not the interface |
| AI assistant | Assistance is not a persona |
| Sidebar chat window | Intelligence is not a destination |
| Generic LLM wrapper | Context is studio-specific and evidence-bound |
| Dashboard of insights | Signal appears in workflow, not inventory |

### Why it is different from AI assistants

AI assistants are **conversation-first products**. The user initiates, asks open-ended questions, and receives open-ended answers.

Studio Intelligence is **moment-first**:

- It recognizes where you are in the studio
- It knows what object you are working on
- It surfaces guidance only when friction would genuinely decrease
- It proposes **actions with evidence**, not paragraphs without accountability
- It defers to human commit on anything that matters

The founder should rarely think: *"I need to ask AI."*  
The founder should think: *"The OS already prepared this."* or *"That recommendation makes sense — here's why."*

### Why it is different from ChatGPT

ChatGPT has no persistent, structured knowledge of Kreate by Design:

| Dimension | ChatGPT | Studio Intelligence |
|-----------|---------|---------------------|
| Context | User-pasted | OS-native — client, project, timeline, standards |
| Memory | Session or custom GPT | Activity Engine + Client Memory + standards vault |
| Permissions | None | Role-based — what this user may see and do |
| Evidence | Unverifiable | Every recommendation cites signal, record, or standard |
| Actions | Text output | Prepared drafts, work items, playbooks — commit in OS |
| Trust | User judgment only | Trust model with approval tiers |
| Learning | Opaque | Corrections feed studio standards and playbooks |

ChatGPT is a general reasoning engine. Studio Intelligence is a **studio operating layer** — smaller in scope, deeper in context, accountable in output.

### Constitutional alignment

Studio Intelligence must obey:

- **Respect Time** — every capability saves time or enables automation
- **Calm before busy** — sparse surfacing, not alert fatigue
- **Intelligence disappears into the workflow** — no AI chrome
- **More intelligence → less interface** — never more complexity
- **Evidence before recommendation** — especially Growth Opportunities

---

## 2. Knowledge architecture

Studio maintains **layered knowledge** — not a single vector database dump. Each layer has an owner, a lifecycle, and rules for how it may influence decisions.

### Knowledge domains

#### A. Studio canon (founder-owned, slow-changing)

Knowledge that defines *how Kreate operates*.

| Domain | Examples | Source of truth |
|--------|----------|-----------------|
| Company standards | Quality bar, communication tone, escalation rules | Executive Notes, Strategy Vault, Constitution |
| Creative standards | Typography, photography, layout principles | Brand docs, Creative Engine configs |
| Developer standards | Code patterns, launch checklist, infra rules | Platform docs, Launch QA criteria |
| Operating procedures | Onboarding sequence, monthly delivery rhythm | Playbooks, SOP notes |
| Pricing philosophy | Tier logic, discount rules, scope boundaries | Financial Command, proposal templates |
| Team workflows | Who owns what, approval chains | Users, roles, playbook assignments |

**Characteristics:** Explicit, versionable, founder-approved. Changes require human authorship — not silent model drift.

#### B. Client canon (relationship-owned, medium-changing)

Knowledge that defines *how this client works*.

| Domain | Examples | Source of truth |
|--------|----------|-----------------|
| Client history | Launches, requests, payments, meetings | Activity Engine / Timeline |
| Client preferences | Contact style, approval speed, design taste | Communications, Executive Notes, corrections |
| Brand voice | Tone, vocabulary, taboos | Brand kits, approved copy, edit history |
| Proposal history | What was offered, accepted, declined | Proposals, contracts |
| Pricing history | Retainers, invoices, discounts given | Retainers, Financial Command |
| Past decisions | "We chose X over Y because…" | Timeline events, pinned notes |
| Corrections | Founder edits to drafts, rejected recommendations | Dismissal records, diff history |
| Outcomes | Traffic, leads, reviews, wins | Client Success Wins, audits, reports |

**Characteristics:** Grounded in records. Inferences must cite source events. Client scope is strict — no cross-client leakage.

#### C. Operational state (real-time, fast-changing)

Knowledge that describes *what is true right now*.

| Domain | Examples | Source of truth |
|--------|----------|-----------------|
| Open work | Work items, requests, deliverables | Work Items, collections |
| Health signals | Overdue, blocked, stale contact | Client Memory rules, monitors |
| Pipeline state | Active proposals, launch QA blockers | Sales, Genesis, Launch QA |
| Playbook runs | In progress, blocked, completed | Playbook engine |
| Company state | Capacity, revenue rhythm, founder focus | Today brief, Founder dashboard |

**Characteristics:** Computed from live data. Short TTL. Never stored as "fact" without refresh.

#### D. Derived patterns (learned, slow-accumulating)

Knowledge inferred from studio behavior — **never authoritative until promoted**.

| Domain | Examples | Promotion path |
|--------|----------|----------------|
| Recurring edits | Same correction on proposals 5× | → Studio canon candidate |
| Successful sequences | Proposal → win → launch patterns | → Playbook candidate |
| Recurring client asks | Portal request types per vertical | → SOP or automation candidate |
| Dismissed recommendations | 3× dismiss same signal | → Suppress rule (existing pattern) |
| Team paths | How junior creators complete shifts | → Training module candidate |

**Characteristics:** Probabilistic until founder promotes to canon or playbook.

### Knowledge evolution lifecycle

```
Observe (events, edits, outcomes)
        ↓
Signal (deterministic rules + optional synthesis)
        ↓
Surface (recommendation, prepared draft, teaching moment)
        ↓
Human act (accept, edit, dismiss, correct)
        ↓
Record (timeline, correction log, dismissal count)
        ↓
Promote? (founder elevates to standard, playbook, or suppression rule)
        ↓
Canon / Playbook / Rule update
```

**Rules:**

1. **Ground truth wins** — collections and timeline beat inference
2. **Promotion requires human** — derived patterns never auto-become standards
3. **Corrections are gold** — every founder edit is a teaching signal
4. **Decay matters** — old client preferences expire without reinforcement
5. **Sparse by default** — Growth Opportunities and derived patterns stay rare
6. **Cross-client synthesis is portfolio-level** — only in Brain / Founder contexts with explicit scope

### Knowledge storage philosophy (conceptual)

Studio Intelligence does not invent a parallel store. It **reads** from:

- Payload collections (system of record)
- Activity Engine (relationship memory)
- Executive Notes / Strategy (founder knowledge)
- Playbook definitions and run history
- Correction and dismissal logs (future dedicated or metadata-backed)

Synthesis layers may cache **snapshots** (as Client Memory already does) — but snapshots are regenerable views, not authoritative truth.

---

## 3. Context awareness

Studio Intelligence acts on **Studio Context** — a structured model of where the user is, what they are doing, and what the studio state is.

Context is assembled per request / per moment — not remembered as chat history.

### The Studio Context model

```
StudioContext
├── session
│   ├── userId
│   ├── displayName
│   ├── role                    (founder | admin | editor | junior-creator | …)
│   ├── permissions             (edition modules, financial access, client scope)
│   └── localTime               (for briefs, due context)
│
├── navigation
│   ├── surface                 (operations | sales | portal | payload-admin)
│   ├── route                   (/admin/operations/work, …)
│   ├── moduleId                (work | client-command | proposals | …)
│   ├── view                    (kanban | today | intelligence | …)
│   └── executiveQuestion       (derived — what this page answers)
│
├── object                      (0 or 1 primary focus)
│   ├── type                    (client | project | proposal | work-item | request | …)
│   ├── id
│   ├── relations               (parent client, linked retainer, …)
│   └── loadedSnapshot          (minimal fields for the moment)
│
├── workflow                    (optional — multi-step in progress)
│   ├── workflowType            (proposal-draft | client-launch | playbook-run | …)
│   ├── step
│   └── pendingDecisions[]
│
├── studioState                 (portfolio-level, cached)
│   ├── openWorkCounts
│   ├── attentionNeededClients[]
│   ├── playbookRunsActive
│   └── founderBriefHealth      (healthy | attention | blocked)
│
└── knowledgeScope              (what canon applies)
    ├── studioCanonRefs[]
    ├── clientCanonRefs[]       (only if object.client present)
    └── applicablePlaybooks[]
```

### Context resolution rules

1. **Primary object** — the innermost entity the user is editing or viewing (client beats project beats work item when nested)
2. **Scope inheritance** — client context flows to all child objects
3. **Role filtering** — junior creators see teaching and task context; financial context requires permission
4. **Surface honesty** — Payload admin surfaces get honest-admin assistance (field help, standards check); product surfaces get executive assistance
5. **No context, no intelligence** — if object and workflow are empty and studio state is clear, Studio stays silent

### Context sources (existing and future)

| Signal | How context is obtained |
|--------|-------------------------|
| Current page | Route + searchParams + nav activeId |
| Current client | URL `[clientId]`, object relation, workspace bundle |
| Current proposal | Proposal editor route, linked client |
| Current work item | Collection edit or Work board selection |
| Current project | Project relation on work item / Client Command tab |
| Current workflow | Playbook run state, Genesis step, proposal draft step |
| Current user role | Payload user session + edition permissions |
| Current company state | Today / Work / Founder aggregates |

### Context freshness

| Layer | Freshness |
|-------|-----------|
| Navigation / object | Real-time per page load |
| Client snapshot | Per workspace bundle load; refresh on action |
| Studio state | Brief TTL (minutes) or on-demand for cockpits |
| Canon | Changes only on human promotion |

---

## 4. Assistance patterns

Studio Intelligence surfaces **patterns**, not a chat prompt. Each pattern has a trigger, a presentation, and a commit path.

### Pattern catalog

| Pattern | User-facing label | What it does | Commit model |
|---------|-------------------|--------------|--------------|
| **Show Me How** | Show me how | Surfaces SOP, playbook step, or prior example | Read-only → may launch playbook |
| **Review My Work** | Review this | Checks draft against standards + client canon | Annotated suggestions → user edits |
| **Fix For Me** | Fix this | Proposes concrete correction (copy, field, status) | One-click apply → undo available |
| **Prepare This** | Prepared for you | Pre-fills draft from context (email, proposal section, work item) | Opens editor — user commits |
| **Explain Why** | Why this? | Explains signal, score, or recommendation with evidence | Read-only |
| **Recommend Next Step** | Next step | Single highest-value action with deep link | User navigates and acts |
| **Check Against Standards** | Standards check | Lint-style pass against KXD / client rules | Pass/fail list → fix links |
| **Draft Reply** | Reply ready | Prepared client communication from thread context | User edits → sends manually |
| **Create Playbook** | Save as playbook | Proposes playbook from repeated manual sequence | Founder approves definition |
| **Suggest Automation** | Could automate | Identifies repeat work → playbook or hook candidate | Founder approves → engineering |

**Language rule (Constitution):** Never "AI generated." Use *Prepared for Review*, *Studio Recommendation*, *Proposal Ready*, *Reply ready*.

### Trigger matrix — what determines when each appears

Patterns appear only when **confidence × value × permission** exceeds threshold. Default is silence.

| Pattern | Typical triggers | Suppressed when |
|---------|------------------|-----------------|
| **Show Me How** | New role on unfamiliar surface; first time in workflow; explicit help affordance | User has completed workflow 3+ times |
| **Review My Work** | Draft save; before send/submit; status → review | No draft or no applicable standards |
| **Fix For Me** | Standards check failed; obvious field error; client voice mismatch | Trust tier forbids auto-edit; legal/financial content |
| **Prepare This** | Empty required field; new object from template; recurring doc type | User already editing; prepared draft would be low quality |
| **Explain Why** | User views recommendation; dismiss hover; score on Intelligence tab | No underlying signal — never explain fiction |
| **Recommend Next Step** | Cockpit focus empty; client urgency high; work item blocked | 3+ competing equal priorities — show top 1 only |
| **Check Against Standards** | Pre-launch; pre-publish; pre-proposal-send; creative submit | No standards loaded for domain |
| **Draft Reply** | Communication needs_reply; stale thread; meeting follow-up due | Client communication auto-send forbidden |
| **Create Playbook** | Same 5+ step manual sequence detected across 3+ occurrences | Sequence includes trust-tier-forbidden steps |
| **Suggest Automation** | Recurring work item spawn; repeated portal request type; monthly manual task | No stable pattern yet (< 3 occurrences) |

### Presentation rules

1. **One pattern per moment** — never stack competing assistance UI
2. **Inline over modal** — assistance appears adjacent to the object, not in a global panel
3. **Evidence visible** — Explain Why is always one click from any recommendation
4. **Dismissal teaches** — dismiss counts feed suppression (existing Client Actions pattern)
5. **No pattern without exit** — every assistance has ignore, dismiss, or commit — never trapping

### Autonomy level per pattern (default)

| Pattern | Default level |
|---------|---------------|
| Show Me How | 1 — Advises |
| Explain Why | 1 — Advises |
| Recommend Next Step | 1 — Advises |
| Review My Work | 1–2 — Advises / Prepares |
| Prepare This | 2 — Prepares |
| Draft Reply | 2 — Prepares |
| Check Against Standards | 2 — Prepares |
| Fix For Me | 2–3 — Prepares / Execute with approval |
| Create Playbook | 2 — Prepares (founder commits definition) |
| Suggest Automation | 1 — Advises (founder commits build) |

---

## 5. Teaching

Studio Intelligence is the **institutional memory that onboarded employees wish they had on day one**.

### Teaching philosophy

- Teach **in context**, at the moment of work — not in a separate training portal
- Teach **one step at a time** — progressive disclosure matches Constitution
- Teach **from real studio examples** — prior client work, not generic templates
- Teach **standards, not tricks** — why KXD does it this way

### How Studio teaches new employees

| Mechanism | Description |
|-----------|-------------|
| **Contextual SOP surfacing** | First visit to a surface → Show Me How with studio procedure |
| **Guided workflow** | Playbook run with teaching annotations on each step |
| **Example pulled from canon** | "Here's how we handled this for [similar client]" — with permission scope |
| **Standards check as lesson** | Failed check explains the rule and links to standard doc |
| **Shadow mode** | Junior completes work; Studio compares to founder-corrected exemplar (future) |

### How Studio walks someone through work

```
Employee enters task (work item, creative request, shift)
        ↓
Studio resolves role → selects teaching depth
        ↓
Show Me How (optional, first time) → linked SOP + example
        ↓
Employee works → Review My Work on save (if applicable)
        ↓
Standards check → specific fixes with explanations
        ↓
Founder review (if required by role) → correction recorded
        ↓
Correction feeds client canon + teaching exemplar library
```

**Role-based depth:**

| Role | Teaching intensity |
|------|-------------------|
| Founder | Minimal — recommendations and portfolio synthesis only |
| Admin / Editor | Standards checks, Prepare This, next steps |
| Junior creator | Show Me How, guided steps, exemplar comparison |

### How Studio remembers new standards

When the founder establishes or changes a standard:

1. **Explicit capture** — Executive Note, Strategy doc, or playbook update (preferred)
2. **Implicit capture** — founder correction on draft → flagged as "standard candidate"
3. **Promotion review** — periodic (or on 3rd identical correction) Studio asks: *"Save as studio standard?"*
4. **Versioning** — standards have effective date; old work not retroactively failed

Studio does not silently rewrite canon from model inference.

### How founder feedback improves Studio

| Feedback type | Effect |
|---------------|--------|
| Accept prepared draft | Reinforces pattern for client + doc type |
| Edit prepared draft | Correction log → client voice + draft templates |
| Dismiss recommendation | Increment suppression counter → rule tuning |
| Dismiss 3× same signal | Auto-suppress (existing memory reference pattern) |
| "Save as standard" | Promotes to studio canon |
| "Save as playbook" | Creates automation candidate |
| Explicit "never suggest this" | Hard suppress + audit trail |

Founder feedback is the **highest-trust learning signal** in the system.

---

## 6. Learning

Studio learns **from studio behavior** — not from the open internet.

### Learning inputs

| Input | What Studio learns | Output |
|-------|-------------------|--------|
| **Corrections** | Founder/editor edits to prepared content | Client voice, draft templates, standard candidates |
| **Approvals** | Accepted proposals, sent communications, completed launches | Positive exemplars, sequence patterns |
| **Playbooks** | Completed runs, skipped steps, blockers | Step timing, failure modes, simplification candidates |
| **Recurring edits** | Same manual change across instances | Fix For Me rules, automation candidates |
| **Completed projects** | Launch → outcome timeline | Win patterns, retrospective signals |
| **Successful proposals** | Won deals — scope, pricing, timeline | Proposal templates, pricing confidence |
| **Client outcomes** | Traffic, leads, reviews, retention | Client Success Wins, recommendation quality feedback |
| **Dismissals** | Rejected recommendations | Suppression rules, threshold tuning |

### Learning lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│  1. OBSERVE — Events enter Activity Engine + collections    │
└────────────────────────────┬────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│  2. EXTRACT — Deterministic signals (rules) + optional      │
│     synthesis (narrative, grouping) with citations          │
└────────────────────────────┬────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│  3. PROPOSE — Assistance pattern surfaced in context        │
│     (recommendation, prepared draft, teaching moment)       │
└────────────────────────────┬────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│  4. HUMAN VERDICT — accept | edit | dismiss | correct       │
└────────────────────────────┬────────────────────────────────┘
                             ↓
              ┌──────────────┴──────────────┐
              ↓                             ↓
┌──────────────────────────┐   ┌──────────────────────────┐
│  5a. OPERATIONAL UPDATE  │   │  5b. LEARNING UPDATE     │
│  Work item, timeline,    │   │  Correction log,         │
│  client record changed   │   │  suppression, exemplar   │
└──────────────────────────┘   └────────────┬─────────────┘
                                            ↓
                             ┌──────────────────────────────┐
                             │  6. PROMOTE (human gate)     │
                             │  Standard | Playbook | Rule  │
                             └──────────────────────────────┘
```

### Learning boundaries

| Studio may learn automatically | Studio may not learn automatically |
|-------------------------------|-----------------------------------|
| Suppression after 3 dismissals | New pricing rules |
| Client voice from corrections | Contract terms |
| Draft template improvements | Financial commitments |
| Playbook step ordering hints | Client-facing send without human |
| Signal threshold tuning | Cross-client data mixing without scope |

### Evaluation (conceptual)

Studio Intelligence quality is measured by:

- **Acceptance rate** of prepared drafts (edited vs rejected)
- **Time to complete** recurring workflows (before/after playbook)
- **Repeat correction rate** (same fix should decline over time)
- **Dismissal rate** (high = noise)
- **Founder time reclaimed** (Constitution KPI)

Not measured by: messages sent to chat, tokens consumed, or "insights generated."

---

## 7. Progressive autonomy

Studio Intelligence matures through **four autonomy levels**. Features declare their level. Levels never skip.

### Level 1 — Advises

**Studio speaks. Human acts.**

| Responsibility | Examples |
|----------------|----------|
| Surface signals and recommendations | Client Memory scores, next best action |
| Explain why with evidence | Explain Why on any recommendation |
| Suggest next step | Work cockpit focus, Client Success items |
| Teach and show SOPs | Show Me How for new employees |
| Flag standards issues | Read-only standards preview |

**Human commit:** Every action — navigation, edit, send, create.

**Default for:** New capabilities, new clients, low-confidence patterns, all Growth Opportunities.

---

### Level 2 — Prepares

**Studio prepares. Human commits.**

| Responsibility | Examples |
|----------------|----------|
| Pre-fill drafts | Proposal sections, reply ready, work item from portal request |
| Prepare checklists | Launch QA pre-run, monthly deliverable batch |
| Batch suggestions | Multiple fixes presented — user selects |
| Assemble context | Client brief for meeting, timeline summary |

**Human commit:** Send, publish, save final, approve prepared content.

**Default for:** Communications drafts, proposal assembly, creative briefs, recurring doc types with exemplars.

---

### Level 3 — Executes with approval

**Studio acts. Human approves once.**

| Responsibility | Examples |
|----------------|----------|
| Apply safe fixes | Metadata correction, internal status update |
| Spawn work items | Portal request → work item (existing pattern) |
| Create timeline events | Activity publish on meaningful change |
| Queue playbook step | Pre-configured step ready — one-click approve |
| Schedule internal tasks | Reminder, follow-up work item |

**Human commit:** Single approval gate before irreversible or client-visible effect.

**Default for:** Work item spawns, internal automation, approved Fix For Me on non-trust-tier content.

---

### Level 4 — Runs approved playbooks automatically

**Studio runs. Human handles exceptions.**

| Responsibility | Examples |
|----------------|----------|
| Execute playbook runs | Monthly health check, onboarding sequence |
| Monitor and escalate | SSL expiry → Attention Needed item |
| Recurring spawns | Scheduled deliverable reminders |
| Auto-resolve known patterns | Dismiss expired snoozed items |

**Human commit:** Exceptions, blockers, trust-tier events only.

**Default for:** Playbooks explicitly approved for unattended execution — founder-configured per playbook.

### Level progression rules

1. **Start at Level 1** for every new pattern
2. **Promote per domain** — proposals may be Level 2 while financial stays Level 1
3. **Demote on error** — failed client outcome or founder override → drop one level
4. **Playbook approval is explicit** — Level 4 requires named playbook + scope + trust audit
5. **Constitution check** — higher level must reduce interface, not add it

---

## 8. Trust model

Autonomy without trust boundaries destroys the studio. Studio Intelligence uses a **tiered trust model** — independent of autonomy level.

### Trust tiers for content and actions

| Tier | Domain | Studio behavior |
|------|--------|-----------------|
| **T0 — Read only** | All surfaces | Advise, explain, prepare previews |
| **T1 — Internal write** | Work items, internal notes, timeline, tags | Level 3 with approval |
| **T2 — Client-visible draft** | Emails, portal messages, reports | Level 2 only — never auto-send |
| **T3 — Commercial** | Pricing, proposals, invoices, discounts | Level 2 max — founder commit on numbers |
| **T4 — Legal / contractual** | Contracts, agreements, terms | Level 1 only — prepare clauses, never execute |
| **T5 — Irreversible** | Delete, publish live site, payment capture, domain DNS | Level 1 advise + explicit human — no automation |

### Never automatic (regardless of level)

- **Money** — charges, refunds, pricing changes, invoice send
- **Legal** — contract execution, terms changes
- **Client communication send** — email, SMS, portal message delivery
- **Public publish** — website deploy, social post live
- **Access control** — user creation, permission grants
- **Data destruction** — delete client, purge records
- **Commitments** — scope promises, deadline guarantees to client

### Approval rules

| Action type | Required approver |
|-------------|-------------------|
| T1 internal write | Editor+ or playbook approval |
| T2 client draft send | Assigned owner or founder |
| T3 commercial | Founder (or delegated financial role — future) |
| T4 legal | Founder only |
| T5 irreversible | Founder only + confirmation pattern |

### Confidence and evidence requirements

Studio may only escalate autonomy when:

1. **Evidence chain exists** — signal → source record → timestamp
2. **Historical acceptance** — pattern accepted > 80% over 10+ instances (conceptual threshold)
3. **Scope is narrow** — single client or single playbook, not portfolio-wide
4. **Rollback exists** — undo, audit trail, or compensating action
5. **Trust tier allows** — autonomy level ≤ tier ceiling

### Audit trail

Every Studio-assisted action records:

- Pattern used (Prepare This, Fix For Me, …)
- Autonomy level at time of action
- Evidence citations
- Human who committed (or playbook run ID)
- Input hash / version of prepared content

Activity Engine is the audit surface — not a separate AI log.

---

## 9. Future vision — KXD OS in five years

Realistic evolution — not science fiction. Kreate by Design still runs on KXD OS; the founder still leads — but the **texture of daily work** has changed.

### What the founder experiences

**Morning:** Open Today. The brief is accurate without checking five tools. Three items need you — everything else is running or prepared. No inbox of "AI insights."

**Client call:** Open Client Command. Overview shows relationship truth — last contact, open work, one Studio Recommendation with *why now*. Proposal from last quarter is one click away. Nothing to paste into ChatGPT.

**After call:** Reply ready is prepared from meeting notes. Founder edits two sentences, sends. Timeline records the event. Work items already exist for commitments made.

**New employee:** Junior creator opens shift. Show Me How walks through lead capture once. Standards check catches voice mismatch before submit. Founder reviews exceptions only.

**Month end:** Playbooks ran health checks on every active client. Attention Needed has four items — all real. Growth Opportunities shows zero for most clients. Wins populated from outcomes.

**Quarterly:** Founder reviews promoted standards and playbooks — not reviewing software. Studio proposed three automations from recurring edits; founder approved two.

### What changed structurally

| Today (early) | Five years (mature) |
|---------------|---------------------|
| Deterministic Client Memory rules | Rules + synthesis narratives with citations |
| Manual playbook launch | Level 4 runs for approved studio rituals |
| Founder spawns most work items | Most spawn from events + playbooks |
| Teaching is tribal knowledge | Teaching is contextual in workflow |
| Recommendations sometimes noisy | Suppression + promotion tuned from years of feedback |
| Intelligence tab per client | Intelligence invisible — surfaced in moment on Overview |
| Separate brain planning | Portfolio synthesis in Founder / Today only |

### What did not change

- No chatbot sidebar became the primary interface
- Founder still approves money, legal, and client send
- Constitution still governs — calm, sparse, Respect Time
- Payload remains system of record
- Client Command remains the relationship home
- More capability = calmer UI, not more dashboards

### The maturity test (year five)

> Can Kreate by Design onboard a new client, run monthly delivery, surface a genuine growth signal, and prepare a quarterly review — with the founder in three meetings and one approval session?

If yes, Studio Intelligence succeeded.  
If the founder still lives in dashboards and chat, it failed.

---

## Architectural principles (summary)

1. **Invisible over interface** — intelligence in workflow, not product chrome
2. **Evidence over eloquence** — every output citable
3. **Ground truth over inference** — collections and timeline win
4. **Human promotion over auto-learning** — canon changes require founder
5. **Sparse over noisy** — silence is default
6. **Respect Time over feature count** — reclaim founder hours
7. **Progressive autonomy over big bang** — levels 1→4 per domain
8. **Trust tiers over model confidence** — legal/financial/money never auto
9. **Teaching in context over training portal**
10. **Playbooks as the automation spine** — Level 4 executes playbooks, not prompts

---

## Document hierarchy

| Document | Governs |
|----------|---------|
| `KXD-OS-CONSTITUTION.md` | Experience — how it must feel |
| **This document** | Studio Intelligence — how capability composes |
| Platform / collection architecture | Implementation — how it is built |
| `KXD-OS-VISUAL-MANIFESTO.md` | Visual craft — how it looks |
| Client Success / BD docs | Domain-specific output channels |

When documents conflict: **Constitution → Studio Intelligence Architecture → Implementation**.

---

## Cursor implementation preamble (future phases)

When implementing any Studio Intelligence capability:

> Read `docs/STUDIO-INTELLIGENCE-ARCHITECTURE.md`. No chatbot. No sidebar. Declare autonomy level and trust tier. Cite evidence. Use studio language (Prepared for Review, Studio Recommendation). Pass Respect Time and the autonomy question from the Constitution. Start at Level 1. Integrate with Activity Engine — do not fork memory.

---

*Studio Intelligence Architecture v1.0 — foundational planning document. No implementation. Architecture only.*
