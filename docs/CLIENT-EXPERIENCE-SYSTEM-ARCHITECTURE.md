# Client Experience System (CES) Architecture

**Version 1.0 · Foundational Product Architecture**  
**Phase:** 12A — Client Experience System Foundation  
**Status:** Architecture approved pending implementation  
**Governed by:** `docs/KXD-OS-CONSTITUTION.md`, `docs/KXD-OS-VISUAL-MANIFESTO.md`, `docs/KXD-OS-PRODUCT-ROADMAP.md`

> **Shared Core powers the platform. CES powers the experience.**  
> This document defines the permanent architectural layer for every client-facing interaction in KXD OS.

---

## Executive summary

KXD OS is evolving from an internal agency operating system into a platform clients themselves use. The **Client Experience System (CES)** is the first-class architectural layer responsible for how every client experiences that platform.

CES is **not** a feature, a theme switcher, or a portal redesign. It is:

- An **experience engine** — identity, vocabulary, interaction patterns, and module composition
- A **hospitality layer** — how the client *feels*: clarity, confidence, calm, and trust on every screen
- A **resolution layer** — turns Shared Core records into client-appropriate presentation
- A **module registry** — every client-facing surface inherits the same foundations
- An **extension framework** — clean hooks for Website Review today; reports, assets, mobile tomorrow

**Hospitality over theming.** CES is responsible for how a client feels while using KXD OS — not merely how it looks. Every client-facing screen should create clarity, confidence, calm, and trust. Luxury comes from restraint, not decoration.

**First implementation:** Primal Motorsports · **Website Review**  
**First pilot profile:** Primal Experience Profile

**Do not implement until this architecture is reviewed.** Implementation follows Stages 1–6 at the end of this document.

---

## Current state analysis

### What exists today

| Layer | State | CES implication |
|-------|-------|-----------------|
| **Portal (Client HQ)** | 14 modules under `/portal/*` | Delivery shell exists; experience is generic |
| **Portal auth** | HMAC session on `portal-users` → `clientId` | Client scoping is solid |
| **Shared Core data** | `clients`, `client-requests`, `client-tasks`, `client-projects`, etc. | Reuse — do not fork request systems |
| **Activity Engine** | Publishes to `executive-timeline-events` (`internalOnly: true`) | Client-visible activity gap |
| **Portal timeline** | Reads `client-timeline-events` (legacy/separate) | Must unify or mirror for Review History |
| **Edition branding** | `lib/editions/branding.ts` — 2 CSS vars, KXD-forward | Insufficient for client-led identity |
| **Brand Kits** | Rich identity in admin Creative Engine | Source of truth for visual/voice — not client-facing yet |
| **Client onboarding** | Logo files, goals, website info | Logo source for portal overview |
| **Website Health** | Read-only audit display | Adjacent but not Website Review |
| **Requests module** | Generic "Requests" language + large form | Wrong vocabulary, wrong aesthetic for CES |
| **Design system** | `components/os` + `kxd-os.css` shared with admin | Extend, do not duplicate |

### Critical gaps CES must close

1. **Identity** — Client HQ leads with KXD logo; client brand should lead
2. **Vocabulary** — Admin language ("Requests", "Tickets", "Status") surfaces to clients
3. **Experience coherence** — Auth forms, `NewRequestForm`, and screens use inconsistent patterns
4. **Activity visibility** — Request lifecycle not visible to clients in unified timeline
5. **Module extensibility** — No registry for client-facing experiences with shared flow patterns
6. **Profile model** — No single resolved "who is this client in the product" object

### What we will not do

- Create a parallel request/ticket system
- Build a chatbot or AI sidebar for clients
- Duplicate Brand Kit data in a new collection
- Redesign Shared Core collections for CES convenience
- Ship all future modules in Phase 12A

---

## Architectural placement

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT-FACING MODULES                        │
│  Website Review · Reports · Assets · Invoices · Mobile (future)│
└───────────────────────────────┬─────────────────────────────────┘
                                │ inherits
