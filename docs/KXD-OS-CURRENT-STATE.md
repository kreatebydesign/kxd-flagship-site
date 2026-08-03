# KXD OS Current State

**Edition 1 · Engineering Memory**  
**Status:** Permanent — repository is the source of truth  
**Last aligned:** August 2, 2026  
**Companion:** `docs/KXD-OS-ENGINEERING-BRIEF.md`, `docs/KXD-OS-ARCHITECTURE.md`, `docs/KXD-OS-ROADMAP.md`  
**Operator schedule:** Immediate priorities + Operator workflow schedule below are the authoritative next-work list (no separate Monday calendar file).

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
| **Today** (sole founder home) | `/admin/operations/today` |
| Client Command | `/admin/operations/client-command` |
| Client Portfolio | `/admin/operations/clients` |
| Work Engine | `/admin/work` |
| Timeline | `/admin/operations/timeline` |
| Review Inbox | `/admin/operations/review-inbox` |
| Portal Access | `/admin/operations/portal-access` |
| Client Launch Wizard | `/admin/operations/client-launch` |
| Portfolio Overview (demoted) | `/admin/operations/executive` |
| Intelligence | `/admin/operations/intelligence` |
| Rituals (Focus / Weekly Review) | `/admin/operations/focus`, `/review` (`/brief` → Today) |
| Automation (rules) | `/admin/operations/automation` |
| Portfolio Synthesis (demoted) | `/admin/operations/brain` |

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

### Active product phase (not fully production-complete)

**Phase 4 — Multi-Client Portal Access & Account Context** — Batches A–I implemented in repository. **Code-complete; awaiting authenticated production rollout QA** (not fully production-complete). Production membership migration already applied; Batch I additive migration `20260814_phase4_portal_identity_security` is **local/repo only until separately approved** (not applied to production in this batch).

- Plan: `docs/PHASE-4-MULTI-CLIENT-PORTAL.md`
- Rollout checklist: `docs/PHASE-4-PRODUCTION-ROLLOUT-CHECKLIST.md`
- Batch A collection: `portal-client-memberships` (`payload/collections/PortalClientMemberships.ts`)
- Batch A migration: `migrations/20260728_phase4_portal_client_memberships.ts` (additive; backfills from legacy `portal-users.client`)
- Batch A–H verify: `verify:phase4-multi-client-membership`, `verify:phase4-account-switcher`, `verify:phase4-workspace-personalization`, `verify:phase4-work-performance`, `verify:phase4-analytics-visibility`, `verify:phase4-authorized-portfolio`, `verify:phase4-requests-files-reports`, `verify:phase4-multi-client-portal-completion`
- Session resolves authorized `clientId` from memberships (+ legacy fallback); cookie still signs portal user id only
- Portal Access manages memberships; account switcher present; analytics/website-health/reports scoped to active account; authorized portfolio at `/portal/portfolio` for multi-membership users only
- Batch G: requests/files/deliverables/reports/Website Review/Workspace isolation verified; portal “client approvals” locked to existing awaiting-input review/request states (no Approvals product)
- Batch H: completion verifier; account-switcher keyboard/a11y + long-name overflow; rollout checklist; authenticated multi-client production QA **blocked** pending safe production identity inventory
- Batch I: private invitations, membership roles, WebAuthn passkeys, TOTP MFA, recovery codes (`verify:phase4-portal-identity-security`); Portal Access invitation UI; activation + security enrollment — implementation commit `f3cfb92`
- Batch J: identity security production rollout procedure (`docs/PHASE-4-BATCH-J-IDENTITY-ROLLOUT.md`) + pilot runbook; real client invites/mutations still operator-gated
- Batch J.2B.2, Primal walkthrough, and Primal reporting pilot remain **paused** pending the Monday Primal Analytics Ownership Audit
- Remaining open risk: pre-existing public Payload `/media/...` onboarding-asset exposure (not redesigned in Batch H/I/J); serverless rate limits are best-effort
- No Cusick production linking yet
- First production configuration remains Cusick account group (four independent clients) after ops readiness + Don/Cusick live QA
- **Do not mark Phase 4 fully production-complete.** Starting Phase 5 does not waive, bypass, redefine, or complete any remaining Phase 4 rollout requirement.

