# Phase 6 — KXD Connect

**Status:** Batches **C0**, **C1**, and **C2** implemented. Later batches (C3+) not authorized.  
**Baseline HEAD at C0 start:** `a8802ff` (Phase 5 billing visibility closed on `main`)  
**C0 commit:** `8a208f9730dfc18c082a48373355539bbe8dd065`  
**C1 commit:** `7fc73bf38c1ed5d9f4a4c1b06426343daebf8824`  
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

**These surfaces are not implemented in C0, C1, or C2.** C2 is a staff messaging foundation only — not the final Connect shell. Do not present dock/Buddy List/notifications as available. C3+ is not approved by this documentation.

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
| Staff dogfood allowlist | `KXD_CONNECT_STAFF_DOGFOOD_EMAILS` (CSV) | Empty = deny |
| Organization allowlist | `KXD_CONNECT_ORG_ALLOWLIST` (CSV keys) | Empty = deny |
| Global kill switch | `KXD_CONNECT_KILL_SWITCH=1` | Off; when on, **always deny** |
| Plan entitlement key | `kxd-connect` in client-plans catalog | `future` + `internalOnly` — **not assigned to plans** |

Server-side evaluation: `evaluateConnectAccess()` then C1 messaging authorization.  
Client-controlled request data cannot enable Connect. Kill switch fails closed.

**No portal navigation changes. `message-kxd` remains unchanged in C0/C1.**

Operator status (no org enumeration): `GET /api/admin/connect/status`  
(`uiAvailable: false`, `messagingAvailable: false`, `messagingEngine: true`)

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

### Scaling constraints

C1’s bounded ~500-message in-process window remains acceptable for internal C2. SQL-level cursor pagination may be needed before large-history dogfood.

### Metering blocker (unchanged)

Postgres atomic upsert required for dogfood. SQLite RMW fallback remains a **blocker** before dogfood activation.

---

## Batch status

| Area | C0 | C1 | C2 |
|------|----|----|----|
| Connect organizations | ✅ | ✅ | ✅ |
| Connect memberships | ✅ | ✅ | ✅ |
| Edition / allowlists / kill switch | ✅ | ✅ | ✅ |
| Metering primitives | ✅ | ✅ + message integration + Postgres atomic upsert | ✅ (via C1 send) |
| Audit events | ✅ | ✅ + conversation events | ✅ |
| Conversations / participants / messages | ❌ | ✅ | ✅ |
| Pagination / private unread | ❌ | ✅ | ✅ UI |
| Admin messaging APIs | ❌ | ✅ | ✅ + members + UI DTOs |
| Staff messaging UI `/admin/connect` | ❌ | ❌ | ✅ |
| Focused verifier | ✅ c0 | ✅ c1 | ✅ `verify:phase6-batch-c2` |
| Dock / Buddy List / launcher / presence | ❌ | ❌ | ❌ |
| Dogfood / production enablement | ❌ | ❌ | ❌ |

---

## Explicit exclusions (C0 + C1 + C2)

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
- Staff dogfood / production enablement

C1 note: C1 does not create the visible Connect experience (engine only). C2 adds staff messaging UI only.
- Existing navigation redesign

---

## Distinctions (locked)

- **Client Communications ≠ KXD Connect**
- **Portal feedback remains Client Communications / experience feedback**
- **Connected Workspace ≠ KXD Connect**
- **`message-kxd` remains unchanged during C0/C1** and will be deliberately replaced only in a later authorized UI batch
- **No paid realtime or third-party messaging service**

---

## Remaining requirements before KXD dogfood

1. Apply C0 + C1 migrations on a **local/non-production** database only when ready
2. Bootstrap KXD organization locally; grant explicit staff memberships
3. Configure dogfood env (`KXD_CONNECT_ENABLED`, staff emails, org allowlist) — **not authorized by C2**
4. Confirm Postgres atomic meter path is active (not sqlite RMW fallback) — **blocking**
5. Run C0 + C1 + C2 verifiers; smoke `/admin/connect` with allowlisted local staff
6. Keep kill switch available; do not enable production users
7. Do not add Connect to global navigation until an authorized UX batch
8. Do not expose Connect to portal/client users

---

## Rollback procedure

1. Leave Connect disabled (default): unset `KXD_CONNECT_ENABLED`, keep kill switch available
2. Leave `/admin/connect` ungated from global nav (direct URL remains access-controlled)
3. If migrations must be reversed locally: run migration `down` for `20260816` then `20260815` only on non-production after backup (C2 has no migration)
4. Collections are additive — disabling Connect does not require deleting historical rows
5. Do not roll back Phase 5 billing visibility or portal identity work as part of Connect rollback

---

## Verification

```bash
npm run verify:phase6-batch-c0
npm run verify:phase6-batch-c1
npm run verify:phase6-batch-c2
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

---

## C3 and later

Not implemented. Not approved by this batch. Do not present dock, Buddy List, presence, notifications, or client Connect surfaces as available.
