# Phase 6 — KXD Connect

**Status:** Batches **C0**, **C1**, **C2**, and **C3** implemented. Later batches (C4+) not authorized.  
**Baseline HEAD at C0 start:** `a8802ff` (Phase 5 billing visibility closed on `main`)  
**C0 commit:** `8a208f9730dfc18c082a48373355539bbe8dd065`  
**C1 commit:** `7fc73bf38c1ed5d9f4a4c1b06426343daebf8824`  
**C2 commit:** `9afcaa5c43b3adab95400b49b37efe182093bfa9`  
**Companion:** `docs/KXD-OS-ROADMAP.md`, `docs/KXD-OS-CURRENT-STATE.md`, `docs/CLIENT_COMMUNICATIONS.md`

---

## Product promise

KXD Connect turns team, partner, and client conversations into accountable action inside the same operating system where the work happens.

Connect is a **secure, reusable, multi-organization platform**. KXD is the first organization and proving ground — not a permanent hard-coded boundary.

No new paid recurring infrastructure is authorized for Connect.

---

## Experience north star (not implemented in C0–C2)

Later authorized UX batches may deliver a premium AOL/macOS-inspired operating-system-style workspace, including:

- Clean operating-system-style workspace
- Customizable dock
- App launcher
- Buddy List
- Notification center
- Premium motion
- Optional positive spoken welcome/logout experience
- Simplified broader KXD OS navigation

**These surfaces are not implemented in C0–C5.** C2 is a staff messaging foundation only — not the final Connect shell. C3 is local dogfood readiness. C4 adds local activation controls. C5 is the structured local dogfood operating period — not production rollout, not general availability. Do not present dock/Buddy List/notifications as available. C6+ is not approved by this documentation.

---

## Separate readiness tracks (corrected launch decision)

Connect **does not block** the initial KXD OS Founding Client Early Access launch.

| Track | Meaning |
|-------|---------|
| 1. KXD OS Founding Client Early Access | Existing portal/OS readiness — independent of Connect |
| 2. KXD Connect MVP readiness | Connect feature completeness for dogfood |
| 3. Connect founding-company pilot readiness | Controlled pilot after dogfood gates |
| 4. Commercial Connect readiness | Packaging, metering enforcement, commercial exposure |

Connect must pass its own feature-flagged dogfood and pilot gates before client exposure.

---

## What Batch C0 delivers

Smallest coherent foundation so later Connect records can be:

- Owned by an organization
- Safely feature-flagged
- Commercially metered (primitives only)
- Disabled without deleting data

**C0 does not create a partially usable chat interface.**

---

## What Batch C1 delivers

Secure, organization-owned conversation and message data layer for later KXD staff dogfooding:

- Organization-owned conversations (`connect-conversations`)
- Organization-owned conversation membership (`connect-conversation-participants`)
- Organization-owned messages (`connect-messages`)
- Small internal group conversations + direct conversations
- Secure server-side authorization (fail closed)
- Cursor-based message pagination (polling-ready; no polling UI)
- Private per-participant unread/read-state primitives
- Trusted message usage metering integrated with C0 meters
- Audit coverage for conversation/membership security events
- Focused admin APIs/services + `npm run verify:phase6-batch-c1`

**C1 does not create the visible Connect experience.** No shell, dock, Buddy List, inbox UI, portal UI, presence, attachments, notifications, realtime transport, or `message-kxd` replacement.

---

## Multi-organization ownership model

| Concept | Role | Relationship to Connect |
|---------|------|-------------------------|
| **Connect organization** | Tenant that owns Connect data | `connect-organizations` |
| **Client** (`clients`) | KXD OS client system-of-record | Distinct — not auto-promoted to Connect orgs |
| **Portal client membership** | Portal user ↔ Client access | Distinct — never grants Connect access alone |
| **Portal account / Connected Workspace** | Client HQ experience | Distinct — unchanged |
| **Client Communications** | Operator CRM communication log | Distinct — remains Client Communications |
| **Marketing Partners** | Public/site partners | Distinct |

Stable organization identifier: lowercase `key` (e.g. `kxd`). Sequential Payload `id` values are internal and must not be used as public discovery mechanisms.

Conversations and messages always belong to exactly one Connect organization. Cross-organization access fails closed.

---

## Identity and membership boundaries

Collection: `connect-organization-memberships`

Roles:

- `platform-operator`
- `organization-admin`
- `organization-member`