### Approved parallel product phase

**Phase 5 — Client Billing Visibility, Stripe Invoice Status & Monthly Work Summaries** — ✅ **Complete.** Batches **5A–5D** implemented and verified (`verify:phase5-batch-5a`, `verify:phase5-batch-5b`, `verify:phase5-batch-5c`, `verify:phase5-batch-5d`). Batch **5E intentionally skipped** (Work & Performance and Billing remain separate; work summaries are not invoice lines). Portal and staff invoice visibility are TEST-mode read-only; clients cannot pay inside KXD OS; staff cannot manage invoices. No live Stripe access, invoice mutation, receipt system, accounting system, or Financial Command expansion was authorized.

- Spec: `docs/PHASE-5-CLIENT-BILLING-VISIBILITY.md`
- Parallel **non-Primal** lane while Phase 4 production rollout remains partially blocked by the Primal Analytics Ownership Audit
- Must remain independent of Primal analytics, GA4, Google Ads, reporting entitlements, the Primal website repository, and Primal OS
- Reuses Phases 35–37 commercial foundations; does not reopen commercial activation/mutation scope
- Stripe is sole client-facing invoice/payment SOT for this phase; Wave/QuickBooks are not portal invoice sources
- Invoice reads use narrow Phase 5B auth (`invoice_list` / `invoice_read`) separate from `STRIPE_COMMERCIAL_EXECUTION_AUTHORIZED` (still closed)
- `/portal/invoices` serves Batch 5C Billing UI; nav label **Billing** is visible only when the active client has a valid test-mode Stripe customer mapping
- Hosting Transitions and KXD-generated invoice emails/dunning are excluded
- **Batch 5A:** Monthly Work Summary Reliability — `lib/portal/work-performance/monthly-summary.ts` + Work & Performance honesty/date fixes
- **Batch 5B:** Stripe Invoice Read Foundation — server-only scoped list/read + allowlisted DTO (`lib/stripe/invoice-read-*.ts`); test-mode only
- **Batch 5C:** Portal Billing Visibility — `/portal/invoices` + eligibility-gated Billing nav (`lib/portal/billing/`)
- **Batch 5D:** Staff Invoice Visibility — Commercial Agreements selected-client detail + `GET /api/admin/commercial-agreements/[clientId]/invoices` (`StaffClientInvoicesSection`; Batch 5B composition via `listStaffClientInvoices`)
- **Batch 5E:** Billing and Work-Summary Context — **intentionally skipped** (not implemented; combining summaries with billing later requires a new authorized phase/batch)

### Internal product control plane — KXD Product Intelligence

**KXD Product Intelligence** — **P0-A, P0-B, P0-C, P0-D, P0-E, P0-F, P0-G, P0-H, P0-I, P0-J, P0-K** complete through Query Engine. Spec: `docs/KXD-PRODUCT-INTELLIGENCE.md`. Verifiers: `verify:product-intelligence-p0b` … `p0k`. Code: `lib/product-intelligence/` (+ `inventory/`, `archive/`, `health/`, `friction/`, `evolution/`, `hall-of-fame/`, `kill-list/`, `future-bets/`, `query/`).

- Infrastructure for building KXD OS itself — **not** client-facing; does **not** change KXD OS product functionality
- Permanent contracts for Doctrine, Product DNA, Vision, Inventory, Architecture, Experience, Design System, Evidence, Decision, Founder Friction, Competitive Insight, Roadmap Item, Technical Debt, Release, Product Evolution, Score, Valuation, Health Snapshot, Hall of Fame, Product Kill List, Future Bet
- **P0-C:** automatic System Map inventory · **P0-D:** Decision Archive · **P0-E:** Platform Health Engine · **P0-F:** Founder Friction · **P0-G:** Product Evolution Ledger · **P0-H:** Hall of Fame Engine · **P0-I:** Product Kill List Engine · **P0-J:** Future Bets Engine · **P0-K:** Query Engine (structured families/domains, evidence-bound resolution, empty executed log)
- Hall of Fame / Kill List / Future Bets / Friction / Evolution / Competitive / valuation stores remain **unpopulated**
- Next authorized batch: **P0-L** only when explicitly requested