┌───────────────────────────────▼─────────────────────────────────┐
│              CLIENT EXPERIENCE SYSTEM (CES)                      │
│  Experience Profile · Vocabulary · Primitives · Module Registry  │
│  Flow patterns · Motion · Copy · Empty states · Trust UI       │
└───────────────────────────────┬─────────────────────────────────┘
                                │ resolves
┌───────────────────────────────▼─────────────────────────────────┐
│                      DELIVERY SHELL                              │
│           Portal routes · Session · Client HQ nav                │
└───────────────────────────────┬─────────────────────────────────┘
                                │ reads/writes
┌───────────────────────────────▼─────────────────────────────────┐
│                       SHARED CORE                                │
│  Collections · Activity Engine · Work Items · Editions · Auth    │
└─────────────────────────────────────────────────────────────────┘
```

### Relationship to named systems

| System | Role relative to CES |
|--------|----------------------|
| **Shared Core** | System of record — clients, requests, tasks, timeline, auth |
| **Client HQ (Portal)** | Route shell and navigation — hosts CES modules |
| **Client Command** | Internal client workspace — mirror of relationship, not client-facing |
| **Client Requests** | Canonical request record — CES adds vocabulary + flow, not duplication |
| **Activity Engine** | Relationship memory — CES publishes client-visible events |
| **Work Items** | Internal execution — spawned from portal requests (existing) |
| **Brand Kits** | Creative identity source — CES profiles resolve from here |
| **Editions** | Module gating + platform branding defaults — CES overrides per client |
| **Studio Intelligence** | Internal only in Phase 12A — future: prepared summaries for client reports |

---

## CES core concepts

### 1. Experience Profile

An **Experience Profile** is the resolved identity of a client throughout KXD OS client-facing surfaces.

It is **not simply theming**. It is the contract for:

| Category | Properties (resolved) |
|----------|----------------------|
| **Identity** | Logo, client name, favicon, hero imagery |
| **Visual** | Primary, secondary, accent, surface tints, border radius, elevation mood |
| **Typography** | Display + body font stacks (within KXD-safe pairings) |
| **Voice** | Tone descriptors, terminology map, success/error copy tone |
| **Navigation** | Module labels, group names, enabled modules |
| **Partner branding** | KXD mark treatment (understated footer, not sidebar hero) |
| **Motion** | Reduced motion respect, transition speed preset |
| **Documents** | Report/PDF/email styling tokens (future) |

#### Profile resolution (do not duplicate Brand Kits)

```
clients (identity anchor)
    ↓
client-experience-profiles (CES presentation config + module enablement)
    ↓ resolves
brand-kits (visual + voice canon) + client-onboarding (logo media) + edition defaults
    ↓
ResolvedExperienceProfile (runtime object — cached per session)
    ↓
