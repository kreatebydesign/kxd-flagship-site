# KXD OS Growth Engine — Architecture & Schema Plan

**Version:** 1.0  
**Status:** Architecture / planning only — not implemented  
**Date:** August 4, 2026  
**Edition:** KXD OS Edition 1 (additive future phase)  
**Audience:** Founder, engineering, Cursor agents

> This document defines the future Growth Engine so implementation can begin from a clean checkpoint.  
> **Do not treat this as shipped capability.** No Payload collections, UI, or automations described here are live unless noted under “Existing foundation.”

**Related documents**

| Document                                 | Role                                   |
| ---------------------------------------- | -------------------------------------- |
| `docs/KXD-OS-CURRENT-STATE.md`           | What exists today                      |
| `docs/KXD-OS-ARCHITECTURE.md`            | Platform layer order                   |
| `docs/KXD-OS-PRODUCT-ROADMAP.md`         | Long-horizon product eras              |
| `docs/KXD-OS-ROADMAP.md`                 | Edition 1 engineering progress         |
| Existing Sales Engine (`/admin/sales/*`) | Current leads / proposals / activities |
| Junior Creators (`/junior-creators`)     | Youth discovery + missions foundation  |

---

## 1. Product principles

1. **Growth is a studio operating capability**, not a bolt-on CRM.
2. **Facts before outreach.** Discovery, research, and scoring precede drafts; drafts precede send.
3. **Human approval is the default.** Controlled sending requires explicit modes and audit trails.
4. **Exact source provenance.** Every opportunity remembers how it entered the system.
5. **Compliance is structural.** Consent, opt-out, and suppression are first-class entities — not footnotes.
6. **Junior Creators contribute discovery only.** They never send, approve, export, or see private client / financial data.
7. **Reuse Shared Core.** Extend existing clients, sales leads, proposals, timeline, and work items — do not fork a parallel CRM.
8. **Learn from outcomes.** Reporting improves scoring only after real-world usage data exists.

### Non-goals (v1 Growth Engine)

- Unauthorized scraping of Craigslist or any third-party site
- Fully autonomous outbound without approval
- Replacing the existing Sales Engine overnight
- Public lead marketplace or multi-tenant agency product
- AI-generated claims without evidence-bound drafts
- Giving Junior Creators access to client workspaces, pricing, or admin operations

---

## 2. Existing foundation (do not duplicate)

| Capability                                                  | Location                                    | Growth Engine relationship                                          |
| ----------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------- |
| Sales leads / pipeline / proposals / activities / forecast  | `/admin/sales/*`, sales Payload collections | Primary commercial conversion path after opportunity qualification  |
| Growth overview (inquiry scoring)                           | `/admin/operations/growth`                  | Lightweight precursor; will feed Opportunity Desk later             |
| Website audits / audit reports                              | `/admin/operations/audits`                  | Mini-audit + proposal starter inputs                                |
| Junior Creators academy, missions, quests, ranks, leads API | `/junior-creators`, `lib/junior-creators/`  | Lead Missions + discovery submission path                           |
| Junior admin review                                         | `/admin/operations/junior-creators`         | Matt’s review queue seed                                            |
| Client launch / provisioning / commercial agreements        | Client ops modules                          | Post-win onboarding handoff                                         |
| Observer → Brain → Pulse → Narrative                        | `lib/observer/` …                           | Optional later: growth facts as observations — not required for MVP |
| Timeline / Activity Engine                                  | `lib/executive-timeline/`, activity         | Relationship memory for approved conversations                      |

---

## 3. Proposed phases and dependency order

```
GE-0  Architecture checkpoint (this document)     ✅ planning
  ↓
GE-1  Core entities + Payload schema + access
  ↓
GE-2  Opportunity Desk (operator UI) + pipeline states
  ↓
GE-3  Sourcing inbox + approved connectors (email alerts first)
  ↓
GE-4  Research notes + scoring v1 (deterministic rules)
  ↓
GE-5  Draft studio (email / LinkedIn / form / call / mini-audit / proposal starter)
  ↓
GE-6  Approval modes + controlled send + reply detection hooks
  ↓
GE-7  Suppression / consent / opt-out enforcement
  ↓
GE-8  Junior Creator Lead Missions → Matt review queue
  ↓
GE-9  Follow-up sequences (manual-first, then assisted)
  ↓
GE-10 Monthly Growth Brief + campaign framing
  ↓
GE-11 Outcome reporting + learning loop (post usage data)
```

**Dependency notes**

- GE-3 must not include unauthorized scraping; email-alert intake and public APIs only.
- GE-6 depends on GE-5 and GE-7 (cannot send without suppression checks).
- GE-8 depends on GE-1/2 and existing Junior Creators auth boundaries.
- GE-11 must wait until enough real outcomes exist (see §16).