Subject kinds (schema-ready):

- `staff-user` — C0/C1 dogfood path
- `portal-user` — reserved for future external participants; **not enabled for C0/C1 access evaluation**

Rules:

- Organization-scoped
- Unique membership per (organization, staff user) or (organization, portal user)
- Fail closed when identity or organization is invalid
- Portal users are not Connect members merely because they have portal access
- Current KXD clients are not automatic Connect organizations
- Multi-organization membership is schema-compatible; **no switcher UI in C0/C1**

---

## Conversation ownership (C1)

Collection: `connect-conversations`

Every conversation:

- Belongs to exactly one Connect organization
- Has a stable non-sequential `publicId` (UUID) for API exposure
- Has type `direct` or `group` (internal dogfooding only)
- Has lifecycle status `active` | `archived`
- Tracks `createdAt` and `latestMessageAt`
- Supports an optional concise title for internal groups
- Does **not** store computed unread totals as global truth
- Remains unavailable when Connect access evaluation fails
- Is inaccessible across organization boundaries

Not implemented: public channels, Slack-style workspaces/rooms, client/vendor conversations, discoverable organization directories.

---

## Conversation membership (C1)

Collection: `connect-conversation-participants`

Rules:

- Participant must hold a valid **active** Connect organization membership
- Participant cannot be added using client-controlled organization authority
- Duplicate active participation is rejected (unique index + service checks)
- Direct conversations have exactly two eligible internal organization members
- Group conversations require at least two eligible participants at creation
- Participant add/remove requires organization-admin / platform-operator authority (self-leave allowed)
- Cross-organization participants fail closed
- Deactivated organization memberships lose conversation access immediately (access evaluation)
- Historical message authorship remains intact if a participant leaves (`status: left`)
- Membership changes are audited
- C1 supports **staff-user** identities only; portal identities remain denied

Schema is designed so future external participant types can be added without rewriting conversation ownership — not implemented now.

### Direct-conversation uniqueness

Server-computed deterministic pair key:

`direct:{organizationId}:{minStaffUserId}:{maxStaffUserId}`

- A→B and B→A resolve to the same active direct conversation
- Unique partial index prevents concurrent duplicates
- Same staff pair may have separate direct conversations in different organizations
- Client-supplied pair keys are rejected and cannot bypass authorization

---

## Message ownership and content limits (C1)

Collection: `connect-messages`

Every message:

- Belongs to exactly one organization and one conversation in that organization
- References an authorized conversation participant as author
- Uses a stable `publicId` (UUID)
- Stores **plain text only**
- Maximum length: **4000 characters** (`CONNECT_MESSAGE_MAX_LENGTH`)
- Empty / whitespace-only content is rejected after trim
- Organization and conversation ownership are immutable
- Organization identity is never accepted solely from client input

**Deferred (explicit):** message editing, soft-deletion/redaction, rich text, HTML, Markdown rendering, embeds, attachments, reactions, threads, AI processing, link previews, forwarding.

Ordinary message sending does **not** create a noisy operator audit event; usage meters track quantities.

---

## Authorization order (C1)

Trusted server-side path (`authorizeConnectMessaging` / session resolution):

1. Authenticated identity (Payload staff `users` session)
2. Global Connect release controls (kill switch, feature/enablement, dogfood allowlist)
3. Active Connect organization
4. Active organization membership
5. Active conversation (where required)
6. Active conversation participation (where required)
7. Organization consistency across all records
8. Permission for the requested operation

No API may rely on the browser supplying a trustworthy organization ID, membership ID, author ID, or role.

Kill switch stops reads and writes immediately without deleting data.

---

## Pagination / polling-ready strategy (C1)

- Organization + conversation scoped
- Stable cursor: `{ createdAt, publicId }` (base64url JSON)
- Deterministic order: `createdAt ASC`, `publicId ASC`
- Bounded page size (default 50, max 100)
- No unbounded history reads
- `direction=after` supports fetching messages newer than a trusted cursor (future short polling)
- Equal / near-equal timestamps handled via `publicId` tie-break
- Responses use `Cache-Control: no-store`
- Unsupported methods return 405
- Does not expose internal Payload authorization details
- No paid realtime dependency, WebSockets, or SSE

C1 did not implement a polling UI. **C2** adds visibility-aware short polling on the selected thread (see Batch C2).

---