CSS custom properties + terminology map + copy templates
```

**Stage 2–3 scope (minimal):**

- New collection: `client-experience-profiles` (1:1 with `clients`)
- Fields: `client`, `slug`, `status`, `brandKit` (relationship), `presentation` (group), `terminology` (JSON), `enabledModules` (array), `partnerBranding` (group)
- Resolver: `lib/ces/profile/resolve.ts`
- Primal profile seeded with brand kit colors, onboarding logo, motorsports terminology

**Explicitly defer:** photography direction, PDF templates, email HTML themes, custom font files — architect fields as optional, implement later.

### 2. Experience Vocabulary

Internal Shared Core statuses **must not** surface to clients verbatim.

CES maintains a **Vocabulary Layer** — maps internal enums to client-facing language per module.

Example — Website Review × Client Requests:

| Internal (`client-requests.status`) | Client-facing (Website Review) |
|-------------------------------------|--------------------------------|
| `new` | Review received |
| `triaged` | In review |
| `in-progress` | Revision in progress |
| `waiting-on-client` | Awaiting your input |
| `complete` | Completed |
| `declined` | Closed |

Vocabulary lives in `lib/ces/vocabulary/` — keyed by `(moduleId, domain, internalValue)`.

Admin OS keeps internal labels. CES translates at the presentation boundary.

### 3. Experience Modules

A **CES Module** is a client-facing product surface with:

- `moduleId` — stable identifier (`website-review`, `monthly-reports`, …)
- `routes` — portal route registration
- `nav` — label, group, icon, sort order
- `vocabulary` — module terminology
- `data adapters` — Shared Core queries scoped to module context
- `flow definition` — primary user journey
- `extension points` — declared future capabilities

Modules register in `lib/ces/modules/registry.ts`. Portal nav consumes CES registry filtered by Experience Profile + edition gates.

### 4. Experience Flows

CES defines reusable **flow patterns** for premium interactions:

| Pattern | Use |
|---------|-----|
| `CesLandingFlow` | Orient → one primary action |
| `CesStepFlow` | Multi-step without large forms |
| `CesDetailFlow` | Object detail + timeline/history |
| `CesConfirmFlow` | Success/confirmation with next step |
| `CesEmptyFlow` | Intentional empty states with guidance |

Website Review implements: Landing → Review Website → Request Update → Revision Timeline → Completed.

---

## Website Review — first CES module

### Product definition

**Website Review** is how a client requests and tracks website revisions with KXD — not feedback, support, tickets, or issues.

Premium creative partner language throughout.

### User journey

```
Landing (/portal/website-review)
  │
  ├─► Review Website — see live site, context, recent review history
  │
  ├─► Request Update — short guided flow (not a large form)
  │       │
  │       └─► Creates client-request (experienceModule: website-review)
  │
  ├─► Revision Timeline — active + past reviews for this client
  │
  └─► Completed — closed reviews with completion date + summary
```

### Shared Core integration

| Concern | Integration |
|---------|-------------|
| **Record** | Reuse `client-requests` — no new collection |
| **Discriminator** | Add optional field `experienceModule: 'website-review'` (Stage 5) |
| **Request type** | Default `requestType: 'update'` for website revisions |
| **Project link** | Auto-link primary website project when available |
| **Portal API** | Extend `POST /api/portal/requests` or add `POST /api/portal/website-review` that writes same collection |
| **Work Items** | Existing `spawnWorkItemFromPortalRequest()` — unchanged |
| **Activity** | Publish client-visible timeline events (see below) |

### Client-visible activity (timeline strategy)

**Problem:** Activity Engine writes `executive-timeline-events` with `internalOnly: true`. Portal reads `client-timeline-events`.

**Recommended approach (Stage 5):**

1. Add `clientVisible: boolean` to activity publish for request lifecycle events when `experienceModule` is set
2. Portal timeline loader reads client-visible executive events **or** mirrored entries — prefer single canonical store long-term (aligns with Phase 12 Timeline Unification in product roadmap)
3. Website Review "Revision Timeline" queries requests + linked activity for the authenticated client

**Events to publish:**

| Event | Client-visible title |
|-------|---------------------|
| Request created | Review received |
| Status → in-progress | Revision in progress |
| Status → waiting-on-client | We need your input |
| Status → complete | Review completed |

### Primal Motorsports pilot

| Property | Source |
|----------|--------|
| Client | `clients.slug = 'primal-motorsports'` |
| Logo | `client-onboarding.logoFiles` or brand kit asset |
| Colors | Brand kit — primary `#` motorsports red family, dark surfaces |
| Typography | Keep KXD pairing (Cormorant + Outfit) with Primal accent weight on headlines |
| Voice | Direct, performance-oriented, premium — not corporate |
| Website URL | `clients.companyWebsite` → primalmotorsports.com |
| KXD presence | Small footer: "Powered by Kreate by Design" — not sidebar logo dominance |

Reference atmosphere tint already in `lib/executive-client-workspace/atmosphere.ts` for internal admin — CES profile is the client-facing equivalent.

---