---

## 4. Core entities and relationships

```
SourceConnector ──┐
                  ├──► SourceItem ──► Opportunity ──┬──► OpportunityActivity
SourcingInbox ────┘         ▲                      ├──► OutreachDraft
                            │                      ├──► FollowUpSequence
JuniorDiscovery ────────────┤                      └──► (optional) SalesLead / Proposal
                            │
SuppressionEntry / ConsentRecord (checked before any outbound)
```

### Entity summaries

| Entity                  | Purpose                                                                      |
| ----------------------- | ---------------------------------------------------------------------------- |
| **Opportunity**         | Canonical growth record in the unified pipeline                              |
| **SourceItem**          | Raw ingested item before/while becoming an Opportunity                       |
| **SourceConnector**     | Configured approved intake path (Craigslist email alert, form, manual, etc.) |
| **SourcingInbox**       | Operator triage queue of SourceItems                                         |
| **OpportunityActivity** | Logged touches, research notes, status changes                               |
| **OutreachDraft**       | Channel-specific draft awaiting approval                                     |
| **FollowUpSequence**    | Planned follow-ups with due dates and ownership                              |
| **ConsentRecord**       | Evidence of permission / context for contact                                 |
| **SuppressionEntry**    | Do-not-contact rules (email, domain, phone)                                  |
| **JuniorDiscovery**     | Youth-submitted find → maps to SourceItem / Opportunity                      |
| **LeadMission**         | Assigned Junior Creator mission instance                                     |
| **GrowthBrief**         | Monthly campaign / brief document                                            |
| **OutcomeEvent**        | Reply, meeting, proposal, win/loss — for later learning                      |

---

## 5. Pipeline states

Suggested Opportunity states (single linear pipeline with explicit closed reasons):

| State             | Meaning                                        |
| ----------------- | ---------------------------------------------- |
| `inbox`           | Newly sourced; not yet reviewed                |
| `triage`          | Under operator review                          |
| `researching`     | Enrichment / mini-audit in progress            |
| `qualified`       | Worth pursuing                                 |
| `drafting`        | Outreach or proposal artifacts in progress     |
| `ready_to_send`   | Draft approved; waiting for send mode          |
| `awaiting_reply`  | Outbound sent; monitoring                      |
| `conversation`    | Two-way engagement started                     |
| `handed_to_sales` | Converted into Sales Lead / Proposal workspace |
| `nurture`         | Not now; scheduled follow-up                   |
| `suppressed`      | Blocked by compliance                          |
| `closed_won`      | Became a client / signed work                  |
| `closed_lost`     | Declined / disqualified                        |
| `archived`        | Historical only                                |

Transitions must be audit-logged. Junior Creators may only create discoveries that land in `inbox` / review — never advance past Matt’s approval.

---

## 6. Source-ingestion model

### Allowed intake (MVP+)

1. **Manual entry** (Matt / staff)
2. **Junior Creator discoveries** (structured form)
3. **Website / contact form inquiries** (existing inquiry collections → Opportunity bridge)
4. **Email alert intake** (e.g. Craigslist _email alerts_ forwarded into a dedicated inbox) — parse subject/body/links only from messages KXD already receives
5. **Public / approved APIs** and partner feeds with written permission

### Explicitly forbidden

- Scraping Craigslist or sites that prohibit automated access
- Credential stuffing / impersonation
- Buying scraped contact lists without lawful basis
- Circumventing rate limits or robots rules for unauthorized sources

### SourceItem fields (conceptual)

- `connectorId`, `externalKey`, `receivedAt`
- `rawPayload` (JSON; retention policy)
- `normalizedTitle`, `normalizedUrl`, `normalizedLocation`
- `parseStatus`, `parseErrors`
- `dedupeHash`, `matchedOpportunityId`
- `intakeChannel` (`email_alert` | `manual` | `junior` | `web_form` | `api`)

---

## 7. Deduplication strategy

1. **Normalize** website host + path (lowercase host only for matching — preserve display URL separately).
2. **Keys (priority order):**
   - Exact website URL fingerprint
   - Domain + business name similarity
   - Email / phone when present
   - External source id from connector
3. **On match:** attach new SourceItem to existing Opportunity; do not create a duplicate pipeline card.
4. **On conflict:** flag for human merge in Sourcing Inbox.
5. **Never auto-delete** Junior discoveries that look like duplicates — route to review with “possible duplicate” badge.

---

## 8. Scoring model (v1 deterministic)

Score 0–100 from weighted factors (illustrative defaults):

