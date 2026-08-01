# Phase 4 — Multi-Client Portal Access & Account Context

**Status:** Batches A–I implemented in repository — **code-complete; awaiting authenticated production rollout QA** (not fully production-complete)  
**Baseline (definition):** `5c4445fb03c0675aa50edc63a7b08ba3555e76e2`  
**Batch A implementation baseline:** `5c4445fb03c0675aa50edc63a7b08ba3555e76e2`  
**Batch H baseline (start):** `6957ddef171a8c102eef53653a4b46c625649aeb` (Batch G published)  
**Batch I baseline (start):** `74fcbc5ca049bebc994fb9f42010222fc39d2db1` (Batch H published)  
**Companion:** `docs/KXD-OS-ROADMAP.md`, `docs/KXD-OS-CURRENT-STATE.md`, `docs/KXD-OS-V1-FOUNDING-CLIENT-EARLY-ACCESS.md`, `docs/PHASE-4-PRODUCTION-ROLLOUT-CHECKLIST.md`, `docs/PHASE-4-PORTAL-IDENTITY-SECURITY.md`

> Phase 3 Client & Relationship Intelligence is production-complete and closed. Phase 4 does not reopen Phase 3. Relationship Intelligence remains operator-only and portal-inaccessible.
>
> **Batch status (repository):** Batches A–H as prior; Batch I adds private invitations, membership roles, WebAuthn passkeys, TOTP MFA, recovery codes (`verify:phase4-portal-identity-security`). Additive migration `20260814_phase4_portal_identity_security` is **not** applied to production in this batch. **Not** fully production-complete until authenticated multi-client production QA, Don/Cusick four-account readiness, OTP Carts readiness, and identity/security rollout gates pass.
>
> **Phase 5 sequencing:** Phase 5 (Client Billing Visibility) is approved as a **parallel non-Primal product lane** while Phase 4 rollout remains partially blocked. Starting Phase 5 does **not** waive, bypass, redefine, or complete Phase 4. Batch J, Batch J.2B.2, the Primal walkthrough, and the Primal reporting pilot remain paused. Spec: `docs/PHASE-5-CLIENT-BILLING-VISIBILITY.md`. Full Work Ledger / monthly billing recaps remain outside Phase 4; Phase 5 covers honest monthly work-summary reliability plus Stripe invoice **visibility**, not a complete Work Ledger.

---

## Product outcome

Establish **reusable** KXD OS support for one portal login accessing multiple authorized client accounts, with server-validated active-account context, strict per-account isolation, and an authorized combined portfolio view.

**Cusick is the first intended production configuration**, covering four independent clients:

| Display labels (UX only) | Stable identity rule |
|--------------------------|----------------------|
| Cusick Motorsports / CMM | Existing Client record (seed slug `cusick-morgan-motorsports`; resolve by durable client ID at configuration time) |
| OTP / On Track Performance | Existing Client record (seed slug `otp`) |
| OTP Carts | Must be confirmed or launched before membership linking (see OTP Carts readiness) |
| 2475 Townsgate | Existing Client record (seed slug `2475-townsgate`) |

Authorization must never hard-code display labels or slugs. Slugs are discovery aids; membership always binds **portal user ↔ client ID**.

### Completed Cusick experience (end of Phase 4)

- One primary portal login
- Server-authorized access to all four configured accounts
- Account switcher with clear account identity on every portal screen
- Per-account dashboards, analytics/reporting, monthly/current/upcoming work (honest scope), website performance, lead/form activity where available, recommendations/next actions, requests, files/deliverables, reports
- Combined portfolio view containing **only** authorized memberships
- No cross-account leakage
- No separate credentials per account
- Client-facing “approvals” = existing portal-safe Website Review / request awaiting-input states only (Batch G locked; do not expose staff approval systems or invent a new Approvals product)

This architecture must support future multi-brand clients without Cusick-only authorization shortcuts.

---

## Architecture decision — membership model

### Decision (locked)

**Hybrid design:**

1. **Dedicated collection** `portal-client-memberships` — source of truth for which clients a portal user may access.
2. **Server-controlled active-account context** — preferred active client stored as operator/API-writable state on `portal-users` (`lastActiveClientId` or equivalent), always revalidated against memberships on every session resolve.
3. **Legacy singular `portal-users.client` retained temporarily** — remains required during Batch A–B rollout as the backfill source and single-client compatibility anchor; deprecated only after verified dual-read/write and membership completeness.

Signed portal session cookie continues to authenticate **portal user identity only** (existing HMAC pattern). Active client is **never** granted by an unsigned browser value alone.

### Why this best fits the existing system

