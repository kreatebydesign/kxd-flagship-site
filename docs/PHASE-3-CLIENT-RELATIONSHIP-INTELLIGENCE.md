# Phase 3 — Client & Relationship Intelligence

**Status:** Batch A implemented (data & privacy foundation) — Batches B–E not started  
**Baseline (planning):** `e97a571515efabec3f47347d3a38133007b7aef0`  
**Companion:** `docs/KXD-OS-ROADMAP.md`, `docs/KXD-OS-CURRENT-STATE.md`

> Batch A landed collections, migration, and privacy verification only. Operator Clients/Events UI is **not** shipped.

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
| **Status** | ✅ Implemented (awaiting review/publication) |
| **Collections** | `client-contacts` (`payload/collections/ClientContacts.ts`), `client-relationship-events` (`payload/collections/ClientRelationshipEvents.ts`) |
| **Access** | Collection CRUD via `isAuthenticated` → `isStudioPayloadOperator`; sensitive fields via `studioOperatorFieldAccess` |
| **Migration** | `migrations/20260727_phase3_client_relationship_intelligence.ts` (registered in `migrations/index.ts`) |
| **Verification** | `npm run verify:phase3-relationship-foundation`; also `npm run verify:portal-auth-boundaries` |
| **Privacy** | Operator-only; `internalOnly` default true; no portal/public imports of these collections |
| **Not started** | Batch B Client Intelligence UI, Batch C Events routes, Batch D navigation, Batch E hardening completion |
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
| **Outcome** | Existing Clients list/detail surfaces show relationship context, preferences, and linked contacts with Payload deep links |
| **Areas** | `app/admin/operations/clients/**`, `components/admin/operations/client-portfolio/**`, `components/admin/operations/client-workspace/**`, `lib/executive-client-workspace/**`, Payload deep-link helpers |
| **Dependencies** | Batch A |
| **Schema / migration** | None expected beyond Batch A |
| **Auth / privacy gates** | Pages remain behind `requireStaffAwarePage`; loaders use Payload with operator session; no client-portal imports of private fields |
| **Verification** | Typecheck via `npm run build`; targeted loader/unit checks if added; spot-check Light/Dark/System via existing theme tokens (no theme-system changes) |
| **Completion criteria** | Operator can view/edit private relationship context and contacts from client detail; deep links to Payload records work; empty/loading/error states present |
| **Commit boundary** | One commit: Clients workspace intelligence UI + loaders |
| **Stop conditions** | Theme-system rewrite; portal surface changes; commercial/billing coupling |

### Batch C — Events workspace

| Item | Definition |
|------|------------|
| **Outcome** | Authenticated Events list + detail routes with client/contact links and private event intelligence (including dietary/accessibility where operationally relevant) |
| **Areas** | `app/admin/operations/events/page.tsx`, `app/admin/operations/events/[id]/page.tsx`, new components under `components/admin/operations/events/`, event loaders under `lib/` (additive), Payload deep links |
| **Dependencies** | Batch A; Batch B preferred for shared presentation patterns |
| **Schema / migration** | None expected beyond Batch A |
| **Auth / privacy gates** | Same operator shell; no public routes; no portal modules; no Google Calendar write path |
| **Verification** | `npm run build`; privacy inventory includes Events routes; confirm scheduling/calendar verify scripts unchanged |
| **Completion criteria** | Events list/detail usable for operators; client and contact links work; private notes never leave operator surface |
| **Commit boundary** | One commit: Events workspace routes + UI + loaders |
| **Stop conditions** | Using `lib/google/calendar` or `lib/scheduling` as the Events store; renaming Timeline to Events; portal exposure |

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