| Factor                       | Weight | Notes                                            |
| ---------------------------- | ------ | ------------------------------------------------ |
| Fit to KXD services          | 25     | Website / brand / growth infrastructure          |
| Problem evidence             | 20     | Outdated site, weak mobile, no CTA, poor reviews |
| Business viability           | 15     | Active business signals (public)                 |
| Reachability                 | 15     | Public contact path exists                       |
| Geography / priority markets | 10     | Configurable                                     |
| Timing / urgency             | 10     | Hiring, remodel, new location, event             |
| Source quality               | 5      | Junior vs alert vs inbound                       |

**Rules**

- Scores are explanations with factor breakdown — not black-box ranks.
- v1 does **not** use ML. Learning loop (GE-11) may adjust weights later from OutcomeEvents.
- Suppression / compliance flags hard-cap sendability regardless of score.

---

## 9. Activity and follow-up model

- Every meaningful action writes an `OpportunityActivity` (research note, call attempt, draft created, send, reply, state change).
- Follow-up sequences are **templates + instances**:
  - Template: cadence steps (day 0 / 3 / 7…) and channel suggestions
  - Instance: bound to Opportunity, owner, next due at (Pacific display; store UTC)
- Missed follow-ups surface on Opportunity Desk and optionally Today / Focus adapters later.
- Activities feed Timeline only after an Opportunity becomes a client or an explicit “promote to relationship memory” action.

---

## 10. Outreach approval modes

| Mode               | Behavior                                                                          |
| ------------------ | --------------------------------------------------------------------------------- |
| `draft_only`       | Default. Create drafts; no send.                                                  |
| `approve_each`     | Each outbound requires explicit operator approval.                                |
| `approve_sequence` | Approve a follow-up sequence once; each step still logged; stop on reply/opt-out. |
| `assisted_send`    | System sends only through connected provider after approval token.                |

**Hard gates before any send**

1. Opportunity not suppressed
2. Active ConsentRecord or documented public-contact rationale field
3. Draft approved by authorized role
4. Channel credentials valid
5. Audit log write succeeds

Junior Creators never receive send modes.

---

## 11. Compliance and suppression

### SuppressionEntry

- `type`: email | domain | phone | business_key
- `value`, `reason`, `source`, `createdBy`, `createdAt`, `expiresAt?`
- Checked on draft create, sequence schedule, and send

### Consent / lawful context

- Store why contact is permitted (inbound request, public business contact page, prior relationship, etc.).
- Opt-out language required in email templates.
- Honor unsubscribe / “stop” replies → auto SuppressionEntry + sequence halt.

### Data minimization

- Junior Creators see only public-business fields they submitted or that missions allow.
- No client financials, private files, or unrelated CRM records in youth surfaces.

---

## 12. Junior Creator permission boundaries

Extend `/junior-creators` with **Lead Missions** while preserving separate authentication.

### Allowed

- Receive understandable Lead Missions (find businesses, check websites, identify problems, verify public details, select promising opportunities)
- Earn points, streaks, ranks, badges, tracks, team goals, celebrations (existing systems)
- Submit JuniorDiscovery → Matt review queue
- See meaningful outcomes when an approved discovery becomes a conversation or client (sanitized status: “Your find started a conversation”, “Became a client”)

### Forbidden

- Send outreach
- Approve / reject leads for the studio
- Access private client data / CES / portal admin
- View sensitive pricing or financials
- Delete leads
- Export contacts
- Run unrestricted search tools / scrapers
- Access Opportunity Desk internals beyond their missions and outcome badges

### Auth

- Keep Junior Creators auth isolated from admin/portal sessions (existing boundary).
- Admin review remains under `/admin/operations/junior-creators` (or successor Growth review view).

---

## 13. Audit logging

Log at minimum:

- SourceItem intake and parse results
- Opportunity create / merge / state change
- Draft create / edit / approve / reject
- Send attempts and provider responses
- Reply detection events
- Suppression hits (blocked sends)
- JuniorDiscovery submit / approve / reject
- Exports (if ever enabled — default off)

Audit records are append-only from the application’s perspective.

---

## 14. Suggested Payload collections and access controls

> Names are proposals for a future migration. Prefer additive collections; bridge to existing `leads` / inquiries rather than renaming abruptly.

| Collection                 | Access (sketch)                                       |
| -------------------------- | ----------------------------------------------------- |
| `growth-opportunities`     | Admin / founder write; staff limited; juniors none    |
| `growth-source-items`      | System + admin; staff read triage                     |
| `growth-source-connectors` | Admin only                                            |
| `growth-outreach-drafts`   | Admin / founder; staff draft maybe                    |
| `growth-follow-ups`        | Admin / founder / assigned staff                      |
| `growth-suppressions`      | Admin / founder                                       |
| `growth-consent-records`   | Admin / founder                                       |
| `growth-briefs`            | Admin / founder                                       |
| `junior-discoveries`       | Junior create (own); admin review; no junior read-all |
| `junior-lead-missions`     | Admin assign; junior read own                         |

