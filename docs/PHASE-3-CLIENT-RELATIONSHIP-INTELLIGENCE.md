# Phase 3 — Client & Relationship Intelligence

**Status:** Batches A–C implemented (Events workspace) — Batches D–E not started  
**Baseline (planning):** `e97a571515efabec3f47347d3a38133007b7aef0`  
**Companion:** `docs/KXD-OS-ROADMAP.md`, `docs/KXD-OS-CURRENT-STATE.md`

> Batch A: collections + migration. Batch B: client Relationship tab (contacts CRUD + read-only events). Batch C: standalone `/admin/operations/events` list/detail/create/edit. Batch D navigation refinements and Batch E hardening remain.

---

## Product outcome

Create a private operator workspace that connects clients, contacts, relationships, preferences, and events, giving KXD OS durable business context for future Business Memory capabilities.

---

## Privacy boundary

All relationship context, preferences, dietary notes, accessibility notes, and internal event intelligence must remain authenticated and operator-only.

This information must never enter:

- Public HTML
- Public metadata
- JSON-LD
- Public APIs
- Public serialized props
- Client portals
- Client-facing API responses

---

## In scope

- Existing authenticated operator Clients list and detail experience
- New authenticated operator Events list and detail experience
- Client-to-contact relationships
- Client-to-event relationships
- Private relationship context and preferences
- Private dietary and accessibility notes where operationally relevant
- Deep links to existing Payload records for advanced editing
- Required authenticated operator navigation updates
- Necessary schema and migration work only after confirming existing architecture
- Authentication, authorization, privacy, and client-isolation verification
- Premium authenticated-interface styling consistent with the completed Light / Dark / System theme system

---

## Explicit exclusions

- Public websites and public routes
- Public APIs, metadata, JSON-LD, or serialized public props
- All client-portal surfaces and client-facing APIs
- Today, Brief, Focus, Weekly Review, or broad Business Memory integration
- Automated recommendations, outreach, reminders, or actions
- Commercial, proposal, agreement, billing, or Stripe work
- Training changes
- Inventory-media repair
- Theme-system changes
- Deployment
- Production-data mutation
- Consolidated manual browser testing (remains deferred)

---

## Architecture findings (baseline `0cc1704`)

### Clients (extend)

| Item | Location |
|------|----------|
| Collection | `payload/collections/Clients.ts` (`clients`) |
| Flat contact fields | `primaryContactName`, `primaryContactEmail` |
| Relationship health | `relationshipStatus`, `notes`, `nextAction` |
| Portfolio UI | `/admin/operations/clients` → `ClientPortfolioScreen` |
| Detail UI | `/admin/operations/clients/[id]` → `ClientWorkspaceScreen` |
| Loader | `lib/executive-client-workspace/fetch-client-workspace.ts` |
| Access | `isAuthenticated` → `isStudioPayloadOperator` |

### Contacts / people (gap — create)

No dedicated Contacts collection exists.

| Current substitute | Location |
|--------------------|----------|
| Flat primary contact | `Clients.primaryContactName` / `primaryContactEmail` |
| Embedded secondary contacts | `ExecutiveClientProfiles.secondaryContacts[]` (`name`, `role`, `email`) |
| Decision-maker text | `ExecutiveClientProfiles.primaryDecisionMaker` |

No dietary, accessibility, or preference fields exist anywhere in Payload schemas.

### Events vs calendar (do not confuse)

| System | Role | Phase 3 action |
|--------|------|----------------|
| **New operator Events workspace** | First-class relationship engagements (dinners, meetings, client events) with private operational context | **Create** |
| `executive-timeline-events` | Permanent relationship **history** log; `internalOnly` default true; Timeline UI | Reuse for optional history write / deep link — **do not rebrand as Events** |
| `client-timeline-events` | Lightweight client activity chronology | Do not overload as Events workspace |
| `lib/google/calendar/` + `lib/scheduling/` + `work-schedule-links` | Founder Google Calendar + Work scheduling | **Out of scope — do not rewrite or duplicate** |
| Automation / revenue / infrastructure / proposal view events | Domain audit logs | Unrelated |

### Auth, privacy, isolation (reuse)