| Existing pattern | Fit |
|------------------|-----|
| `portal-users` auth + HMAC cookie signing only `portalUserId` (`lib/portal/session.ts`) | Keep identity cookie unchanged; resolve client server-side each request |
| Required singular `client` on portal users | Preserve during migration; backfill one membership per user |
| Portal Access creates one user ↔ one client | Extend to membership rows without rewriting auth |
| All portal loaders/APIs already scope by `session.clientId` | Keep that contract; change only how `clientId` is authorized |
| Payload join collections (e.g. Phase 3 contacts) | Membership collection matches additive, auditable, unique-constrained patterns |
| OTP/OTP Carts doctrine: separate clients, no parent org | Membership links people to clients; no parent-organization schema |

### Alternatives considered and rejected

#### 1. `hasMany` clients on `portal-users` only

**Rejected.** Insufficient for:

- Per-membership status (disable one account without deleting the user)
- Unique `(portalUser, client)` enforcement with clear operator UX
- Audit metadata (when granted, by whom, notes)
- Default-account flag without ambiguous array ordering
- Safe soft-revoke and fail-closed stale membership handling

A bare `hasMany` also encourages treating the array as mutable client-side state and weakens Portal Access clarity.

#### 2. Dedicated membership collection **without** server-persisted active-client preference

**Rejected as incomplete.** Membership alone does not define which account is active across tabs, refreshes, and devices. Relying only on an unsigned cookie/query client ID recreates the trust problem Phase 4 must eliminate. Relying only on in-memory UI state breaks multi-tab and deep-link consistency.

#### 3. Parent organization / account-group schema as authorization source

**Rejected.** Repository doctrine for OTP / OTP Carts explicitly requires separate executive profiles and **no parent organization**. Portfolio aggregation authorizes via **memberships**, not hierarchy. Optional later operator “account group” labels for UX are presentation-only and must not grant access.

### Email uniqueness

- Portal auth continues to use a single email identity per `portal-users` row (Payload auth uniqueness).
- One email → one portal user → **many** memberships.
- Do not create four portal users with the same email to simulate multi-account access.
- Password reset and login remain single-credential.

### Membership lifecycle

| Action | Behavior |
|--------|----------|
| **Add** | Operator (Portal Access / admin API) creates `portal-client-memberships` row for `(portalUserId, clientId)` with `status: active`. Reject duplicates. |
| **Disable** | Set membership `status: disabled` (or equivalent). User remains; that client no longer authorizes. If it was active/default, session resolution falls back (see below). |
| **Remove** | Soft-prefer disable; hard delete only if operator tooling explicitly supports it and no history requirement remains. Prefer disable for audit. |
| **Default** | At most one `isDefault: true` among **active** memberships per portal user. Enforced in hooks/API. |
| **Audit metadata** | Include `createdAt` / `updatedAt`; optional operator note and/or `grantedBy` if low-cost. Status is required. |

### Active-client state: database + server validation (not browser trust)

| Layer | Role |
|-------|------|
| Cookie | Signed `portalUserId` only (existing `kxd-portal-session`) |
| Database on `portal-users` | `lastActiveClientId` (nullable) — preference only |
| Memberships | Authorization truth |
| `getPortalSession()` | Every request: load user → load active memberships → choose authorized `clientId` → build session |

**Resolution order (fail closed):**

1. If portal user missing or `active === false` → no session.
2. Load **active** memberships for user. If none → no session (even if legacy `client` points somewhere invalid).
3. If `lastActiveClientId` is set **and** matches an active membership → use it.
4. Else if a membership marked `isDefault` exists → use it; sync `lastActiveClientId`.
5. Else if legacy `portal-users.client` matches an active membership → use it; sync preference.
6. Else use the sole active membership if exactly one; if multiple with no default → pick deterministic stable order (e.g. lowest client ID) **only after** Batch B documents the rule; until switcher ships, single-membership and legacy paths dominate.
7. Never accept a raw browser `clientId` as authorization. Switch requests may **propose** a client ID; server accepts only if membership-active.

### Stale / removed memberships

- Disabled/removed membership → cannot be selected; switch API returns generic denial.
- If `lastActiveClientId` points at disabled membership → clear/rebind to default or remaining membership on next resolve.
- If all memberships disabled → session fails closed (logout-equivalent null session).
- Denied responses must not reveal whether another client or record exists.

### Single-client compatibility

- Existing users with one membership behave identically to today.
- Shell continues to show one company name; switcher hidden or no-op when membership count ≤ 1 (Batch B).
- Portal Access create flow: creating a user still sets legacy `client` **and** creates the first membership (Batch A).

### Existing-user migration (conceptual — not executed in definition)