## Private unread / read-state behavior (C1)

Per-participant fields on `connect-conversation-participants`:

- `lastReadMessagePublicId`
- `lastReadAt` (private; not a read receipt)

Behavior:

- Mark conversation read through trusted server-side operation
- Unread derived from messages newer than the private cursor
- Idempotent mark-read
- Concurrent newer messages after mark-read remain unread for that participant
- No read receipts visible to other participants
- No “seen by” UI or participant-facing read timestamps
- List/fetch does **not** auto mark-read

---

## Metering integration (C1)

After successful durable creation:

- `conversations_created` with idempotency key `conversation:{publicId}`
- `messages_sent` with idempotency key `message:{publicId}`

Rules:

- Meter only after successful durable write
- Do not double-count on retries
- Do not meter rejected/failed messages
- Never place message content, names, or PII in meter records
- Organization isolation preserved

### Atomicity status

- **Postgres path (required for dogfood):** `lib/connect/metering/atomic.ts` performs idempotency reservation + `INSERT … ON CONFLICT DO UPDATE` quantity increment.
- **Sqlite local fallback:** contained Payload LocalAPI read-modify-write remains. Concurrent distinct increments can lose updates under RMW.

**Blocking before dogfood activation:** confirm production/local dogfood uses Postgres so the atomic path is active. No pricing, allowance enforcement, customer billing, Stripe, or overages in C1.

---

## Audit privacy rules (C1)

Append-only `connect-audit-events` covers:

- Conversation creation
- Conversation archive / reactivation (when used)
- Participant addition / removal
- Existing C0 organization / membership / meter adjustment events

Does **not** audit ordinary message bodies or duplicate private content into audit records.

---

## Feature flag, allowlist, entitlement, and kill-switch behavior

Reuses Edition architecture (`lib/editions/*`).

| Control | Mechanism | Default |
|---------|-----------|---------|
| Edition feature | `kxd-connect` in `EDITION_FEATURE_REGISTRY` | `disabled` |
| Edition module | `connect` module with `editionSupport: []` | Never enabled by edition alone |
| Operator opt-in | `KXD_CONNECT_ENABLED=1` | Off |
| Environment gate (C4) | Non-production runtime only for dogfood | Production ⇒ deny |
| Local activation (C4) | `.connect/local-activation.json` via operator CLI | Absent/disabled = deny |
| Staff dogfood allowlist | Activation file emails (else `KXD_CONNECT_STAFF_DOGFOOD_EMAILS`) | Empty = deny |
| Organization allowlist | Activation file keys (else `KXD_CONNECT_ORG_ALLOWLIST`) | Empty = deny |
| Global kill switch | `KXD_CONNECT_KILL_SWITCH=1` | Off; when on, **always deny** |
| Plan entitlement key | `kxd-connect` in client-plans catalog | `future` + `internalOnly` — **not assigned to plans** |

### C4 evaluation order (fail closed; no auth cache)

1. Global kill switch  
2. Global Connect feature enabled (edition **or** `KXD_CONNECT_ENABLED`)  
3. Environment allows Connect (non-production)  
4. Local operator activation enabled  
5. Staff subject (portal denied)  
6. Staff allowlisted  
7. Organization allowlisted  
8. Organization active  
9. Membership active  
10. C1 messaging authorization (when applicable)

Server-side evaluation: `evaluateConnectAccess()` then C1 messaging authorization.  
Client-controlled request data cannot enable Connect. Kill switch fails closed.  
Activation file and allowlists are re-read per request.

**No portal navigation changes. `message-kxd` remains unchanged in C0–C5.**

Operator status (no org enumeration): `GET /api/admin/connect/status`  
(`uiAvailable: false`, `messagingAvailable: false`, `messagingEngine: true`, activation posture fields)

Local operator CLI (unavailable in production):

```bash
npm run connect:local-status
npm run connect:local-enable
npm run connect:local-disable
```

Runbook: `docs/PHASE-6-CONNECT-LOCAL-DOGFOOD-RUNBOOK.md`

---

## Staff-only C1 identity boundary

- C1 APIs require authenticated Payload admin/`users` staff sessions
- Portal JWT / portal-user identities are denied
- Future external participant types are schema-compatible but not enabled

---

## C1 API / service surface (no UI routes)