| Control | Location |
|---------|----------|
| Operations shell auth | `app/admin/operations/layout.tsx` → `requireStaffAwarePage()` |
| Studio operator access | `payload/access/index.ts` — `isStudioPayloadOperator` / `isAuthenticated` |
| Restricted staff isolation | `lib/staff/guard.ts`, `lib/staff/permissions.ts` |
| Portal separation | Separate `portal-users` auth; portal JWTs fail studio access |
| Portal boundary verify | `npm run verify:portal-auth-boundaries` |
| Theme (reuse only) | `lib/shell/theme.ts`, `ThemeBootScript`, `design-system/os/styles/kxd-os.css` |

### Navigation

`components/admin/operations/shared/operations-nav.ts` — Clients group has Portfolio; **no Events entry**. Timeline remains under Intelligence.

### Migrations

- Files: `migrations/`
- Registry: `migrations/index.ts`
- Runner: `npm run migrate`
- Naming pattern: `YYYYMMDD_phase{N}_{description}.ts`
- Latest registered staff-related: `20260724_phase38d_staff_help_intelligence`

---

## Architecture decision (no Matt blocker)

Phase 3 is **additive**:

1. **New `client-contacts` collection** — first-class people records owned by a client, with private relationship context, preferences, dietary notes, and accessibility notes.
2. **New `client-relationship-events` collection** — first-class operator Events for operational relationship engagements, linked to clients and contacts. Distinct from Timeline history and Google Calendar.
3. **Extend** existing Clients portfolio/detail UI and operator navigation.
4. **Deep-link** to Payload Admin for advanced editing; do not rebuild Payload CMS inside the operator UI.
5. Preserve existing flat contact fields and executive-profile embedded contacts during Phase 3 (no destructive migration of historical contact text). Optional later backfill is out of scope unless required for UI coherence.

Optional non-blocking implementation choice (implementer may proceed with defaults below):

- Default event slug/labels: collection `client-relationship-events`, operator nav label **Events**, routes `/admin/operations/events`.
- Optional write-through to `executive-timeline-events` when an Event is created/completed — only if it does not expand scope into Timeline unification.

---

## Implementation batches

### Batch A — Data and privacy foundation

| Item | Definition |
|------|------------|
| **Status** | ✅ Published |
| **Collections** | `client-contacts` (`payload/collections/ClientContacts.ts`), `client-relationship-events` (`payload/collections/ClientRelationshipEvents.ts`) |
| **Access** | Collection CRUD via `isAuthenticated` → `isStudioPayloadOperator`; sensitive fields via `studioOperatorFieldAccess` |
| **Migration** | `migrations/20260727_phase3_client_relationship_intelligence.ts` (registered in `migrations/index.ts`) |
| **Verification** | `npm run verify:phase3-relationship-foundation`; also `npm run verify:portal-auth-boundaries` |
| **Privacy** | Operator-only; `internalOnly` default true; no portal/public imports of these collections |
| **Not started at Batch A** | Batch B Client Intelligence UI, Batch C Events routes, Batch D navigation, Batch E hardening completion |
| **Outcome** | Operator-only Payload collections and migration for contacts, relationship events, and private context fields; no public/portal serialization paths |
| **Areas** | `payload/collections/ClientContacts.ts`, `payload/collections/ClientRelationshipEvents.ts`, `payload.config.ts`, `migrations/20260727_phase3_client_relationship_intelligence.ts`, `migrations/index.ts`, `scripts/verify-phase3-relationship-foundation.ts` |
| **Dependencies** | Approved baseline; existing `isAuthenticated` / `isStudioPayloadOperator` |
| **Schema / migration** | Create tables/columns for contacts + relationship events; register migration; access = studio operators only; `internalOnly` (or equivalent) defaults true; sensitive fields never marked public-read |
| **Auth / privacy gates** | Collection access denies portal users and restricted staff; no public endpoints; confirm fields absent from portal loaders and public page props |
| **Verification (contract)** | Focused verify (access + field privacy inventory); `npm run verify:portal-auth-boundaries`; `npm run migrate` on local DB only when isolated |
| **Completion criteria** | Collections registered; migration up/down registered; privacy inventory documents zero public/portal exposure paths for new fields |
| **Commit boundary** | One commit: schema + migration + registration + privacy verify foundation |
| **Stop conditions** | Any need to mutate production data; any proposal to put sensitive fields on public/portal collections; collision that would rewrite Google Calendar or Timeline schemas |