1. Additive migration creates `portal_client_memberships` (+ enums/indexes) and optional `portal_users.last_active_client_id`.
2. Backfill: for each portal user with a valid `client` FK, insert one active membership `(user, client)` if missing; set `isDefault: true`; set `lastActiveClientId` to that client.
3. Skip or quarantine users with missing/invalid legacy client (fail closed; operator repair) — do not invent clients.
4. Unique index prevents duplicates.
5. Dual-write during transition: Portal Access create/update maintains legacy `client` = default membership client until deprecation gate.
6. No destructive drop of `portal-users.client` in Batch A (or any batch until completion verifier + production verification).

### Portal Access management

- Extend `/admin/operations/portal-access` and `lib/portal/access-data.ts` to list memberships per user, add/disable memberships, set default.
- Create-user flow remains operator-only; still cannot be mutated by portal REST self-service.
- No automatic production linking of Cusick accounts without explicit operator confirmation.

### Plans and entitlements

- Remain **client-specific** via existing `lib/client-plans/` and CES profile resolution for the **active** `session.clientId`.
- Switching accounts re-resolves entitlements for the new active client.
- No portfolio-level entitlement override.

### Parent organization

- **Not introduced.** Four Cusick businesses remain four Client records. Portfolio = aggregate of authorized memberships only.

---

## Session and active-account model (exact future behavior)

| Event | Behavior |
|-------|----------|
| **Login** | Existing LocalAPI login → `createPortalSession(portalUserId)`. Resolve active client via membership rules. Reject if user inactive or zero active memberships. |
| **Initial / default account** | Prefer `lastActiveClientId` if authorized; else default membership; else legacy-compatible single membership. |
| **Signed session contents** | Cookie continues to encode signed portal user id only. Session object gains authorized `clientId`, `clientName`, and (Batch B+) membership list summary for switcher UI — never trust client list from browser. |
| **Switching** | `POST` portal switch endpoint with proposed `clientId`. Server checks active membership; updates `lastActiveClientId`; subsequent `getPortalSession()` returns new client. |
| **Membership validation** | On every session resolve and every portal API/loader. |
| **Session renewal** | Cookie max-age remains ~7 days; each request revalidates user + membership. |
| **Logout** | Destroy cookie; do not leave active-client preference as an auth token (preference may remain in DB for next login). |
| **Expired sessions** | Missing/invalid signature → login redirect; no client data. |
| **Removed/disabled membership** | Dropped from switcher; active rebound; APIs using old client fail closed. |
| **Disabled portal user** | No session (existing `active === false` rule). |
| **Direct links** | Paths remain `/portal/...` without client id in URL. Authorization is session active client. Resource IDs (report id, request id) must still belong to active client; mismatch → uniform denial. |
| **Multiple tabs** | Share cookie + DB `lastActiveClientId`. After switch in one tab, other tabs pick up new active client on next navigation/request. |
| **Back/forward** | May show cached UI briefly; server render and APIs always use current authorized active client. Batch B/H must avoid leaking prior-account serialized props. |
| **Stale account state** | Server rebind; client UI should refetch on switch (Batch B). |
| **Unauthorized client identifiers** | Ignored for auth; switch denied generically. |
| **Single-membership users** | Identical to pre-Phase-4 UX. |
| **Multi-membership users** | Switcher (Batch B); portfolio (Batch F). |
| **Operator impersonation** | No new impersonation feature. Existing operator Portal Access remains studio-auth only. Portal sessions must never become operator sessions. |

---

## Cusick account-group design

### Client model

Preserve four **separate** Clients. Do not merge. Do not add parent-org FKs for authorization.

### Membership configuration (operator)

1. Confirm/launch each Client identity (OTP Carts gate below).
2. Create **one** portal user for the primary login (Don or designated contact).
3. Add four active memberships to that user (client IDs only).
4. Set default membership (product choice; document at configuration time).
5. Display labels in switcher come from Client `name` (and optional CES identity), not hard-coded strings in auth code.

### Combined portfolio authorization

- Portfolio loader: `memberships = activeMemberships(portalUserId)` then load per-client summaries only for those IDs.
- Never union “all clients related to Cusick” by slug pattern or owner name.
- Never include operator Relationship Intelligence, dietary notes, or other Phase 3 private fields.

### Naming vs identity

| Concern | Rule |
|---------|------|
| Authorization | Client ID + membership status |
| Switcher labels | Client name / CES brand presentation |
| Docs / marketing | May say CMM / OTP Carts freely |
| Code | No `if (slug === 'cusick-...')` auth branches |

---

## OTP Carts readiness (required gate before Cusick linking)

Repository evidence today:

- Import/launch example: `lib/client-launch/examples/otp-carts-import.ts`
- Gate helpers: `lib/client-launch/otp-carts-readiness.ts`
- Operator UI: Client Import + Client Launch landing (`OtpCartsReadinessGatePanel`)
- Verifier: `npm run verify:otp-carts-readiness`
- **Not** present in `scripts/seed-clients.ts` (On Track Performance remains slug `otp`; OTP Carts expected slug `otp-carts`)
- Production existence **not** confirmed by the import example alone

**OTP Carts Launch Readiness — Batch A (Gate Hardening)** is **migration-independent**. It does not require Phase 3 or Phase 4 database migrations, does not add memberships, and does not start Phase 4 Batch B. It hardens the prerequisite gate so Cusick membership linking stays correctly blocked until a later approved production launch ops task.

**Before adding OTP Carts membership in any environment:**

1. Confirm or launch the OTP Carts Client record via Client Launch / import.
2. Resolve and record the stable client ID from that environment (do not invent).
3. Verify plans, CES modules, and reporting connections as required for portal surfaces.
4. Only then add membership for the portal user.
5. Do not inspect or mutate production as part of Batch A planning/implementation unless an explicit production ops task is approved separately.

---

## Migration and rollout strategy

### Principles

- Additive only in Batch A
- No destructive drop of `portal-users.client` in Batch A
- No automatic production Cusick linking
- Preserve single-client behavior
- Dual-write legacy `client` ↔ default membership until deprecation gate

### Deployment ordering (Batch A)

1. Ship code that **reads** memberships when present, else falls back to legacy `client` (compatibility window).
2. Run additive migration + backfill on target DB (local/staging first).
3. Verify single-client users still authenticate and load data.
4. Enable Portal Access membership management.
5. Only after Batch A verifiers pass, publish/deploy per release practice.

### Rollback considerations

- Down migration drops new membership table/columns only if no production dependency yet; prefer feature-flag/read-fallback if already backfilled in production.
- Legacy `client` remains usable for rollback during compatibility window.
- Do not delete portal users or client records as part of Phase 4 migrations.

### Deprecation of legacy singular `client`

Allowed only when **all** are true:

1. Every portal user has ≥1 active membership matching intended access.
2. Session resolution no longer needs legacy field.
3. Portal Access and seed scripts write memberships only.
4. `verify:phase4-multi-client-portal-completion` (or Batch A+B verifiers) asserts dual-path removal is safe.
5. Explicit later batch documents the column drop (not Batch A).

---

## Security and privacy requirements (locked)

- Membership resolved server-side only
- Active client must belong to the authenticated portal user’s **active** memberships
- Client IDs never grant access by themselves
- Every portal loader/API uses authorized session context
- No cross-account analytics, work, requests, reports, files, assets, reviews, leads, notes, or deliverables leakage
- Combined views aggregate only authorized memberships
- Portal auth ≠ staff/operator auth; restricted staff permissions unchanged
- Phase 3 Relationship Intelligence remains portal-inaccessible and out of public payloads
- Plans/editions/entitlements/modules resolve per active client
- Unauthorized/removed memberships fail closed
- Account switch clears or safely rebinds cached client data (no stale serialized props)
- Deep links cannot bypass active-account authorization
- Denied responses do not reveal existence of other clients/records
- Sensitive values do not enter URLs, query strings, metadata, public payloads, or general logs

---

## Implementation batches

### Batch A — Multi-client membership model and authorization foundation

| Item | Definition |
|------|------------|
| **Status** | ✅ Implemented locally — awaiting publication / production migration verification |
| **Objective** | Additive membership schema, backfill, server-only membership resolution, active-client authorization foundation, Portal Access membership management, single-client compatibility |
| **User-visible outcome** | None required for clients; operators can manage memberships in Portal Access. Existing portal login behavior unchanged for single-membership users |
| **Systems reused** | `portal-users`, `lib/portal/session.ts`, Portal Access (`lib/portal/access-data.ts`, `PortalAccessScreen`), existing portal API session gates, Payload migration patterns |
| **Implemented areas** | `payload/collections/PortalClientMemberships.ts`, `payload/hooks/portal-client-memberships.ts`, `lib/portal/memberships.ts`, `lib/portal/session.ts`, Portal Access APIs/UI, `migrations/20260728_phase4_portal_client_memberships.ts`, `scripts/verify-phase4-multi-client-membership.ts` |
| **Authorization** | Operator-only membership mutations; portal users cannot self-edit memberships via REST; session resolve validates membership |
| **Schema / migration** | **Required** — additive membership table + `lastActiveClientId`; backfill from legacy `client`; unique `(portalUser, client)`; **no** destructive drop |
| **Data requirements** | Existing portal users with valid client FKs; no Cusick production linking |
| **Verification** | `npm run verify:phase4-multi-client-membership`; also portal-auth-boundaries / Phase 3 completion regression |
| **Dependencies** | Phase 3 complete; definition baseline `5c4445f…` |
| **Exclusions** | Switcher UI; combined portfolio; Cusick real-user linking; OTP Carts production create unless separate ops task; Advisor/AI; parent org; dropping legacy `client` |
| **Stop conditions** | Proposal to merge clients; trust browser client IDs; destructive migration; Phase 3 portal exposure |
| **Risk** | Medium–High (auth foundation) |
| **Publication / deploy** | After Batch A verifiers + build; staging migration before production |

