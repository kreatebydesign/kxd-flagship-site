# Phase 6 — KXD Connect

**Status:** Batch **C0** implemented (tenancy foundation, release controls, metering primitives). Later batches not authorized.  
**Baseline HEAD at C0 start:** `a8802ff` (Phase 5 billing visibility closed on `main`)  
**Companion:** `docs/KXD-OS-ROADMAP.md`, `docs/KXD-OS-CURRENT-STATE.md`, `docs/CLIENT_COMMUNICATIONS.md`

---

## Product promise

KXD Connect turns team, partner, and client conversations into accountable action inside the same operating system where the work happens.

Connect is a **secure, reusable, multi-organization platform**. KXD is the first organization and proving ground — not a permanent hard-coded boundary.

No new paid recurring infrastructure is authorized for Connect.

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

## Multi-organization ownership model

| Concept | Role | Relationship to Connect |
|---------|------|-------------------------|
| **Connect organization** | Tenant that owns Connect data | New `connect-organizations` collection |
| **Client** (`clients`) | KXD OS client system-of-record | Distinct — not auto-promoted to Connect orgs |
| **Portal client membership** | Portal user ↔ Client access | Distinct — never grants Connect access alone |
| **Portal account / Connected Workspace** | Client HQ experience | Distinct — unchanged in C0 |
| **Client Communications** | Operator CRM communication log | Distinct — remains Client Communications |
| **Marketing Partners** | Public/site partners | Distinct |

Stable organization identifier: lowercase `key` (e.g. `kxd`). Sequential Payload `id` values are internal and must not be used as public discovery mechanisms.

---

## Identity and membership boundaries

Collection: `connect-organization-memberships`

C0 roles:

- `platform-operator`
- `organization-admin`
- `organization-member`

Subject kinds (schema-ready):

- `staff-user` — C0 dogfood path
- `portal-user` — reserved for future external participants; **not enabled for C0 access evaluation**

Rules:

- Organization-scoped
- Unique membership per (organization, staff user) or (organization, portal user)
- Fail closed when identity or organization is invalid
- Portal users are not Connect members merely because they have portal access
- Current KXD clients are not automatic Connect organizations
- Multi-organization membership is schema-compatible; **no switcher UI in C0**

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

Server-side evaluation: `evaluateConnectAccess()` in `lib/connect/access.ts`.  
Client-controlled request data cannot enable Connect. Kill switch fails closed.

**No portal navigation changes. `message-kxd` remains unchanged in C0.**

Operator status (no org enumeration): `GET /api/admin/connect/status`

---

## Metering units and privacy rules

Collections:

- `connect-usage-meters` — daily org-scoped aggregates
- `connect-usage-idempotency` — replay-safe increment keys

Meter units (definitions only; C0 generates no message/file/AI traffic):

- Active internal members / external participants
- Messages sent / conversations created
- Attachment bytes stored
- Upload/download transfer bytes
- Notification volume
- AI operations, tokens, estimated provider cost (micros)

Privacy:

- Quantities only
- Never message bodies, private content, filenames, or unnecessary personal data
- No customer dashboard, pricing, invoices, Stripe access, or hard quota enforcement in C0

Idempotency: optional `idempotencyKey` per organization; replay returns prior quantity without double-count. In-memory store serializes concurrent updates per aggregate key for verification; Payload path uses unique indexes + create/update race handling.

---

## Auditability

Collection: `connect-audit-events` (append-only)

Covers:

- Organization create / activate / deactivate
- Membership create / role change / disable
- Meter adjustment path (type reserved)
- Connect enable/disable event types reserved

Not the Activity Engine. Not a private Connect message store.

---

## KXD bootstrap procedure

Script: `scripts/bootstrap-connect-kxd-organization.ts`  
Command: `npm run bootstrap:connect-kxd`

Behavior:

- Idempotent upsert of organization key `kxd`
- No staff/client memberships
- No conversations, messages, fixtures, or production customer content
- Refuses remote/production DB unless `KXD_CONFIRM_CONNECT_BOOTSTRAP_PRODUCTION=1`

**Batch C0 does not authorize production bootstrap execution.**

Later operator step (local first):

1. Apply local migration: `npm run migrate:local`
2. Run bootstrap against local DB: `npm run bootstrap:connect-kxd`
3. Configure dogfood env vars (enable + allowlists) only when ready for dogfood
4. Explicitly grant Connect memberships to selected staff (not automatic)

Migration does **not** silently seed the KXD organization — bootstrap is the controlled path.

---

## Batch C0 status

| Area | Status |
|------|--------|
| Connect organizations | ✅ |
| Connect memberships | ✅ |
| Edition feature + module gates | ✅ |
| Allowlists + kill switch | ✅ |
| Metering primitives | ✅ |
| Audit events | ✅ |
| Bootstrap script | ✅ |
| Focused verifier | ✅ `npm run verify:phase6-batch-c0` |
| Messaging / UI / realtime | ❌ Excluded |

---

## Explicit exclusions (C0)

Do not treat as implemented:

- Connect UI or navigation
- Directory, presence, heartbeat
- Conversations or messages
- Client-facing messaging / internal group chat
- Vendors, partners, guests
- Attachments, unread notifications, context cards
- Turn into request, typing indicators, read receipts, sounds
- Intelligence / AI processing
- Paid realtime providers, WebSockets, SSE
- White-label administration
- Billing prices / Stripe / invoices / Financial Command / Commercial Agreement changes
- Customer plan changes
- `message-kxd` replacement
- Connected Workspace changes
- Client Communications changes
- Portal feedback changes

---

## Distinctions (locked)

- **Client Communications ≠ KXD Connect**
- **Portal feedback remains Client Communications / experience feedback**
- **Connected Workspace ≠ KXD Connect**
- **`message-kxd` remains unchanged during C0** and will be deliberately replaced only in a later authorized UI batch
- **No paid realtime or third-party messaging service**

---

## Rollback procedure

1. Leave Connect disabled (default): unset `KXD_CONNECT_ENABLED`, keep kill switch available
2. Do not expose any Connect UI (none shipped in C0)
3. If migration must be reversed locally: run migration `down` for `20260815_phase6_connect_c0_foundation` only on non-production after backup
4. Collections are additive — disabling Connect does not require deleting historical rows
5. Do not roll back Phase 5 billing visibility or portal identity work as part of Connect rollback

---

## Verification

```bash
npm run verify:phase6-batch-c0
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

## C1 and later

Not implemented. Not approved by this batch. Do not present messaging, directory, or client Connect surfaces as available.