## Reusable component strategy

### Layer model

```
components/ces/          ← Client experience primitives (NEW)
    primitives/          CesPage, CesHero, CesFlow, CesStep, CesConfirm
    patterns/            CesReviewCard, CesTimeline, CesRequestComposer
    providers/           CesProfileProvider, CesVocabularyProvider
    modules/
        website-review/  Module-specific screens (compose primitives)

components/client-hq/    ← Legacy screens — migrate incrementally to CES modules
components/os/           ← Shared physical design language (admin + client)
design-system/os/        ← Base tokens
design-system/ces/       ← CES token extensions (NEW — profile-aware vars)
```

### CES primitives vs OS primitives

| Use `components/os` | Wrap/extend as `components/ces` |
|---------------------|----------------------------------|
| KxdShell structure | CesAppShell — client logo leads, KXD understated |
| KxdBadge | CesStatus — vocabulary-translated, softer variants |
| KxdEmptyState | CesEmpty — profile copy templates |
| KxdPage spacing | CesPage — wider whitespace, single-action layout |
| Form inputs | CesField, CesTextarea — premium field styling, inline validation |

**Rule:** CES components consume `ResolvedExperienceProfile` via React context. No hardcoded client branding in module screens.

### Interaction standards (Constitution-aligned)

Every CES interaction must feel intentional:

| Element | Standard |
|---------|----------|
| **Primary action** | One per viewport — gold commit, client accent secondary |
| **Loading** | Skeleton or subtle pulse — never spinners alone |
| **Validation** | Inline, sentence-case, specific |
| **Errors** | Calm, actionable — never alarm red walls |
| **Success** | Confirmation screen with clear next step |
| **Transitions** | 150–200ms glide; respect `prefers-reduced-motion` |
| **Empty states** | Guide, don't abandon |
| **Typography** | Client name in display scale; metadata quiet |

---

## Folder structure (proposed)

```
lib/ces/
├── index.ts                          # Public barrel (client-safe exports)
├── types.ts                          # ExperienceProfile, CesModule, Vocabulary types
├── profile/
│   ├── resolve.ts                    # Resolve profile for clientId
│   ├── tokens.ts                     # Profile → CSS custom properties
│   ├── defaults.ts                   # Platform defaults when profile incomplete
│   └── terminology.ts                # Terminology map helpers
├── vocabulary/
│   ├── index.ts
│   ├── requests.ts                   # Request status labels per module
│   └── website-review.ts             # Website Review copy constants
├── modules/
│   ├── registry.ts                   # CesModuleDefinition registry
│   ├── types.ts
│   └── website-review/
│       ├── definition.ts             # Module metadata, routes, nav
│       ├── data.ts                   # Server data adapters (uses lib/portal session)
│       └── flows.ts                  # Flow step definitions
├── activity/
│   └── client-visible.ts             # Client-visible activity publish helpers
└── server.ts                         # Server-only re-exports

components/ces/
├── providers/
│   ├── CesProfileProvider.tsx
│   └── CesVocabularyProvider.tsx
├── primitives/
│   ├── CesAppShell.tsx               # Replaces ClientHqShell for CES routes
│   ├── CesPage.tsx
│   ├── CesHero.tsx
│   ├── CesFlow.tsx
│   ├── CesStep.tsx
│   ├── CesConfirm.tsx
│   ├── CesField.tsx
│   ├── CesButton.tsx
│   ├── CesTimeline.tsx
│   └── CesEmpty.tsx
├── patterns/
│   └── CesReviewHistoryList.tsx
└── modules/
    └── website-review/
        ├── WebsiteReviewLanding.tsx
        ├── WebsiteReviewRequestFlow.tsx
        ├── WebsiteReviewDetail.tsx
        └── WebsiteReviewHistory.tsx

design-system/ces/
├── tokens/
│   ├── profile-vars.ts               # Token names for profile injection
│   └── motion.ts                     # CES motion presets
└── styles/
    └── kxd-ces.css                   # CES extensions (imports kxd-os.css)

app/(portal)/portal/(app)/
├── layout.tsx                        # Eventually wraps CesProfileProvider
└── website-review/
    ├── page.tsx                      # Landing
    ├── request/page.tsx              # Request Update flow
    └── [requestId]/page.tsx          # Revision detail + timeline

payload/collections/
└── ClientExperienceProfiles.ts       # Stage 2 — new collection

docs/
└── CLIENT-EXPERIENCE-SYSTEM-ARCHITECTURE.md   # This document
```