### Batch B — Account switcher and active-account context

| Item | Definition |
|------|------------|
| **Status** | ✅ Implemented in repository — awaiting publication / production verification with Batch A |
| **Objective** | Server-validated switch endpoint; persistent active account; clear identity in portal shell; safe defaults, stale state, direct links, multi-tab |
| **User-visible outcome** | Multi-membership users see account switcher and correct company identity after switch |
| **Systems reused** | `ClientHqShell` / CES shell, session resolve, Batch A memberships |
| **Likely code areas** | `app/api/portal/account/switch/route.ts` (or equivalent), `components/client-hq/ClientHqShell.tsx`, portal layout, session helpers |
| **Authorization** | Switch only to active memberships; forged IDs denied |
| **Schema / migration** | None expected if Batch A added preference field |
| **Verification** | Switch auth tests; stale membership rebound; single-membership hides switcher; no client id in URLs |
| **Dependencies** | Batch A |
| **Exclusions** | Combined portfolio; new dashboard widgets; Cusick hard-coding |
| **Stop conditions** | Client id in public URLs; cache leakage across switches left unaddressed |
| **Risk** | Medium |
| **Publication / deploy** | After Batch B verifiers; can ship before Cusick linking |

### Batch C — Per-account dashboard composition

| Item | Definition |
|------|------------|
| **Status** | ✅ Implemented in repository (workspace personalization / per-account composition) |
| **Objective** | Active client identity + entitled modules only; no stale content across switches; four-account readiness without Cusick-specific auth |
| **User-visible outcome** | `/portal` home reflects active account brand/modules |
| **Systems reused** | CES home, connected workspace, executive performance / partnership compose, `resolveExperienceProfile` |
| **Likely code areas** | `app/(portal)/portal/(app)/page.tsx`, `lib/portal/connected-workspace.ts`, CES compose paths |
| **Authorization** | All loaders use session `clientId` |
| **Schema / migration** | None |
| **Verification** | Profile/module resolve per active client; switch then home shows rebound data |
| **Dependencies** | Batch B |
| **Exclusions** | Portfolio view; new intelligence layers |
| **Stop conditions** | Hard-coded Cusick dashboard branches |
| **Risk** | Medium |
| **Publication / deploy** | Standard |

### Batch D — Monthly, current, and upcoming work

| Item | Definition |
|------|------------|
| **Status** | ✅ Implemented in repository (`lib/portal/work-performance/`, `verify:phase4-work-performance`) |
| **Objective** | Portal-safe visibility for monthly completed work, current work, upcoming priorities — **honest** about gaps (no silent “full Work Ledger”) |
| **User-visible outcome** | Clear work sections on dashboard or dedicated views for active account |
| **Systems reused** | `monthly-deliverables`, website review current work, timeline/activity, work items only if already portal-safe |
| **Likely code areas** | `lib/portal/data.ts`, connected workspace, CES briefing zones |
| **Authorization** | Active client scope only |
| **Schema / migration** | None expected |
| **Verification** | Scoped work queries; empty states honest |
| **Dependencies** | Batch C |
| **Exclusions** | Billing ledger; inventing work history; Phase 3 private notes |
| **Stop conditions** | Claiming Work Ledger completeness falsely |
| **Risk** | Medium |
| **Publication / deploy** | Standard |

### Batch E — Analytics, website performance, and lead visibility

| Item | Definition |
|------|------------|
| **Status** | ✅ Implemented in repository — `verify:phase4-analytics-visibility` |
| **Objective** | Per-account analytics, website health/reporting, lead/form activity **where existing data supports it**; honest unavailable states |
| **User-visible outcome** | Analytics/reports/health reflect active account only |
| **Systems reused** | `lib/reporting/`, portal analytics/reports/website-health pages, provider connections, Batch D work-performance honesty |
| **Implemented areas** | `lib/portal/analytics-visibility/`, `/portal/analytics`, website-health connection honesty, report access helper, `scripts/verify-phase4-analytics-visibility.ts` |
| **Authorization** | Strict client scoping; no cross-account metric merge except Batch F portfolio under membership rules |
| **Schema / migration** | None |
| **Verification** | `npm run verify:phase4-analytics-visibility`; reports/analytics scoped; forged report ids denied |
| **Dependencies** | Batch C (B minimum) |
| **Exclusions** | New vendor integrations; fake metrics; Batch F portfolio enablement; branded-report production release |
| **Stop conditions** | Cross-account metric leakage |
| **Risk** | Medium |
| **Publication / deploy** | Standard |