**Access principles**

- Field-level exclusion of financial / private client refs on junior-facing APIs
- No public REST exposure without auth
- Server-only mutations for approve / send / suppress

---

## 15. Integration points with existing KXD OS systems

| System                 | Integration                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------ |
| Sales Engine           | `handed_to_sales` creates/links Sales Lead + optional Proposal draft                 |
| Audits                 | Mini-audit can spawn or link website audit report                                    |
| Today / Focus / Review | Surfaces due follow-ups and high-score inbox counts via adapters                     |
| Growth screen          | Evolve into Opportunity Desk entry or deep-link                                      |
| Timeline               | Promote relationship events after conversation/client                                |
| Work Engine            | Optional tasks for research / proposal prep                                          |
| Commercial / Launch    | Post-win handoff checklist                                                           |
| Observer (later)       | Emit facts: “opportunity created”, “reply received” — no recommendations in Observer |

---

## 16. Migration strategy

1. **Bridge, don’t big-bang.** Keep `/admin/sales` authoritative for active deals.
2. **Backfill selectively:** open inquiries / project inquiries → Opportunities in `inbox` or `handed_to_sales` as appropriate.
3. **Junior leads API** continues; map submissions into `junior-discoveries` + SourceItems.
4. **Feature-flag** Opportunity Desk until GE-2 acceptance criteria pass.
5. **No destructive migration** of sales proposals.
6. **Timezone:** store UTC; display Pacific via `lib/platform/timezone` helpers.

---

## 17. MVP acceptance criteria (first build slice after this doc)

- [ ] Opportunities can be created manually and from Junior discoveries
- [ ] Sourcing Inbox lists SourceItems with provenance
- [ ] Deduplication prevents obvious duplicate websites
- [ ] Deterministic score with visible factor breakdown
- [ ] Draft email + call opener can be saved (no send required for MVP)
- [ ] Suppression list blocks draft send path even if send UI is hidden
- [ ] Matt can approve/reject Junior discoveries
- [ ] Juniors cannot access admin Growth APIs
- [ ] Audit log covers create / approve / reject
- [ ] Verify scripts cover access boundaries and dedupe

**MVP explicitly excludes:** autonomous send, ML scoring, Craigslist scraping, full sequence automation, Monthly Growth Brief UI polish.

---

## 18. What must wait until after real-world usage data

- Learned scoring weights / ML rankers
- Auto-send optimization
- Aggressive sequence personalization
- Source connector expansion beyond proven channels
- Predicting win probability as a managed KPI
- Replacing Sales forecast models with Growth-derived forecasts

Until then, keep scoring explainable and conservative.

---

## 19. Daily Opportunity Desk (product sketch)

Operator morning surface:

1. New inbox items (sourced + junior)
2. Due follow-ups
3. Ready-to-send approvals
4. High-score opportunities needing research
5. Suppression / bounce issues

Calm, dense, KHIG-aligned — not a flashy CRM board first.

---

## 20. Opportunity Sourcer & Craigslist posture

**Opportunity Sourcer** is an operator-assisted intake + research assistant:

- Helps structure searches and checklists
- Ingests **email alerts KXD already receives**
- Never performs unauthorized scraping

Craigslist (and similar) participation is **alert/email intake + manual review**, documented under SourceConnector policy.

---

## 21. Monthly KXD Growth Brief / campaigns

`GrowthBrief` captures:

- Theme / offer / audience
- Target opportunity segments
- Draft assets and sequence templates
- Outcomes summary (replies, meetings, wins)

Ties to Executive Narrative / rituals later as an adapter — Growth Brief does not replace Morning Brief.

---

## 22. Open questions (resolve before GE-1 schema freeze)

1. Single `growth-opportunities` collection vs status field on existing sales leads?  
   **Recommendation:** separate Opportunity until `handed_to_sales`, then link.
2. Which email provider for assisted send (workspace SMTP, Resend, etc.)?
3. Retention period for raw SourceItem payloads?
4. Which staff roles may approve outreach vs only founder?

---

## Document control

| Version | Date       | Notes                                                        |
| ------- | ---------- | ------------------------------------------------------------ |
| 1.0     | 2026-08-04 | Initial architecture checkpoint prior to Growth Engine build |

**Implementation rule for agents:** Prefer additive schema and adapters. Do not rewrite Sales Engine, Junior Creators auth, or intelligence layers to “make Growth fit.” Extend at the edges.