**Migration note:** Existing Client HQ routes remain until modules migrate. Website Review is **additive** — does not break existing `/portal/requests`.

---

## How future client-facing modules inherit CES

Every new client module follows this checklist:

### Registration

```typescript
// lib/ces/modules/registry.ts (conceptual)
{
  moduleId: "monthly-reports",
  label: "Performance Reports",        // overridable by profile terminology
  routes: [{ path: "/portal/reports", screen: "ReportsLanding" }],
  nav: { group: "Insights", order: 10 },
  requiredCollections: ["monthly-reports"],
  vocabularyNamespace: "reports",
  maturity: "beta",
}
```

### Inheritance chain

1. **Portal session** → `clientId`
2. **Profile resolver** → `ResolvedExperienceProfile`
3. **Module registry** → filter by `enabledModules` + edition
4. **Vocabulary** → translate all statuses and labels
5. **CES primitives** → compose screen
6. **Shared Core adapter** → read/write canonical records
7. **Activity publish** → client-visible events where appropriate

### Future modules (extension only — not Phase 12A)

| Module | Shared Core anchor | CES adds |
|--------|-------------------|----------|
| Monthly Reports | `monthly-reports`, reporting lib | Branded PDF/view, profile styling |
| Asset Library | `brand-kit-assets`, onboarding media | Client-brand gallery |
| Brand Documentation | `brand-kits` | Read-only brand guide experience |
| Analytics | GA4 feeds (future) | Client-safe metrics vocabulary |
| Invoices | retainers, invoices | Stripe-facing calm UI |
| Contracts / Approvals | proposals, contracts | Ceremony UX, not admin forms |
| Notifications | notification system | Profile-styled email + in-app |
| Mobile app | CES profile API | Same resolver, native shell |

---

## Extension points (Website Review — architect now, build later)

Declare in module definition — do not implement in Phase 12A:

| Extension | Purpose |
|-----------|---------|
| `pinTarget` | Click-to-comment URL + selector metadata |
| `visualPin` | Page region coordinates / screenshot overlay |
| `annotation` | Image markup on uploaded screenshots |
| `attachment` | Image/file upload on revision requests |
| `thread` | Threaded conversation on a revision |
| `approval` | Client approve/reject prepared change |
| `versionHistory` | Link revisions to site deploy versions |
| `reviewSession` | Scheduled review call state |
| `realtimeCollab` | Presence / live review (far future) |
| `summaryPrepared` | Studio-prepared review summary (not "AI summary" to client) |

Store extension metadata on `client-requests` as optional JSON group `experienceExtensions` — empty in Stage 4–5, schema-ready.

---

## Activity Engine integration

```
Portal action (request created / status change)
        ↓
client-requests hook (existing) → publishRequestActivity()
        ↓
lib/ces/activity/client-visible.ts → sets clientVisible + experienceModule metadata
        ↓
executive-timeline-events (canonical)
        ↓
Portal timeline / Website Review history (client-visible filter)
```

**Internal Client Command** continues to see full activity. **Client CES** sees filtered, vocabulary-translated subset.

Work Items spawn remains unchanged — internal execution layer.

---

## Editions integration

Editions continue to gate **which modules exist** at platform level.

Experience Profiles gate **which modules this client sees** and **how they look**.

```
Edition (KXD Agency Edition 1)
  → enables portal module IDs globally

Experience Profile (Primal)
  → enables website-review
  → overrides nav label: "Website Review"
  → resolves brand from Primal brand kit

CES Module Registry
  → defines module requirements
```