### Approved product phase — Today (founder home)

**Phase 7 — Today** — Batches **A–B** approved product law; **Batches C–D.1** implemented. Spec: `docs/PHASE-7-TODAY.md`. Verifiers: `verify:phase7-batch-c`, `verify:phase7-batch-d`, `verify:phase7-batch-d1`.

- **Today** is the sole founder home (`/admin/operations/today`)
- Edition `homeRoute`, founder login fallback, and `/admin/operations` landing all resolve to Today
- Navigation is a workflow map: Today · Work · Clients · Business · Studio · System
- Former home competitors remain reachable destinations with demoted identity (Portfolio Overview, Operations Board, Owner Snapshot, Priority Brief, Portfolio Synthesis)
- Staff Home remains a separate persona landing
- **Batch D.1:** Founder experience recomposition — posture → Focus → Waiting For You → Today’s Flow → Momentum → supporting desk list → Signals
- Presentation-only language/hierarchy; same data owners; no Connect / Weekly Snapshot / AI / charts on Today yet
- Cognitive load + confidence rules: prefer clarity and confidence over more information

### Approved parallel product phase — KXD Connect

**Phase 6 — KXD Connect** — Batches **C0–C6** complete. Spec: `docs/PHASE-6-KXD-CONNECT.md`. Runbook: `docs/PHASE-6-CONNECT-LOCAL-DOGFOOD-RUNBOOK.md`. Verifiers: `verify:phase6-batch-c0` … `verify:phase6-batch-c4` + `dogfood:connect-local`.

- Multi-organization Connect tenant + membership schema; KXD is the first organization key (`kxd`), not a hard-coded authorization boundary
- Edition feature `kxd-connect` and module `connect` default disabled; dogfood via env allowlists + kill switch + **local operator activation** (C4)
- C1: organization-owned conversations/messages, cursor pagination, private unread, trusted metering
- C2: staff-only `/admin/connect` messaging UI (direct URL; no global nav; no dock/Buddy List)
- No portal/client exposure, realtime transport, presence, attachments, or notifications
- **Does not block** KXD OS Founding Client Early Access — separate readiness track from Connect MVP / pilot / commercial readiness
- Client Communications, Connected Workspace, portal feedback, and `message-kxd` remain unchanged
- C3: local dogfood readiness (atomic Postgres metering CTE, DB-native history/unread/mark-read, local fixtures)
- C4: local dogfood activation authorization (operator enable/disable, allowlist sync, immediate rollback, ops logging)
- C5: structured local dogfood operating period completed (multi-session, polling, rollback)
- C6: readiness review / internal release gate (meters route session-scoped). **Not** production rollout.
- No production migration, bootstrap, or Connect enablement authorized by C0–C6

### Parallel ops track (migration-independent)

**OTP Carts Launch Readiness — Batch A (Gate Hardening)** — code/docs gate only. Verifier: `npm run verify:otp-carts-readiness`. Does **not** claim Phase 3 or Phase 4 database migrations are complete, does **not** start Phase 4 Batch B, and does **not** invent or link production client IDs.

**Hosting Renewal Readiness — Batch A (Operator Visibility)** — provider-neutral renewal posture on Infrastructure Command from existing `client-infrastructure` fields (`hostingProvider`, `nextRenewalDate`, `domainExpirationDate`, SSL). Verifier: `npm run verify:hosting-renewal-readiness`. Wix is a classification/filter only — **not** a separate system. Hosting-transition **automation** remains deferred (founding-client post-v1). No migration, cron, email, or production data mutation.

**Client Resource Directory — Batch A (Operator Visibility)** — allowlisted safe links and system metadata on Infrastructure client detail from existing `client-infrastructure` (+ `clients.companyWebsite`, soft onboarding access booleans). Verifier: `npm run verify:client-resource-directory`. Not a credential vault; no secrets, migrations, portal exposure, or automated access tests. Secure Credential Vault and broader Internal Resource Center remain deferred.

### Immediate priorities