### Batch F — Authorized combined portfolio view

| Item | Definition |
|------|------------|
| **Status** | ✅ Implemented in repository — `verify:phase4-authorized-portfolio` |
| **Objective** | Aggregate only the user’s authorized memberships with clear per-account breakdowns |
| **User-visible outcome** | Portfolio screen/summary across memberships |
| **Systems reused** | Membership list + existing per-client work-performance loaders + Batch D multi-site overview compose |
| **Implemented areas** | `lib/portal/portfolio.ts`, `lib/portal/authorized-portfolio/`, `/portal/portfolio`, `PortfolioScreen`, shell nav when multi-account authorized |
| **Authorization** | Membership-only aggregation; no parent-org shortcut; no Phase 3 relationship fields |
| **Schema / migration** | None |
| **Verification** | `npm run verify:phase4-authorized-portfolio`; Portfolio ⊆ memberships; user with 1 membership sees single-account equivalent (redirect to Overview); unauthorized clients absent |
| **Dependencies** | Batches A–E recommended (A–C minimum) |
| **Exclusions** | Operator Client Portfolio redesign; private relationship intelligence |
| **Stop conditions** | Slug-pattern or owner-name authorization |
| **Risk** | Medium–High |
| **Publication / deploy** | After isolation verifiers |

### Batch G — Requests, files, reports, and approval decision

| Item | Definition |
|------|------------|
| **Status** | ✅ Implemented in repository — `verify:phase4-requests-files-reports` |
| **Objective** | Confirm requests/files/reports remain correctly scoped after switching; **lock** what “client approvals” means for portal |
| **Product decision (locked)** | “Client approvals” means only existing portal-safe Website Review and request states where the client’s review, feedback, or input is currently required (including established “awaiting your input” terminology). **Do not** create a new Approvals product, `/portal/approvals` route, Approvals nav item, collection, generic approval workflow, or rename Website Review/requests to “Approvals.” **Do not** expose staff Approval Queue, Matt-approval systems, internal communications approvals, private notes, or operator-only workflows. Later phases must not reinterpret this decision as authorization for a broader approvals system. |
| **Implementation type** | (1) Documented product decision; (2) focused isolation verification of existing per-active-account surfaces; (3) security hardening only for proven authorization/scoping/leakage gaps. Not a redesign, aggregate workspace, notification system, or upload-architecture change. |
| **User-visible outcome** | Existing scoped requests/files/deliverables/reports/Website Review/Workspace flows; CES launch surfaces remain nav-aligned; no new Approvals UI |
| **In-scope surfaces** | `/portal/requests`, `/portal/assets`, `/portal/deliverables`, `/portal/reports`, Website Review, Website Workspace request flows, portal-safe uploads/attachments for those flows, supporting loaders/APIs/direct routes, active-client switching isolation, capability gating |
| **Systems reused** | Existing portal request/report/asset/deliverable loaders; Batch E `decidePortalReportAccess`; CES Website Review / Workspace APIs; `client-review-media` durable Blob storage; CES launch nav visibility |
| **Implemented areas** | `lib/portal/requests-files-reports/`, report view-model hardening, CES module API gates on review/workspace upload+attachment routes, uniform attachment/related-project denials, Client HQ surface page gates, `scripts/verify-phase4-requests-files-reports.ts` |
| **Authorization** | Session active client + active memberships; attachment/report/project ownership checks; CES module entitlement on review/workspace APIs; browser client IDs never authorize |
| **Schema / migration** | **None** — no new collection; no production migration |
| **Verification** | `npm run verify:phase4-requests-files-reports` — cross-switch resource isolation; approval decision documented; no Approvals route/nav; staff approval systems absent from portal |
| **Dependencies** | Batch B+ (A–F recommended) |
| **Exclusions** | Staff Matt-approval systems; operator-only queues; `/portal/approvals`; aggregate cross-account requests/files/reports/deliverables; portfolio work queue; new upload semantics; notifications; Batch H rollout/live QA |
| **Stop conditions** | Accidental staff approval exposure; inventing Approvals product; schema change without separate decision |
| **Risk** | Low–Medium |
| **Publication / deploy** | Standard — do not begin Batch H until Batch G is published/verified as required by ops |