Both must pass for a module to render.

---

## Security and scoping

All CES data adapters enforce:

1. `requirePortalSession()` — valid HMAC cookie
2. `session.clientId` — every query filtered
3. `overrideAccess: true` only inside validated server adapters — never client-side
4. Related records (projects, requests) verified against `clientId`
5. No cross-client profile leakage — resolver keyed by session client only

---

## Implementation stages

### Stage 1 — Architect CES *(this document)*

- [x] Define CES layer, concepts, integration points
- [x] Folder structure, component strategy, module inheritance
- [x] Founder review and approval

### Stage 2 — Experience Profile foundation *(completed)*

- [x] `client-experience-profiles` collection + migration
- [x] `lib/ces/profile/resolve.ts` + types + defaults + tokens
- [x] `CesProfileProvider` + CSS var injection on portal layout
- [x] Default profile fallback (edition branding + onboarding logo)
- [x] Hospitality fields: welcome eyebrow, reassurance line, support tone, partner mark
- [x] Portal shell: client brand leads sidebar; trust line in footer

### Stage 3 — Primal Experience Profile *(completed)*

- [x] `lib/ces/profile/primal.ts` — production-safe defaults
- [x] `scripts/seed-primal-experience-profile.ts` — idempotent seed (`npm run seed:primal-experience`)
- [x] Active profile: dark graphite, red accent, hospitality copy, `website-review` enabled

### Stage 4 — Website Review experience

- CES primitives (shell, page, hero, flow, confirm, field, timeline, empty)
- `design-system/ces/kxd-ces.css`
- Module screens — landing, request flow, detail, history
- Routes under `/portal/website-review`

### Stage 5 — Client Requests integration

- `experienceModule` field on `client-requests`
- Portal API for Website Review submission
- Client-visible activity publish
- Revision timeline data adapter
- Work item spawn (existing — verify)

### Stage 6 — Polish

- Loading, validation, error, success states
- Motion and reduced-motion
- Empty states and microcopy pass
- Primal end-to-end QA against success criteria
- Constitution + Visual Manifesto quality bar

**One stage per implementation pass.** Do not combine Stages 2–6.

---

## Success criteria

A Primal client opening Website Review should feel:

| Criterion | Test |
|-----------|------|
| **Professional** | No admin panel aesthetics; no internal jargon |
| **Premium** | Whitespace, typography, restraint — luxury through calm |
| **Simple** | One obvious action per screen; no large forms |
| **Trustworthy** | Clear status, visible history, no black holes after submit |
| **Beautiful** | Client brand leads; KXD understated |
| **Fast** | Server components, minimal JS, polished loading |
| **Thoughtful** | Microcopy explains what happens next |
| **Built for them** | "This was made for Primal" — not adapted generic software |

---

## Document hierarchy

| Document | Role |
|----------|------|
| `KXD-OS-PRODUCT-ROADMAP.md` | Portal pillar long-term vision |
| `KXD-OS-CONSTITUTION.md` | Experience law — calm, Respect Time, one action |
| `KXD-OS-VISUAL-MANIFESTO.md` | Visual craft |
| **This document** | CES architecture — client-facing layer |
| `CLIENT_COMMAND_CENTER.md` | Internal client workspace (mirror, not client UI) |
| Platform registry | Engineering phase tracking |

---

## Cursor implementation preamble (Stage 2+)

When implementing CES stages:

> Follow `docs/CLIENT-EXPERIENCE-SYSTEM-ARCHITECTURE.md`. Shared Core powers platform; CES powers experience. Reuse `client-requests`. Client brand leads. One primary action per screen. No chatbot. No parallel request system. Vocabulary layer at presentation boundary. Stage scope only — do not skip ahead.

---

*Client Experience System Architecture v1.0 — Phase 12A foundation. Architecture only until Stage 2 approval.*