### Batch B — Client Intelligence workspace

| Item | Definition |
|------|------------|
| **Status** | ✅ Published |
| **Location** | `/admin/operations/clients/[id]?tab=relationship` inside existing `ClientWorkspaceScreen` |
| **Outcome** | Operator Clients detail shows relationship intelligence summary, contacts CRUD, and read-only client-scoped relationship events with Payload deep links |
| **Contacts workflow** | Add / edit / mark active|inactive via `/api/admin/client-relationship/contacts` (+ `[id]` PATCH); client ownership forced from trusted workspace `clientId`; no hard delete; `internalOnly` kept true |
| **Events in Batch B** | Client-scoped read-only list; links to Batch C Events workspace for create/edit — no event mutations on the Relationship tab |
| **Privacy / ownership** | Studio-operator shell + `requirePayloadAdminApi`; portal/restricted staff denied; reads/writes scoped to selected client; forged client reassignment rejected |
| **Activity** | No activity/audit emission for contact changes (avoids private-field leakage into broad feeds) |
| **Schema / migration** | None — Batch A schema unchanged |
| **Verification** | `npm run verify:phase3-client-intelligence`; `npm run verify:phase3-relationship-foundation`; `npm run verify:portal-auth-boundaries`; build/typecheck |
| **Areas** | `lib/executive-client-workspace/*`, `components/admin/operations/client-workspace/RelationshipIntelligencePanel.tsx`, `WorkspaceTabs.tsx`, `WorkspaceTabContent.tsx`, `app/api/admin/client-relationship/contacts/**`, `scripts/verify-phase3-client-intelligence.ts` |
| **Dependencies** | Batch A |
| **Commit boundary** | One commit: Clients workspace intelligence UI + loaders + contact APIs + verify |
| **Stop conditions** | Theme-system rewrite; portal surface changes; commercial/billing coupling |
| **Not started** | Batch D broader cross-links / permission refinements, Batch E hardening completion |

### Batch C — Events workspace

| Item | Definition |
|------|------------|
| **Status** | ✅ Implemented (awaiting review/publication) |
| **Route** | `/admin/operations/events` (list), `/admin/operations/events/new` (create), `/admin/operations/events/[id]` (detail/edit) |
| **Navigation** | Clients group → **Events** (`operations-nav.ts`); page title “Relationship Events” |
| **Outcome** | Operator Events list + detail with search/filters, create/edit, status workflow, multi-contact association, links to client Relationship tab |
| **Capabilities** | List (upcoming-then-recent ordering); filters (title, client, status, category, timeframe); create; edit; status planned/completed/cancelled; no hard delete (use cancelled) |
| **Ownership** | Trusted `clientId` on create; owning client immutable on edit; associated contacts must belong to that client; cross-client contacts rejected |
| **Batch B link** | Client Relationship tab remains read-only for events; links to Events workspace; events appear in client-scoped context after save |
| **Privacy** | `requirePayloadAdminPage` + `requirePayloadAdminApi`; `internalOnly` forced true; no portal/public endpoints; no activity emission of private notes |
| **Separation** | No Calendar sync, Timeline writes, scheduling, reminders, or automation |
| **Schema / migration** | None — Batch A schema unchanged |
| **Verification** | `npm run verify:phase3-relationship-events`; Batch A/B verifies; portal auth boundaries; build |
| **Areas** | `app/admin/operations/events/**`, `components/admin/operations/events/**`, `lib/executive-client-workspace/events-data.ts`, `app/api/admin/client-relationship/events/**`, `form-options`, nav + edition map |
| **Dependencies** | Batches A–B |
| **Commit boundary** | One commit: Events workspace routes + UI + loaders + APIs + verify |
| **Stop conditions** | Using Calendar/scheduling as store; renaming Timeline to Events; portal exposure |
| **Not started** | Batch D broader connection refinements, Batch E hardening |

### Batch D — Relationship connections and navigation