### Batch H — Privacy, responsive, accessibility, rollout, and completion

| Item | Definition |
|------|------------|
| **Status** | ✅ Implemented in repository — **authenticated production QA blocked**; Phase 4 not fully complete |
| **Objective** | Cross-account isolation verification; responsive/a11y QA; production rollout checklist; Don/Cusick presentation readiness; final Phase 4 completion verifier |
| **User-visible outcome** | Production-ready multi-client portal for configured Cusick group (ops-gated) |
| **Systems reused** | All Phase 4 surfaces + founding-client smoke patterns |
| **Implemented areas** | `scripts/verify-phase4-multi-client-portal-completion.ts`; package script `verify:phase4-multi-client-portal-completion`; account-switcher keyboard/a11y hardening; long-name overflow fixes; `docs/PHASE-4-PRODUCTION-ROLLOUT-CHECKLIST.md` |
| **Authorization** | Full matrix below (static + pure-unit + prior A–G verifiers) |
| **Schema / migration** | **None** — legacy `client` deprecation deferred |
| **Verification** | `npm run verify:phase4-multi-client-portal-completion` + rollout checklist; Don/Cusick live QA still required |
| **Dependencies** | Batches A–G published; OTP Carts readiness; operator-configured memberships |
| **Exclusions** | Approvals product; parent orgs; public `/media` redesign; unrelated platform work; production membership mutations without Matt approval |
| **Stop conditions** | Isolation failure; incomplete OTP Carts; unverified production |
| **Risk** | Medium |
| **Publication / deploy** | Phase 4 fully complete only after production verification + Don/Cusick four-account QA |
| **Remaining open risk** | Pre-existing public Payload `/media/...` onboarding-asset exposure — documented, **not** fixed in Batch H |

---

## Verification strategy

### Incremental verifiers (by batch)

Introduce focused scripts as batches land (names indicative):

- `verify:phase4-multi-client-membership` (Batch A)
- `verify:phase4-account-switcher` (Batch B)
- `verify:phase4-workspace-personalization` (Batch C)
- `verify:phase4-work-performance` (Batch D)
- `verify:phase4-analytics-visibility` (Batch E)
- `verify:phase4-authorized-portfolio` (Batch F)
- `verify:phase4-requests-files-reports` (Batch G)
- …plus existing `verify:portal-auth-boundaries` / portal admin auth boundary scripts retained

### Final verifier (required for Phase 4 complete)

`npm run verify:phase4-multi-client-portal-completion`

Must eventually prove:

1. Existing single-client users still work
2. One user can hold multiple valid memberships
3. Duplicate memberships are rejected
4. Disabled users fail closed
5. Disabled/removed memberships fail closed
6. Default account selection is authorized
7. Active-account switching is authorized
8. Forged client IDs cannot switch context
9. Stale sessions recover safely
10. Direct links cannot bypass membership
11. APIs/loaders ignore unauthorized browser client IDs
12. Per-account reports remain scoped
13. Per-account analytics remain scoped
14. Per-account files and deliverables remain scoped
15. Requests and reviews remain scoped
16. Combined portfolio results include only memberships
17. Portal sessions cannot become operator sessions
18. Restricted staff permissions are not broadened
19. Phase 3 Relationship Intelligence remains portal-inaccessible
20. Private data absent from URLs, metadata, logs, and public responses (inventory assertions)
21. Plans/entitlements resolve per active client
22. No account-switch cache-leakage patterns in loaders (session client always passed; no global client memo across users)

Do **not** implement these scripts in the definition task.

### Manual / ops gates (Batch H)

- Desktop / tablet / mobile QA (repository a11y hardening landed; live viewport QA remains ops)
- Keyboard and screen-reader QA on switcher and portfolio
- Production rollout checklist: `docs/PHASE-4-PRODUCTION-ROLLOUT-CHECKLIST.md`
- Don/Cusick read-only QA across all four account contexts (**blocked** until OTP Carts + membership configuration)
- Safe authenticated multi-client production QA for Matt/KXD/Primal (**blocked** until production identity inventory confirmed)

### Batch H inventory note (2026-07-31)

Read-only production identity inventory could not be completed from this workstation:

- `.env.production.local` contains empty placeholders for `DATABASE_URL` / Neon credentials
- Neon MCP org listing had no accessible project for `mute-violet-81514071`
- Local DB had no matching portal users for Matt / Don / Cusick / Primal / inventory QA identities

**Do not fabricate PASS for authenticated production QA.** Propose membership mutations only with Matt’s separate approval.

---

## Definition of Phase 4 complete

Phase 4 is complete only when:

1. Existing portal users remain functional.
2. One authorized login can access multiple independent clients.
3. Switching accounts is server-authorized and fail-closed.
4. Account identity is clear across all portal screens.
5. Per-account dashboard data remains isolated.
6. Cusick’s four accounts can be configured **without** custom authorization code.
7. Combined portfolio results include only authorized accounts.
8. Monthly/current/upcoming work is represented honestly.
9. Analytics, reports, leads, requests, files, and deliverables remain correctly scoped.
10. All security, regression, responsive, and accessibility gates pass.
11. The exact release is deployed and production-verified.
12. Don/Cusick read-only QA confirms all four account contexts.

**Repository Batch H posture:** items proven statically via A–H verifiers; items 11–12 and live authenticated multi-client QA remain open → Phase 4 is **code-complete but not fully production-complete**.

---

## Explicit phase exclusions

- Reopening or modifying Phase 3 Relationship Intelligence behavior
- Parent-organization authorization model
- Cusick-only auth shortcuts / hard-coded slug allowlists for access
- AI summaries, scoring, or sentiment
- Full Work Ledger / monthly billing recaps (founding-client deferred items) unless a later phase explicitly adds them
- Self-service workspace provisioning
- Broad portal redesign unrelated to multi-client context
- Automatic production account linking without operator confirmation
- Neon inspection or production mutation during definition / Batch A unless separately approved ops work

---

## Risks and decisions locked vs open

### Locked by this plan

- Phase title and hybrid membership architecture
- No parent-org auth
- Cookie signs user id only; active client server-validated
- Legacy `client` retained through Batch A
- Cusick = four separate clients + memberships
- Batch A–H sequence

### Locked by Batch G

- Portal “client approvals” = existing Website Review / request awaiting-input (and equivalent portal-safe input-required) states only
- No Approvals product, route, nav, collection, or staff-queue exposure in Phase 4
- Batch G is isolation verification + proven-gap hardening for existing per-active-account request/file/report/deliverable/attachment surfaces

### Open until configuration / later batch (non-blocking for Batch A)

- Exact default account for Don’s login (operator choice at linking time)
- OTP Carts client ID in each environment (readiness gate)
- Timing of legacy `client` column drop (after completion gates)

### Batch I — Private invitations, roles, passkeys, MFA

Authoritative detail: `docs/PHASE-4-PORTAL-IDENTITY-SECURITY.md`.

- Invitation-only activation (operator Portal Access); client-delegated invites disabled
- Membership roles: `client-owner` | `client-admin` | `client-member` (legacy → `client-member`)
- WebAuthn passkeys + TOTP + recovery codes; biometrics never stored by KXD
- Verifier: `npm run verify:phase4-portal-identity-security`
- Early-access: email unique login; no domain grants; no public registration; no SMS MFA
- Production identity rollout (Matt/Don/Billy/Nicole/Adam/Tyler) documented only — **unexecuted**

---

## Documentation map

| Document | Role |
|----------|------|
| This file | Authoritative Phase 4 plan |
| `docs/PHASE-4-PORTAL-IDENTITY-SECURITY.md` | Batch I invitations / roles / passkeys / MFA |
| `docs/PHASE-4-BATCH-J-IDENTITY-ROLLOUT.md` | Batch J production deploy / migrate / smoke procedure |
| `docs/PHASE-4-BATCH-J-PILOT-ACTIVATION-RUNBOOK.md` | Post-smoke pilot activation (not broad client rollout) |
| `docs/PHASE-4-PRODUCTION-ROLLOUT-CHECKLIST.md` | Production rollout / authenticated QA checklist |
| `docs/KXD-OS-ROADMAP.md` | Product-track status |
| `docs/KXD-OS-CURRENT-STATE.md` | Engineering focus |
| `docs/KXD-OS-V1-FOUNDING-CLIENT-EARLY-ACCESS.md` | Multi-brand moved into active Phase 4 plan |
| `docs/PHASE-3-CLIENT-RELATIONSHIP-INTELLIGENCE.md` | Closed prior phase (operator-only) |

---

## Recommended Batch A implementation prompt (for next session)

Implement Phase 4 Batch A only per `docs/PHASE-4-MULTI-CLIENT-PORTAL.md` on baseline `fdb03485ab41184092033727b4661b01f42a2840`: additive `portal-client-memberships` collection + migration + backfill from legacy `portal-users.client`; optional `lastActiveClientId`; server-only membership resolution in `getPortalSession` with legacy fallback; Portal Access membership management; Batch A verifiers. No switcher UI, no portfolio view, no Cusick production linking, no parent organization, no destructive drop of legacy `client`, no Phase 3 changes.