Under `/api/admin/connect/…` (staff only):

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/conversations` | List / create direct or group |
| GET | `/conversations/[publicId]` | Retrieve one authorized conversation |
| GET/POST | `/conversations/[publicId]/messages` | Paginated list / send plain text |
| GET/POST | `/conversations/[publicId]/read` | Private unread / mark read |
| POST/DELETE | `/conversations/[publicId]/participants` | Add / remove eligible internal participants |

All routes: Connect access evaluation, fail closed, no-store, method rejection, bounded bodies, opaque errors, no message-content logging.

---

## KXD bootstrap procedure

Script: `scripts/bootstrap-connect-kxd-organization.ts`  
Command: `npm run bootstrap:connect-kxd`

Behavior unchanged from C0:

- Idempotent upsert of organization key `kxd`
- No staff/client memberships
- No conversations, messages, fixtures, or production customer content
- Refuses remote/production DB unless `KXD_CONFIRM_CONNECT_BOOTSTRAP_PRODUCTION=1`

**C0/C1 do not authorize production bootstrap execution.**

Later operator step (local first):

1. Apply local migrations: `npm run migrate:local` (C0 then C1)
2. Run bootstrap against local DB: `npm run bootstrap:connect-kxd`
3. Configure dogfood env vars (enable + allowlists) only when ready
4. Explicitly grant Connect memberships to selected staff
5. Confirm Postgres atomic meter path before dogfood traffic

Migrations do **not** silently seed organizations or conversations.

---

## Migration status

| Migration | Role |
|-----------|------|
| `20260815_phase6_connect_c0_foundation` | Tenancy, memberships, meters, audit |
| `20260816_phase6_connect_c1_messaging` | Conversations, participants, messages + audit enum extensions |

**C2 adds no migration** — uses the C1 data model unchanged.

### `20260815` date resolution

The `20260815` prefix is **intentional and safe**: repository migrations use sequential date prefixes for ordering (continuing after `20260814_phase4_portal_identity_security`), not calendar authorship dates. C1 continues as `20260816`. No rename required. Neither migration is applied to production by this batch.

---

## What Batch C2 delivers

Smallest secure, polished, **staff-only** messaging interface at:

**`/admin/connect`**

Eligible allowlisted KXD staff with active Connect membership can:

- View authorized conversations
- Open one conversation and read paginated history
- Send plain-text messages (max 4000)
- See private unread state; mark read after the thread is visibly active with the newest message rendered
- Start/resume direct conversations (by staff email; server resolves membership)
- Create small internal groups (title required; max **12** participants including self)
- Experience loading, empty, disabled, and error states

**C2 is not dogfood activation.** Connect remains disabled by default. No production flags, allowlists, bootstrap, or portal exposure are authorized by this batch.

### Route and access boundary

- Staff Payload `users` session required (`requirePayloadAdminPage`)
- Server-side `resolveConnectStaffSession` / `evaluateConnectAccess` before any conversation data
- Unauthorized → `ConnectUnavailable` with **no** conversation payloads
- Direct URL only — **not** added to OperationsShell / global production navigation
- `force-dynamic` + `noStore()`; APIs remain `Cache-Control: no-store`

### Conversation list

- Authorized participation only; ordered by latest activity
- Direct vs group; display labels from trusted staff names
- Latest preview (single newest message, truncated)
- Private unread badge (not color-only; `aria-label`)
- List fetch does **not** mark read
- Manual Refresh control

### Message thread

- Cursor pagination; Load older messages; scroll position preserved on prepend
- Plain text only (`pre-wrap`, no HTML/Markdown/linkification)
- Self vs other styling; author display name + timestamp
- Archived conversations: read history, send disabled

### Composer

- Enter sends; Shift+Enter newline
- Duplicate-submit prevented while in flight
- Draft preserved on failure; cleared only after confirmed success
- Metering remains C1 durable-message path (idempotent `message:{publicId}`)

### Private read/unread rule (C2)

After the selected thread is active and the newest message has been rendered, mark-read runs once (debounced). List fetch never marks read. Newer polled messages clear the local mark-read guard so they remain unread until the rule runs again. No read receipts.

### Polling decision

**Implemented:** short polling every **12s** on the selected thread while `document.visibilityState === "visible"`, using C1 `direction=after` and the latest trusted cursor. Pauses when hidden; stops on unmount/access failure. No WebSockets/SSE.

### Eligible-member discovery

`GET /api/admin/connect/members` — active same-organization staff Connect members only (excludes self, portal users, other orgs). Not a public directory. Create APIs accept **staff emails**, not membership IDs.

### API data minimization (C2)

UI DTOs expose public conversation/message IDs, labels, previews, private unread counts, author display names, plain bodies, timestamps, cursors. They do **not** expose internal numeric IDs, organization IDs, membership IDs, pair keys, other users’ read state, audit records, or meter keys.

### Accessibility and responsive

Keyboard-accessible list/composer/dialog; dialog `aria-modal` + Escape; focus-visible; aria-live send/load status; unread not color-only; reduced-motion; mobile list→thread with Back; composer `safe-area-inset-bottom`; long-string overflow wrap.

### Scaling constraints (superseded by C3)

C2 documented a bounded ~500-message in-process window as acceptable for early UI. **C3 retires that dependency from normal runtime paths** (see Batch C3).

### Metering blocker (addressed for local Postgres in C3)

Postgres atomic CTE upsert is required for dogfood. SQLite RMW fallback remains a **blocker** before dogfood activation when Postgres is unavailable.

---

## What Batch C3 delivers

**Local dogfood readiness and cost validation** — not dogfood activation, not production enablement, not navigation exposure.

| Outcome | Detail |
|---------|--------|
| Local fixtures | `npm run bootstrap:connect-local-fixtures` — fail-closed local-only; org + 3 staff + memberships + direct/group + sample messages |
| Atomic metering | Single Postgres CTE: idempotency reserve + quantity upsert; concurrent unique/retry proven on local Postgres |
| Failure recovery | Durable message first; `ensureConnectMessageMetered` retries same `message:{publicId}` key without double count |
| DB-native history | `queryConnectMessagePage` — indexed `limit+1` cursor queries for `before`/`after` |
| DB-native unread | `queryConnectUnreadState` — `COUNT(*)` / latest lookup; list preview no longer loads a 200-message window |
| Monotonic mark-read | `advanceConnectReadPointer` — writes only when target is newer; identical polls do not rewrite |
| Polling model | Unchanged C2: 12s, selected thread, visible document, `direction=after` |
| Verifier | `npm run verify:phase6-batch-c3` (+ `verify:phase6-batch-c3-metering`) |

**C3 is not authorization to activate dogfood.** Connect remains disabled by default. Production must not be migrated, bootstrapped, or enabled by this batch.

### Disposition of the former ~500-message window

| Former use | Classification | C3 disposition |
|------------|----------------|----------------|
| `listMessagesForSession` `Math.min(500, limit*10)` | thread history, older pages, incremental polling | **Removed** — DB-native page (`limit+1`) |
| `getUnreadForSession` `limit: 500` | unread calculation | **Removed** — SQL `COUNT(*)` |
| `markReadForSession` `limit: 500` | mark-read | **Removed** — point lookups + monotonic update |
| UI list unread `limit: 200` | conversation preview unread | **Removed** — same COUNT path |
| Meter list `limit: 500` | meter listing (not messages) | Unchanged — not a message window |
| In-memory store / unit pagination helpers | verification-only | Retained for tests only |

No 500-message window remains in normal UI/API messaging operation.

### Atomic metering approach (C3)

```sql
WITH reserved AS (
  INSERT INTO connect_usage_idempotency (…)
  ON CONFLICT (organization_id, idempotency_key) DO NOTHING
  RETURNING id
),
applied AS (
  INSERT INTO connect_usage_meters (…)
  SELECT … WHERE EXISTS (SELECT 1 FROM reserved)
  ON CONFLICT (…) DO UPDATE SET quantity = quantity + EXCLUDED.quantity
  RETURNING quantity
)
SELECT …;
```

Idempotency and increment commit together. Retries return `duplicate: true` without a second increment.

### Polling cost observations (local)

| Check | Observation |
|-------|-------------|
| Endpoint | `GET /api/admin/connect/conversations/[publicId]/messages?direction=after&cursor=…` |
| Query path | Indexed `(conversation_id, created_at, public_id)` range, `LIMIT page+1` |
| Empty poll | Auth + participation + one bounded message query (typically 0 rows) |
| New-message poll | Same path; returns only rows after cursor |
| Unread/list recompute | Empty poll does **not** refresh conversation list or mark-read |
| Mark-read writes | Only after visible newest render (debounced); server no-ops identical/older pointers |
| Hidden documents | Polling paused via `visibilityState` |
| Thread change | Effect cleanup clears interval; `pollInFlight` prevents overlap |

Connect is **not** realtime. Short polling only.

### Local fixture setup

```bash
# Confirm local DB (127.0.0.1 / localhost or SQLite), then:
npm run migrate:local
CONNECT_LOCAL_FIXTURE_PASSWORD='…' npm run bootstrap:connect-local-fixtures
```

Suggested **local** env for later dogfood authorization (not set by C3; not production):

- `KXD_CONNECT_ENABLED=1`
- `KXD_CONNECT_ORG_ALLOWLIST=kxd`
- `KXD_CONNECT_STAFF_DOGFOOD_EMAILS=connect-a@kxd.local,connect-b@kxd.local,connect-c@kxd.local`

### Visual QA (C3 / C3.1)

C3 validated service-layer multi-session smoke plus C2 structural/accessibility checks.

**C3.1** recovered the local Next.js environment (stopped a stale repo-owned `next-server` on port 3000; cleared Turbopack cache; `@tailwindcss/postcss` was already installed — stale cache/process was the blocker). Authenticated fixture visual QA completed on desktop, tablet, and mobile for `/admin/connect`.

C3.1 UI polish (no redesign): New-dialog Escape closes with focus return; loading state while eligible members fetch (avoids false empty state).

Residual: Turbopack may still log Payload SCSS/`@tailwindcss/postcss` resolution noise for admin chrome; Connect workspace CSS loads and the authenticated Connect UI functions. Production `npm run build` remains the authoritative compile path.

### Batch C4 — Local dogfood activation authorization

Operational controls for intentional **local** dogfood only:

- Activation hierarchy enforced in `evaluateConnectAccess` (see above)
- Operator CLI: `connect:local-status` / `enable` / `disable` (production-unavailable)
- Staff + org allowlists synced into `.connect/local-activation.json` on enable
- Immediate rollback via disable / allowlist rewrite / kill switch (no deploy)
- Ops logging to `.connect/ops.log` (activation + auth outcomes; **never** message content)
- Runbook: `docs/PHASE-6-CONNECT-LOCAL-DOGFOOD-RUNBOOK.md`
- Verifier: `npm run verify:phase6-batch-c4`

**C4 authorizes controlled local internal dogfooding only.**  
It does **not** authorize production rollout, public exposure, or navigation enablement.

### Remaining exclusions after C4

1. Production Connect enablement / migration / env configuration — **not authorized**
2. Global navigation entry for Connect — still absent
3. Portal / client Connect — still denied
4. Product expansions (dock, Buddy List, notifications, realtime, etc.) — still absent
5. Soft residual: Connect org `afterChange` audit FK race (logged, non-blocking)

---

## Batch status

| Area | C0 | C1 | C2 | C3 | C4 | C5 |
|------|----|----|----|----|----|----|
| Connect organizations | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Connect memberships | ✅ | ✅ | ✅ | ✅ + local fixtures | ✅ | ✅ |
| Edition / allowlists / kill switch | ✅ | ✅ | ✅ | ✅ | ✅ + local activation | ✅ |
| Metering | ✅ | ✅ atomic upsert | ✅ | ✅ atomic CTE + concurrency proof | ✅ | ✅ |
| Audit / ops logging | ✅ audit | ✅ | ✅ | ✅ | ✅ + ops log | ✅ exercised |
| Conversations / messages | ❌ | ✅ | ✅ | ✅ DB-native runtime | ✅ | ✅ dogfood |
| Pagination / private unread | ❌ | ✅ | ✅ UI | ✅ no 500-window | ✅ | ✅ dogfood |
| Staff messaging UI | ❌ | ❌ | ✅ | ✅ validated | ✅ | ✅ HTTP dogfood |
| Local fixtures / migrate guards | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Local dogfood activation operator | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ exercised |
| Structured dogfood operating period | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Focused verifier | c0 | c1 | c2 | c3 | c4 | `dogfood:connect-local` |
| Dock / Buddy List / presence | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Production enablement | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Explicit exclusions (C0–C5)

Do not treat as implemented:

- Connect dock, customizable dock, app launcher, Buddy List
- Full OS shell / floating multi-window chat
- Portal / client Connect surfaces
- Presence, heartbeat, availability, away messages
- Vendors, partners, guests, client participants
- Attachments, notifications, slide-in alerts, sounds, spoken greetings
- Calendar briefing, context cards, turn into request
- Typing indicators, read receipts visible to others, reactions, threads
- Search, Intelligence / AI processing
- Paid realtime providers, WebSockets, SSE (C2 uses short polling only)
- White-label administration
- Billing prices / Stripe / invoices / Financial Command / Commercial Agreement changes
- Customer plan changes / allowance enforcement
- `message-kxd` replacement
- Connected Workspace changes
- Client Communications changes
- Portal feedback / Website Review changes
- Global KXD OS navigation redesign
- Production Connect enablement / general availability

C1 note: C1 does not create the visible Connect experience (engine only). C2 adds staff messaging UI only. C3 validates local dogfood readiness. C4 authorizes local activation controls. C5 completes the local operating period only — not production.

---

## Distinctions (locked)

- **Client Communications ≠ KXD Connect**
- **Portal feedback remains Client Communications / experience feedback**
- **Connected Workspace ≠ KXD Connect**
- **`message-kxd` remains unchanged during C0–C5** and will be deliberately replaced only in a later authorized UI batch
- **No paid realtime or third-party messaging service**

---

## Local dogfood operator path (C4–C5)

1. Apply C0 + C1 migrations on a **local/non-production** database — `npm run migrate:local`
2. Bootstrap fixtures: `bootstrap:connect-local-fixtures` (or explicit memberships)
3. Configure local env (`KXD_CONNECT_ENABLED`, staff emails, org allowlist); restart Next with those env vars
4. Confirm Postgres atomic meter path when generating dogfood traffic
5. `npm run connect:local-enable`
6. Run C0–C4 verifiers + `npm run dogfood:connect-local`; smoke `/admin/connect` with allowlisted local staff only
7. `npm run connect:local-disable` when finished
8. Keep kill switch available; do not enable production users
9. Do not add Connect to global navigation until an authorized UX batch
10. Do not expose Connect to portal/client users

Passing **CP5** authorizes controlled local internal dogfooding.  
Passing **CP6** completes the structured local operating period only — **not** production rollout.

Full commands: `docs/PHASE-6-CONNECT-LOCAL-DOGFOOD-RUNBOOK.md`

---

## Rollback procedure

1. Prefer immediate local disable: `npm run connect:local-disable` (no deploy; next request denied)
2. Or unset `KXD_CONNECT_ENABLED` / set `KXD_CONNECT_KILL_SWITCH=1` and restart Next
3. Remove staff from allowlist and re-run `connect:local-enable` to sync, or rewrite activation file
4. Leave `/admin/connect` out of global nav (direct URL remains access-controlled)
5. If migrations must be reversed locally: run migration `down` for `20260816` then `20260815` only on non-production after backup
6. Collections are additive — disabling Connect does not require deleting historical rows
7. Do not roll back Phase 5 billing visibility or portal identity work as part of Connect rollback

---

## Verification

```bash
npm run verify:phase6-batch-c0
npm run verify:phase6-batch-c1
npm run verify:phase6-batch-c2
npm run verify:phase6-batch-c3
npm run verify:phase6-batch-c4
npm run verify:phase5-batch-5a
npm run verify:phase5-batch-5b
npm run verify:phase5-batch-5c
npm run verify:phase5-batch-5d
npm run verify:client-plans
npm run verify:phase4-multi-client-membership
npm run verify:phase4-account-switcher
npm run verify:experience-feedback
npm run lint
npm run build
```

Local fixtures + activation (development only):

```bash
npm run migrate:local
CONNECT_LOCAL_FIXTURE_PASSWORD='…' npm run bootstrap:connect-local-fixtures
npm run connect:local-enable
npm run connect:local-status
npm run dogfood:connect-local
npm run connect:local-disable
```

---

## Batch C5 — Structured local dogfood operating period

**Completed.** Controlled multi-session local dogfood to learn under realistic internal usage. No messaging product expansion. Production remains disabled.

### How C5 was exercised

1. Operator CLI: `connect:local-status` / `enable` / `disable` (idempotent; local Postgres only)
2. Service-layer operating period: `npm run dogfood:connect-local` (60/60 scenarios)
3. Authenticated HTTP dogfood: Payload login as fixture A/B → `/admin/connect` HTML + Connect APIs
4. Immediate rollback: disable activation → conversations API returns unavailable; re-enable restores
5. End state: local activation left **disabled**

### Scenarios executed

| Scenario | Result |
|----------|--------|
| Direct conversations (A↔B, A↔C) | Pass |
| Multiple active conversations | Pass |
| Group create + multi-member send | Pass |
| Archived conversation (send denied, history readable) | Pass |
| Unread + mark-read + idempotent rewrite suppression | Pass |
| Pagination (older pages, no cross-page duplicates) | Pass |
| Rapid exchange (12 alternating sends) | Pass |
| Long conversation (≥40 messages, ordered, no dupes) | Pass |
| Idle `direction=after` polls (8× empty) | Pass |
| Poll after new message | Pass |
| Simultaneous conversation reads | Pass |
| Session re-resolve / switching | Pass |
| Operator enable / disable / status | Pass |
| Allowlist removal immediate revoke | Pass |
| Feature disabled / activation disabled | Pass |
| Portal / inactive org / inactive membership | Pass (fail-closed) |
| Authenticated `/admin/connect` + APIs (fixture A/B) | Pass |
| Rollback without deploy | Pass |

### Stability observations

- No message-order regressions; pages remain ASC with stable publicIds
- No duplicate message IDs across rapid send, pagination, or long history
- Mark-read identical target reports `changed: false` (no rewrite)
- Authorization remains consistent across session re-resolve
- Leaving activation disabled ends the operating period cleanly
- Soft residual unchanged: Connect org `afterChange` audit FK race (logged, non-blocking)

### Polling observations

Measured on local Postgres via service `direction=after` (same path as UI short poll):

| Metric | Value (C5 run) |
|--------|----------------|
| Idle empty-poll samples | 8 |
| Avg poll latency | ~7.3ms |
| Max poll latency | ~21.6ms |
| Empty poll row count | 0 messages |
| After new-message poll | Returns injected message only after cursor |
| Overlap prevention (UI) | `pollInFlight` + visibility pause (unchanged from C2/C3) |

No evidence of duplicate polling writes or unnecessary mark-read on empty polls.

### Authorization / operator observations

- Fail-closed at every expected denial reason
- Allowlist file rewrite revokes on next session resolve (no deploy)
- Activation disable revokes HTTP conversations immediately
- Operator CLI is understandable: status → enable → disable
- Ops success logging is chatty under multi-session dogfood (see findings)
- Status keeps `uiAvailable: false` / `messagingAvailable: false` by design (no public exposure flag)

### UX observations (no redesign)

- Conversation list discovers directs + groups; archived rows remain visible with previews/unread
- New conversation / group flows unchanged from C2 (eligible members endpoint returns peers)
- Empty/unavailable states remain calm when activation is off
- Keyboard/a11y posture from C3.1 still applies (Escape/focus, aria-live, reduced motion)
- Interactive browser password automation was gated in this session; authenticated HTML/API path was used instead (C3.1 already covered visual matrix)

### Dogfood findings

**Critical**

- None

**High**

- None (no blocking defects remaining)

**Medium**

1. **Ops log volume** — `authorization.success` emits on every session resolve; noisy during dogfood. Future: default to denials + activation events, sample successes. *(ops polish / not a product bug)*
2. **Archived conversations in main list** — archived groups appear alongside active threads with unread badges. Future: archive section or filter. *(product idea / not incorrect today)*

**Low**

1. Status `uiAvailable: false` while dogfood layers are ready can confuse operators — intentional non-exposure flag; runbook clarifies
2. Effective allowlist size still reports file emails while activation is disabled — accurate for sync state, easy to misread without `dogfoodLayersReady`
3. Next.js process must be started with Connect env vars (or `.env.local`) — activation file alone is insufficient for `KXD_CONNECT_ENABLED`

**Future ideas** (explicitly not bugs; not approved)

- Presence, typing, read receipts, notifications, attachments, search, AI
- Dock / Buddy List / launcher / global nav entry
- Realtime transport (WebSockets/SSE)
- Production activation path
- Archive filtering / conversation mute
- Quieter ops logging defaults

### Defects fixed in C5

None required. One dogfood harness assertion was corrected (expected history length after sending 40 messages). No Connect product code changes.

### C5 authorization boundary

Passing **CP6** completes the local operating period only.  
It does **not** authorize production rollout, navigation exposure, or Connect GA.

---

## C6 and later

Not implemented. Not approved by this batch. Do not present dock, Buddy List, presence, notifications, client Connect surfaces, or **production** Connect enablement as available.