| Item | Definition |
|------|------------|
| **Outcome** | Cross-links among Clients, Contacts, and Events; operator nav updated; permission-aware empty/loading/error states |
| **Areas** | `components/admin/operations/shared/operations-nav.ts`, cross-link UI on Clients/Events screens, restricted-staff path allowlists if required (`lib/staff/permissions.ts`) |
| **Dependencies** | Batches B and C |
| **Schema / migration** | None |
| **Auth / privacy gates** | Restricted staff remain isolated from new data surfaces unless explicitly allowed (default: deny / redirect per existing staff isolation) |
| **Verification** | Staff isolation checks; nav href resolution; `npm run verify:staff-experience` if path allowlists change |
| **Completion criteria** | Events appears in operator nav; bidirectional deep links work; restricted staff cannot reach private relationship data |
| **Commit boundary** | One commit: navigation + cross-links + permission wiring |
| **Stop conditions** | Broad nav redesign; training/staff product expansion beyond permission gates |

### Batch E — Verification, privacy hardening, and stabilization

| Item | Definition |
|------|------------|
| **Outcome** | Phase 3 privacy, auth, isolation, migration, build, and theme-compatibility verification complete; docs marked implemented only when true |
| **Areas** | `scripts/verify-*-relationship*` (or equivalent), docs updates to roadmap/current-state status, privacy leak checklist |
| **Dependencies** | Batches A–D |
| **Schema / migration** | None expected |
| **Auth / privacy gates** | Explicit checks: public HTML/metadata/JSON-LD/API/portal responses contain none of the private field names/values |
| **Verification** | `npm run build`; `npm run verify:portal-auth-boundaries`; Phase 3 verify script; migration bootstrap verify if applicable; Light/Dark/System smoke on Clients + Events (deferred consolidated manual browser testing remains deferred — focused checks only) |
| **Completion criteria** | All Phase 3 completion criteria green; exclusions still respected; no deploy; no production-data mutation |
| **Commit boundary** | One commit: verification + documentation completion notes |
| **Stop conditions** | Any public leak; any portal serialization of private fields; deploy request |

---

## Planned routes and surfaces

| Surface | Route | Notes |
|---------|-------|-------|
| Clients list (extend) | `/admin/operations/clients` | Existing |
| Client detail (extend) | `/admin/operations/clients/[id]` | Existing workspace |
| Events list (new) | `/admin/operations/events` | Operator-only |
| Event detail (new) | `/admin/operations/events/[id]` | Operator-only |
| Payload deep links | Payload Admin collection URLs | Advanced editing |
| Timeline (unchanged) | `/admin/operations/timeline` | Not rebranded |
| Scheduling / calendar (unchanged) | `/admin/work/scheduling`, calendar APIs | Out of scope |
| Portal (unchanged) | `/portal/*` | Explicitly excluded |

---

## Reuse inventory

- `isAuthenticated` / `isStudioPayloadOperator` (`payload/access/index.ts`)
- `requireStaffAwarePage` / staff isolation (`lib/staff/guard.ts`, `lib/staff/permissions.ts`)
- Clients portfolio + workspace screens and `fetchClientWorkspace`
- `operations-nav.ts` pattern
- Authenticated theme: `lib/shell/theme.ts`, `ThemeBootScript`, OS CSS tokens (no theme-system changes)
- `internalOnly` precedent on `executive-timeline-events`
- Verify conventions: `scripts/verify-*.ts`, `npm run verify:portal-auth-boundaries`, `npm run build`, `npm run migrate`

---

## Phase completion criteria

1. Operator can manage client-linked contacts with private relationship context and preferences.
2. Operator can manage Events with client/contact links and private operational notes (dietary/accessibility where relevant).
3. Clients and Events surfaces are authenticated, theme-compatible, and navigable from operator nav.
4. Privacy boundary holds under verification (no public/portal leakage).
5. Google Calendar / scheduling / rituals / Business Memory / commercial systems untouched.
6. Migrations registered and locally verifiable; no production-data mutation; no deploy in Phase 3 batches.

---

## Recommended implementation agent name

**Phase 3 Client Relationship Intelligence**

## Recommended first implementation prompt scope

**Batch A only** — data and privacy foundation (collections, access, migration, privacy verify). Do not begin Batches B–E until Batch A commit gate passes.