1. **Monday, August 3, 2026 — Primal Analytics Ownership Audit and GA4 Cutover Decision (High)** — 30–60 minute screen share with Adam. Full ordered workflow, ownership model, Path A/B decision rules, evidence checklist, and ChatGPT handoff prompt: see [Operator workflow schedule](#operator-workflow-schedule) below. **Blocks** Batch J.2B.2 (Primal GA4 & Ads entitle + sync), the controlled Primal existing-login walkthrough, and the Primal reporting pilot. Unrelated KXD OS development may continue before and after this audit. Do **not** enable `website-analytics` / `google-ads`, run J.2B.2, or start the walkthrough until the permanent Analytics property is selected and authenticated provider probes succeed.
2. **Phase 4 — Multi-Client Portal Access & Account Context** — Production DB identity gate **cleared** (Vercel Neon store `kxd-flagship-db` / project `mute-violet-81514071` ≡ Target A). Backup/PITR gate **conditionally cleared** on Free plan (instant restore history window max **6 hours**; take a manual Neon snapshot immediately before any production migrate; Launch upgrade recommended for 7-day retention). Production migrations applied successfully (`20260727_phase3_client_relationship_intelligence`, `20260728_phase4_portal_client_memberships`, `20260810_website_audit_report_generator`; `migrate:status` batch 46, Ran = Yes); no production migrations remain pending. Batches A–H implemented in repository (`verify:phase4-multi-client-portal-completion`). Phase 4 remains **not fully production-complete** until authenticated multi-client rollout QA + Don/Cusick four-account readiness. Batch J / J.2B.2 / Primal walkthrough / reporting pilot remain paused as scheduled. Do **not** mark Phase 4 complete.
3. **Phase 5 — Client Billing Visibility, Stripe Invoice Status & Monthly Work Summaries** — ✅ **Complete** (Batches 5A–5D; Batch 5E intentionally skipped). Spec: `docs/PHASE-5-CLIENT-BILLING-VISIBILITY.md`. Closed product lane — do not reopen inside Phase 5. Do not couple to Primal analytics or Batch J.2B.2. Combining work summaries with billing requires a new separately authorized phase or batch.
4. **Phase 6 — KXD Connect** — Batches C0–C6 complete (through readiness review / internal release gate). Controlled internal readiness only; production rollout not authorized. Spec: `docs/PHASE-6-KXD-CONNECT.md`. Keep disabled in production. Does **not** gate Founding Client Early Access.
5. **Phase 7 — Today** — Batches C–D.1 complete (home policy + experience foundation + founder recomposition). Next authorized batch is **Batch E** (absorb / retire demoted surfaces) only when explicitly requested. Spec: `docs/PHASE-7-TODAY.md`.
6. **KXD Product Intelligence** — P0-A, P0-B, P0-C, P0-D, P0-E, P0-F, P0-G, P0-H, P0-I, P0-J, P0-K complete through Query Engine (`lib/product-intelligence/`). Next authorized batch is **P0-L** only when explicitly requested. Spec: `docs/KXD-PRODUCT-INTELLIGENCE.md`. Do not populate Hall of Fame / Kill List / Future Bets / Friction / Evolution / Competitive / valuation / health report generation until authorized.
7. **Client operations at scale** — Repeat the Primal launch pattern using `lib/client-launch/` for every new client workspace (including OTP Carts readiness before Cusick membership linking). Gate Batch A: `verify:otp-carts-readiness`.
8. **Business Memory integration** — Wire `runBusinessMemory()` into rituals or intelligence when explicitly requested; foundation exists, UI does not. Phase 3 prepared durable relationship context but does not integrate Business Memory yet.
9. **Human-approved automation** — Connect Observer automation metadata and Pulse posture to rules; no autonomous execution without approval.

### Operator workflow schedule

Authoritative dated operator sessions and blockers. Update this section when a scheduled work session is added or completed. Do not create a parallel Monday calendar document.

#### Monday, August 3, 2026 — Primal Analytics Ownership Audit and GA4 Cutover Decision

| Field | Value |
|-------|--------|
| **Priority** | High |
| **Duration** | 30–60 minutes with Adam (screen share) |
| **Blocks** | Batch J.2B.2 — Primal GA4 & Ads Entitle + Sync; controlled Primal existing-login walkthrough; Primal reporting pilot |
| **May continue in parallel** | Unrelated KXD OS development (not reporting entitle/sync, not pilot walkthrough) |

##### Confirmed context (do not re-discover blindly)

- Legacy GA4 property: `530873364`
- Ben and Nick originally configured the legacy analytics setup
- Matt does not currently see Primal in his Google Analytics account
- Adam says he does not have normal Google Analytics access
- Adam previously saw the GA4 tracker/property through a Google Ads screen with a three-dot **Manage** option — Ads visibility is **not** proof of GA4 account/property admin access
- Legacy GA4 tracker remains installed on the active Primal Google Ads landing page (retained to avoid disrupting historical reporting/conversions)
- Permanent ownership/admin control of the legacy property is **unverified**
- KXD OS cannot read the legacy property — reporting SA is not Viewer: `kxd-os-reporting@kxd-os.iam.gserviceaccount.com`
- Ads API version defect already repaired and deployed: `v18` → `v25`, commit `9e226d6`, deploy `dpl_HhApn2RdCdJZroHfe4bnRT355NmY` (production READY)
- Google Ads API must still be enabled in GCP project `571979415347` / `kxd-os`
- Search Console is healthy — leave undisturbed
- Preserve Google Ads campaign history; do not modify campaigns
- Primal OS and Primal website repository remain untouched during this audit
- Confirmed-lead tracking remains unavailable and separate from GA4 lead actions and Ads conversions
- No reporting entitlement activation until the permanent analytics property is selected and authenticated probes succeed

##### Mandatory ownership model

> **Primal owns the Analytics asset. KXD administers it. KXD OS receives read-only reporting access.**

For any permanent Primal Analytics setup:

| Principal | Role |
|-----------|------|
| Adam or a durable Primal-controlled Google account | Administrator and permanent client owner |
| Matt / KXD Google account | Administrator |
| `kxd-os-reporting@kxd-os.iam.gserviceaccount.com` | Viewer |
| Ben and Nick | No access to a newly created Analytics account or property |

Do **not** create the permanent Primal Analytics account or property solely under Matt’s KXD Google account. Adam must never send passwords, verification codes, recovery codes, session cookies, API keys, or other credentials — Adam signs in personally during the screen share.

##### Monday objective

Determine whether Primal can obtain durable administrative control of legacy GA4 property `530873364`. Based on **verified access** (not assumptions), choose:

- **Path A** — Retain and secure the legacy property under proper Primal control.
- **Path B** — If durable control cannot be obtained, create a new Primal-owned Analytics account and GA4 property while Adam is signed into a durable Primal-controlled Google account.

Ownership audit first; then decide.

##### Monday ordered workflow

1. **Begin the screen share** — Meet with Adam; he signs into the Google account tied to Primal’s Google Ads. Confirm it is a durable Primal-controlled account (not former vendor, temporary user, or KXD).
2. **Inspect what Adam previously saw** — Open the Google Ads screen with the GA4/tag **Manage** menu. Screenshot: full screen/section name, account/property shown, property or tag ID, Manage menu, Linked accounts / Data Manager, ownership/permission messaging. Screenshots may include business emails, account names, property IDs — never passwords, codes, tokens, payment info, or private customer data.
3. **Test direct Analytics access** — Open `https://analytics.google.com/`. Can Adam see property `530873364`? If yes, record account name/ID, property name/ID, web stream, measurement ID, Adam’s account-level and property-level roles, current account and property Administrators, whether a durable Primal Administrator exists, whether Ben/Nick/KXD have access, whether the property can be moved into a Primal-owned Analytics account. Inspect Admin → Account access management and Admin → Property access management. **Do not add, remove, or modify users during the initial audit.** If Adam only sees the asset through Google Ads, document that distinction.
4. **Identify current tracking architecture (read-only)** — Legacy property ID, measurement ID, active landing-page URL, installation method (GTM / Google tag / source / integration / other), GA4↔Ads link status, GA4-derived Ads conversion actions (source + Primary/Secondary), any access-denied errors. Do not expose secrets.
5. **Choose ownership path**
   - **Path A (retain legacy)** — Only if Primal can obtain durable admin control of `530873364`. Preferred: Adam/Primal Administrator; Matt/KXD Administrator; KXD OS SA Viewer; former vendors removed only after ownership/integrations/tracking/events/conversions verified. Before recommending move/removal, confirm preservation of historical reporting, property/stream, measurement ID, Ads link, events/key events, attribution, landing-page collection. **Do not** move property, remove users, change permissions, change tracking, or alter Google Ads during the initial audit — return evidence to ChatGPT first. Do not create a duplicate GA4 property if the existing one can be securely retained.
   - **Path B (new Primal-owned property)** — If Adam and KXD cannot obtain durable control of `530873364` without Ben/Nick dependence. If replacement is clearly required and Adam is available, create ownership foundation while Adam remains signed into a durable Primal-controlled account: Primal-owned Analytics account, Primal Motorsports GA4 property, web data stream. Record owning Google account, account/property/stream names and IDs, measurement ID, timezone, currency, creation date. Confirm Adam/Primal Administrator, Matt/KXD Administrator, KXD OS SA Viewer; confirm all three before ending; **do not add Ben or Nick**. Ownership foundation may be created Monday only after audit proves replacement necessary. **Do not** install/remove tags, link/unlink GA4–Ads, import/modify conversions, change Primary/Secondary, enable KXD OS entitlements, or run reporting sync in this step.
6. **Return evidence to ChatGPT** — Use the copy-ready handoff prompt below. ChatGPT decides Path A vs B cutover plan. Do not proceed into cutover without the next controlled prompt.
7. **Later controlled cutover (record only — do not execute Monday)** — Inventory legacy tracker; preserve measurement ID/evidence; install permanent tracker on active ads landing page and on new Primal website before launch; controlled temporary overlap only if needed; avoid indefinite duplicate measurement; test page views/sessions, form submissions, `generate_lead`; link permanent GA4 to Primal Ads; audit Ads conversion actions/sources; prevent old+new GA4 conversions both counting as Primary; preserve historical Ads campaign reporting; record cutover date; confirm permanent property before KXD OS config changes; run authenticated GA4 and Ads probes; enable only appropriate Primal reporting entitlements after each probe passes; complete Batch J.2B.2 only after permanent tracker installed and validated; begin controlled Primal walkthrough only after reporting verification passes.

##### Explicit restrictions (Monday audit / this schedule item)

Do not: delete legacy GA4 property; remove/modify legacy tracker; unlink GA4 from Ads; add duplicate tracking without a controlled plan; modify Ads campaigns/budgets/bids/keywords/negatives/ads/assets/audiences/locations/schedules; create/modify Ads conversion actions; change Primary/Secondary or attribution; enable `website-analytics` or `google-ads`; run Batch J.2B.2; start Primal walkthrough or reporting pilot; modify Primal website repository or Primal OS; contact Ben or Nick without Matt’s approval; ask Adam for credentials; assume Ads visibility proves GA4 ownership; blend confirmed leads / GA4 lead actions / Ads conversions; disturb Search Console.

##### Evidence checklist for ChatGPT

Collect: Ads screen Adam remembers; linked GA4/tag/property details; whether `analytics.google.com` opens; whether `530873364` is visible; Analytics account name/ID; property/stream/measurement IDs; Adam’s exact account- and property-level roles; account/property access lists if accessible; Ben/Nick listed?; durable Primal Administrator?; KXD access?; property movable?; landing-page install method; GA4↔Ads link; GA4-derived conversion actions; Primary/Secondary config; errors/barriers; if replacement created — full new account/property/stream/measurement/timezone/currency/creation date and role confirmations; confirmation no tag/conversion/campaign/entitlement/production changes occurred.

##### Copy-ready ChatGPT handoff prompt

```
---
CHATGPT HANDOFF PROMPT

We completed the Primal Analytics Ownership Audit.

Adam signed into his own Primal-controlled Google account. No passwords, verification codes, recovery codes, cookies, API keys, or other credentials were shared.

Here is the verified evidence:

- Screen Adam originally accessed:
- Google Ads account/customer ID:
- Google Ads manager/MCC ID:
- Legacy GA4 property visible from Google Ads: yes/no
- Legacy GA4 property ID:
- Legacy GA4 measurement ID:
- Adam can access analytics.google.com: yes/no
- Property 530873364 visible in Analytics: yes/no
- Analytics account name:
- Analytics account ID:
- Adam’s account-level role:
- Adam’s property-level role:
- Current account Administrators:
- Current property Administrators:
- Ben or Nick still has access: yes/no/unknown
- Durable Primal-controlled Administrator present: yes/no
- KXD access present: yes/no
- Property can be moved: yes/no/unknown
- Current landing-page tag installation method:
- Current GA4-to-Google Ads link status:
- Existing GA4-derived Google Ads conversion actions:
- Current Primary/Secondary conversion configuration:
- Errors or permission barriers:
- Screenshots attached:

Replacement-property results, if required:

- New Primal-owned Analytics account created: yes/no
- Why replacement was determined necessary:
- Permanent owning Google account:
- New Analytics account name:
- New Analytics account ID:
- New GA4 property name:
- New GA4 property ID:
- New web-stream name:
- New measurement ID:
- Reporting timezone:
- Currency:
- Exact creation date:
- Adam/Primal Administrator access confirmed: yes/no
- KXD Administrator access confirmed: yes/no
- KXD OS service-account Viewer access confirmed: yes/no
- Ben or Nick added: no
- New tag installed: no
- Google Ads link changed: no
- Google Ads conversions changed: no
- Legacy tracker changed or removed: no
- KXD OS entitlements changed: no

Safety confirmation:

- Google Ads campaigns or account settings modified: no
- Legacy property deleted: no
- Legacy tracker changed or removed: no
- Primal website repository modified: no
- Primal OS modified: no
- Batch J.2B.2 run: no
- Primal walkthrough or pilot started: no
- Search Console disturbed: no

Based on this verified evidence, determine whether we should:

A. Retain and move or secure legacy property `530873364` under durable Primal ownership, or

B. Use the new Primal-owned GA4 property and perform a controlled tracker and Google Ads conversion cutover.

Then give me the exact next steps in order and one complete Cursor implementation prompt.

Do not authorize deletion of historical assets, removal of the legacy tag, conversion changes, entitlement activation, or Batch J.2B.2 until the ownership and cutover plan is fully defined.

The required permanent structure is:

“Primal owns the Analytics asset. KXD administers it. KXD OS receives read-only reporting access.”
---
```

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
| `PHASE-4-MULTI-CLIENT-PORTAL.md` | Phase 4 plan (Batches A–I code-complete; awaiting authenticated rollout QA) |
| `PHASE-4-PORTAL-IDENTITY-SECURITY.md` | Batch I invitations / roles / passkeys / MFA |
| `PHASE-4-PRODUCTION-ROLLOUT-CHECKLIST.md` | Phase 4 production rollout / authenticated QA checklist |
| `PHASE-5-CLIENT-BILLING-VISIBILITY.md` | Phase 5 complete (Batches 5A–5D; Batch 5E intentionally skipped) |
| `PHASE-6-KXD-CONNECT.md` | Phase 6 Connect — Batches C0–C6 (through readiness / internal release gate); production enablement excluded |
| `PHASE-6-CONNECT-LOCAL-DOGFOOD-RUNBOOK.md` | Local dogfood activation / rollback operator runbook (C4) |
| `PHASE-7-TODAY.md` | Phase 7 Today — Batches A–B product law; Batches C–D.1 implemented (home policy + experience + recomposition) |
| `KXD-PRODUCT-INTELLIGENCE.md` | Product Intelligence — P0-A, P0-B, P0-C, P0-D, P0-E, P0-F, P0-G, P0-H, P0-I, P0-J, P0-K (through Query Engine) |
| `KXD-OS-CONSTITUTION.md` | Experience standard |
| `CLIENT-EXPERIENCE-SYSTEM-ARCHITECTURE.md` | CES architecture |
| `.cursor/rules/kxd-os-architecture.mdc` | Cursor permanent context |

---

*This document is permanent engineering memory. Update when a major phase completes or architecture wiring changes.*
