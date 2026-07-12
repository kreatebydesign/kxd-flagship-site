# Executive Scheduling Architecture

**Phase:** 25A — Architecture Audit (no implementation)  
**Product:** KXD OS Edition 1 — Kreate by Design Agency OS  
**Date:** 2026-07-11  
**Status:** Architecture decision — ready for phased implementation  
**Constraint:** Single codebase · Shared Core · No Organizations · No multi-tenancy

---

## 1. Executive summary

KXD OS already knows **what** needs to happen (Work Engine, `plannedForDate`, Time Budget). It does **not** yet know **when** it happens on Matt’s real calendar.

Google Calendar must remain the **external calendar source of truth**. KXD OS must **not** become a second calendar or a second task system. Local persistence is required only for durable Work↔event relationships, sync state, approvals, permissions, audit history, and intelligence evidence.

Heather’s role as Executive Operations Coordinator requires a **permissioned scheduling lane**: Suggest → Schedule approved internal work → Restricted (Matt approval). Matt retains control over external, sensitive, personal, financial/legal, and unusual scheduling.

**This phase implements nothing.** It records repository findings and permanent decisions so later phases stay small, testable, and architecturally coherent.

---

## 2. Current-state repository findings

### Platform systems already in place (verified)

| System | Location | Relevance to scheduling |
|---|---|---|
| Executive Today | `/admin/operations/today`, `lib/executive-today/` | Upcoming already has a calendar reserved empty state |
| Executive Workspace | `components/admin/executive-workspace/` | Quick Create `create-calendar` reserved; search scope `calendar` reserved |
| Work Engine | `lib/work/`, `payload/collections/Work.ts` | `plannedForDate`, `estimatedEffort`, assignment, status |
| Work Planning | `lib/work/planning/` | Today / Upcoming / plan mutations — day-level only |
| Work Composer v2 | Phase 24C | Time Budget → hours; Planned Date in More details |
| Executive Context | `lib/executive-context/` | Extension slots: `calendar`, `scheduling` |
| Executive Signals | `lib/executive-signals/` | Domain `calendar` + `SIGNAL_SURFACE_MAP.calendar` |
| Operational Flow | `lib/operational-flow/` | Source/affected `calendar`; extension reserved |
| KXD Intelligence | `lib/kxd-intelligence/` | Source id `calendar` reserved; no page-load AI |
| Activity Engine | `lib/activity-engine/` | Sole executive event ingress |
| Operations Experience | `lib/training/` | Ops Coordinator track — no scheduling lessons yet |
| Integrations hub | `lib/integrations/`, `lib/live-integrations/` | Workspace stub declares `calendar.readonly` — no calls |

### Critical absences

- **No Google Calendar implementation** (no `googleapis`, no freebusy, no event CRUD, no watch channels).
- **No OAuth callback routes** for Google (or any provider).
- **No cron / job queue** (`vercel.json` absent; `LIVE_SYNC_SCHEDULES` is architecture-only).
- **Users** have `admin` | `editor` roles that are **not enforced** in Work access control.
- **`plannedForDate` changes** revalidate via Operational Flow but **do not** publish Activity Engine events (by design today).

---

## 3. Existing integration inventory

### Google — what exists

| Integration | Status | Auth | Calendar? |
|---|---|---|---|
| Google Places / Business Profile | Live | API key (`GOOGLE_PLACES_API_KEY`) | No |
| GA4 | Env detection only | Service account JSON declared | No |
| Search Console | Env detection only | Service account JSON declared | No |
| Google Workspace | Stub only | Domain + service account env detection | **Declared intent only** (`calendar.readonly` scope in provider registry) |
| Google Drive | None | — | No |
| Google Calendar | **None** | — | **No** |

### Reusable patterns (not Google Calendar code)

| Pattern | Path | Use for scheduling |
|---|---|---|
| Provider registration | `lib/integrations/providers.ts` | Add/extend calendar provider entry |
| Live sync handler shape | `lib/live-integrations/google-business.ts` | Model for future `syncGoogleCalendar` |
| Sync history cache | `lib/live-integrations/sync.ts` | Connection health, last sync |
| Schedule placeholders | `lib/live-integrations/scheduler.ts` | Document cadence; not execution |
| OAuth type stubs | `lib/integrations/types.ts` | `IntegrationOAuthConfig` contracts |
| Webhook verification | `app/api/stripe/webhook/route.ts` | Signature verify → process event |
| Work metadata relationships | `lib/work/integration/types.ts` | `"meeting"` already in `WorkRelationshipType` |
| Portal meetings UI shape | `lib/portal/types.ts` `PortalMeetingItem` | Client-facing meetings are separate (CES) — do not conflate with Matt’s executive calendar |

### Explicit non-reuse

- Places API key auth is **not** interchangeable with Calendar OAuth.
- Portal Meetings module is **client HQ**, not founder calendar OS.
- Workspace stub’s `NormalizedWorkspace` has **no calendar event fields**.

---

## 4. Source-of-truth decisions

| Concern | Source of truth | Local durable copy? |
|---|---|---|
| Calendar event times, attendees, recurrence, cancellation | **Google Calendar** | Sync pointers + last-known snapshot for conflict UI only — not a full mirror |
| Work identity, status, Time Budget, client link | **Work Engine (Payload)** | System of record |
| Day plan intent (`plannedForDate`) | **Work Engine** | Already local |
| “This Work is on Matt’s calendar as event X” | **KXD scheduling link record** | Required |
| Approval / suggestion / permission decisions | **KXD scheduling domain** | Required |
| Audit of who scheduled/approved what | **KXD audit + Activity Engine** | Required |
| Free/busy at query time | **Google freebusy / events.list** | Cache short-lived results only |

**Principle:** Do not create a full parallel calendar database. Prefer Google for calendar facts; store relationships and decisions in Neon/Payload.

---

## 5. Recommended domain model

### Concepts

1. **Work** — what must be done (unchanged meaning).  
2. **Schedule Proposal** — a suggested placement (slot + rationale + proposer).  
3. **Schedule Link** — approved/active binding between Work and a Google Calendar event.  
4. **Scheduling Policy** — working hours, protected categories, Level 1–3 rules (code + config first; collection later if needed).  
5. **Sync Cursor** — watch channel / sync token / last successful pull for Matt’s calendar.

### Lifecycle (happy path)

```
Work (open, has Time Budget)
  → Schedule action
  → Availability read (Google) + policy evaluation
  → Slot suggestions (deterministic ranking + evidence)
  → Level 1: Proposal → Matt approves
     Level 2: Direct create (policy allows)
     Level 3: Proposal forced (policy requires Matt)
  → Google Calendar event create (write scope)
  → Schedule Link stored (event id, calendar id, etag, times)
  → Work summary updated (scheduled flag / next block)
  → Operational Flow + Activity + Context/Signals on next load
```

---

## 6. Proposed data model

### Comparison

| | Option A — fields on Work | Option B — dedicated collection only | Option C — Hybrid (recommended) |
|---|---|---|---|
| Source of truth clarity | Weak (mixes work + sync) | Strong | Strong |
| Multiple attempts / history | Poor | Excellent | Excellent |
| Approvals | Awkward | Natural | Natural |
| Fast Work list reads | Excellent | Extra join | Summary on Work |
| Avoid second calendar | Yes if careful | Yes | Yes |
| Future team members | Hard | Ready | Ready |

### Option C — Hybrid (selected)

**A. Keep on Work (already exist — do not redefine meaning)**

- `plannedForDate` — day plan intent (not calendar write)  
- `estimatedEffort` — Time Budget hours  
- `startDate` / `dueDate` — planning bounds  
- `assignedTo` — operator ownership  
- `status`, `priority`, `category`, `client`

**B. Add later (implementation phases — not this audit)**

On Work, **denormalized summary only** (fast UI):

- `scheduleStatus`: `none | proposed | scheduled | conflict | sync-error`  
- `scheduledStartAt` / `scheduledEndAt` (ISO) — mirror of active link  
- `activeScheduleLinkId` — FK to link record  

These are **read accelerators**, not source of truth.

**C. Dedicated collection (recommended name): `work-schedule-links`**

Minimum fields (conceptual):

| Field | Purpose |
|---|---|
| `work` | Relationship → work |
| `kind` | `proposal` \| `active` \| `superseded` \| `canceled` |
| `approvalState` | `draft` \| `pending-matt` \| `approved` \| `rejected` \| `auto-approved` |
| `permissionLevelUsed` | `1` \| `2` \| `3` |
| `proposedBy` / `approvedBy` | Users |
| `proposedStartAt` / `proposedEndAt` | Slot |
| `googleCalendarId` | Calendar identity |
| `googleEventId` | Event identity |
| `googleEtag` / `googleHtmlLink` | Sync / open |
| `syncState` | `pending-write` \| `synced` \| `stale` \| `deleted-remotely` \| `error` |
| `lastSyncedAt` | Timestamp |
| `evidence` | JSON — why slot chosen / conflicts |
| `displacedSummary` | Text — what would move |
| `auditTrail` | Append-only array or Activity ids |

**D. Optional later: `scheduling-policies`**

Defer. Encode Level 1–3 rules in typed config (`lib/scheduling/policy.ts`) until rules need CMS editing.

**E. Do not store**

- Full event history for all of Matt’s calendar  
- Recurring expansion tables for Google recurrence  
- Client portal meeting records as Matt’s OS calendar  

---

## 7. Work-to-calendar lifecycle

| Stage | Work | Schedule Link | Google |
|---|---|---|---|
| Unscheduled | Open work | None | — |
| Suggested | Unchanged | `kind=proposal`, `pending-matt` or draft | No write |
| Approved | Summary → scheduled | `kind=active`, approved | Event created |
| Moved in GCal | Summary times updated on sync | `syncState=stale`→`synced` | Source of truth |
| Deleted in GCal | Summary cleared / conflict | `syncState=deleted-remotely` | Gone |
| Completed early | Work → completed; Flow | Link remains historical | Optional event shorten / leave as-is (policy) |
| Not completed in block | Work stays open; Signal | Link stays; miss recorded | Event may remain |

**Idempotency:** Writes use `googleEventId` + Work id. Extended properties on the Google event should carry `kxdWorkId` / `kxdLinkId` so remote moves still re-associate.

---

## 8. Scheduling permission model

### Current auth reality

- Payload `users`: `role` = `admin` | `editor` — **not enforced** on Work APIs.  
- `requirePayloadAdminApi()` only checks membership in `users`.  
- Portal users are a separate auth domain.

### Target model (Edition 1, no Organizations)

Introduce **scheduling capabilities** as code-level grants (future: fields on Users or a small `operator-profiles` JSON), not multi-tenant roles.

| Capability | Meaning |
|---|---|
| `scheduling.suggest` | Create proposals only |
| `scheduling.write-internal` | Level 2 direct writes |
| `scheduling.approve` | Approve/reject proposals (Matt) |
| `scheduling.write-restricted` | Level 3 (Matt only by default) |
| `scheduling.manage-connection` | Connect/revoke Google OAuth |

**Heather (target):** `suggest` + eventually `write-internal`.  
**Matt:** all capabilities.  
**Default for all current admins until configured:** treat as Matt-equivalent **or** deny write until explicitly granted (safer: deny calendar writes until capability assigned).

### Policy evaluation order

1. Actor capabilities  
2. Work sensitivity (category, priority, client external?, tags)  
3. Slot rules (working hours, protected blocks, external attendees)  
4. Displacement severity  
5. → Level 1 / 2 / 3 outcome  

---

## 9. Approval model

| State | Who | Calendar write? |
|---|---|---|
| `draft` | Proposer | No |
| `pending-matt` | Awaiting founder | No |
| `approved` | Matt (or auto for Level 2) | Yes (create/update) |
| `rejected` | Matt | No |
| `auto-approved` | Policy Level 2 | Yes |
| `expired` | Slot no longer valid | No |

Approvals are first-class on the **Schedule Link / Proposal**, not buried in Work `notes`.

Confirmation UI is mandatory before any Google write — including Level 2.

---

## 10. Google Calendar integration architecture

### Auth boundary

- **OAuth 2.0** for Matt’s calendar (user consent).  
- Workspace **service-account / domain-wide delegation** may appear later for agency mailboxes; do not assume it for Matt’s personal/founder calendar without explicit product decision.  
- Separate from Places API key and from Drive (none today).

### Scopes (progressive)

1. Read foundation: `calendar.readonly` + freebusy as needed  
2. Write phase: `calendar.events` (or full `calendar` if required — prefer least privilege)

### Operations

| Operation | API concept | First ship? |
|---|---|---|
| List calendars | `calendarList.list` | Yes (connection) |
| Free/busy | `freebusy.query` | Yes (suggestions) |
| Create event | `events.insert` | After approval model |
| Update event | `events.patch` | Reschedule |
| Delete / cancel | `events.delete` | Cancel flow |
| Watch | `events.watch` | Sync phase |
| Sync token | `events.list` syncToken | Sync phase |

### Linking method

Store on Google event **extendedProperties.private**:

- `kxdWorkId`  
- `kxdScheduleLinkId`  
- `kxdEdition` = `1`  

Plus local `googleEventId` / `googleCalendarId` / `etag`.

### Vercel constraints

- Synchronous: suggest slots, approval UI, single event create after confirm  
- Asynchronous later: watch renewal, bulk sync, conflict reconciliation  
- No job queue today — first phases must complete within request timeouts  
- Webhook route pattern: follow Stripe (`raw body` + signature/channel token verification)

---

## 11. Synchronization and recovery model

| Mechanism | Role |
|---|---|
| Push watch (`events.watch`) | Preferred change notification |
| Watch expiration renewal | Required (Google channels expire) |
| Sync token incremental pull | Recovery + catch-up |
| Polling fallback | If watch fails (scheduler placeholder exists; needs real cron later) |
| Etag / updated comparison | Conflict detection |

### Failure recovery

- Failed write → `syncState=error`, no fake “scheduled” summary  
- Remote delete → clear Work summary; Signal “scheduled block removed”  
- Remote move → update link times; Signal if Level 3 displacement  
- Stale etag → re-fetch before patch  

### Idempotency & retries

- Client confirmation token / server idempotency key per approve action  
- Retry create only if no `googleEventId` yet  
- Never double-insert by title matching alone  

---

## 12. Audit and activity model

### Local audit (Schedule Link)

Append-only trail for: suggested, approved, rejected, written, sync error, remote moved, remote deleted.

### Activity Engine (founder-visible)

New event types (names illustrative):

- `work.schedule-proposed`  
- `work.schedule-approved`  
- `work.scheduled`  
- `work.schedule-moved`  
- `work.schedule-canceled`  
- `work.schedule-conflict`  
- `work.schedule-missed`  

Publish via `publishActivity` when client-linked and `timelineEnabled` — same rules as other Work events. Internal-only when no client.

### Do not

- Duplicate Google’s entire event stream into Activity  
- Emit Activity for every freebusy query  

---

## 13. Executive Today integration

**Today already:**

- Upcoming fallback: “Schedule awareness arrives when Calendar connects.” (`lib/executive-today/load.ts`)  
- Source union includes `"calendar"`  

**When connected:**

- Show **today’s scheduled Work blocks** (from Schedule Links + Work titles)  
- Show **conflicts / overloaded day** as calm Upcoming or Signal-backed rows  
- Do **not** build a full calendar grid on Today  

**Separation:**

- Day plan (`plannedForDate`) = intent  
- Scheduled block = committed calendar time  
- Today may show both: “Planned” vs “On calendar” without merging systems  

---

## 14. Executive Context integration

Reserved slots already:

- `calendar` — “Calendar events will feed waiting and upcoming when connected.”  
- `scheduling` — “Scheduling will inform quietHoursReady and continuation.”  

**Compose seams:**

- Load schedule summary inside `composeExecutiveContext` (cached with request)  
- Feed `quietHoursReady` with “no protected meeting conflict”  
- Inject `kind: "calendar"` refs into waiting/upcoming-adjacent slices  
- Continuation may prefer “next scheduled block” when present  

No parallel context engine.

---

## 15. Executive Signals integration

- Domain `calendar` already exists  
- Add elevate taxonomy for schedule conflict / overloaded / unplanned urgent  
- Ingress: Activity Engine items only  
- Evidence: Work id, link id, Google event id, times, policy level  

---

## 16. Operational Flow integration

Today: `source` / affected system / extension for `calendar` reserved; `operational.milestone` can mark calendar affected.

**Future transition kinds (examples):**

- `schedule.proposed`  
- `schedule.approved`  
- `schedule.written`  
- `schedule.moved`  
- `schedule.canceled`  
- `schedule.conflict`  

**Effects:** refresh Today, Context, Signals, Work; Client Success when client-linked; revalidate paths already patterned in `revalidate.ts`.

Wire `processOperationalFlow` after schedule mutations — same pattern as Work status / plan.

---

## 17. KXD Intelligence boundaries

| Allowed | Forbidden |
|---|---|
| Deterministic slot ranking from freebusy + Time Budget + priority + dueDate | Page-load LLM calls |
| Evidence-backed “why this slot” | Open-ended calendar chatbot |
| Conflict / overbooking warnings | Autopilot writes without confirmation |
| Optional future model assist for soft preferences | Vendor lock-in in core path |

`IntelligenceSourceId` / domain already reserve `calendar`. Mentors may later teach scheduling judgment; they must not execute calendar writes.

---

## 18. Heather training boundaries

Operations Experience (`EXECUTIVE_OPS_COORDINATOR_TRACK`) does not yet teach scheduling.

**Future curriculum themes (not this phase):**

- Protected vs movable time  
- When Level 3 approval is required  
- Reading conflicts and displacement  
- When **not** to schedule  
- Escalation to Matt  
- Internal vs external attendees  
- Calendar hygiene  
- Follow-up after missed blocks  

Training may spawn practice Work; it must not grant live write scopes.

---

## 19. Security and privacy considerations

- Least-privilege OAuth scopes  
- Tokens encrypted at rest (Payload fields / secret store — decide in connection phase)  
- Never expose Matt’s personal event details to portal clients  
- Operator UI: show free/busy + titles only as policy allows (personal blocks may be opaque “Busy”)  
- Audit every write and approval  
- No calendar data in client-visible CES unless explicitly productized later  
- Distinguish Heather’s operator session from Matt’s OAuth subject  

---

## 20. Time-zone and calendar ownership rules

- **Owner calendar:** Matt’s primary Google Calendar (configurable calendar id).  
- **Display / compute TZ:** request timezone helpers already used in rituals (`lib/platform/timezone`) — scheduling must use one explicit zone (Matt’s operating zone), not browser guesswork alone.  
- **Work dates** (`plannedForDate`) are day-local; calendar blocks are absolute instants.  
- **Recurring Google events:** treat as busy for freebusy; do not attempt to own recurrence series in v1.  
- **External attendees:** always Level 3.  

---

## 21. Failure modes and recovery

| Failure | User experience | System |
|---|---|---|
| OAuth expired | “Reconnect calendar” | Block writes; allow propose against stale cache only with warning |
| Freebusy timeout | Fewer suggestions + explanation | Soft fail |
| Insert fails | Error on confirm; Work not marked scheduled | `syncState=error` |
| Watch expired | Background renew (later) | Polling fallback |
| Event deleted in GCal | Today/Signals note removal | Clear summary |
| Double submit | Idempotent approve | Single event |
| Policy regression | Deny Level 2 | Force pending-matt |

---

## 22. Phased implementation roadmap

| Phase | Focus | Ships | Does not ship |
|---|---|---|---|
| **25A** | Architecture audit | This document | Code |
| **25B** | Scheduling domain foundation | Collection + types + policy evaluator + approval states + Work summary fields + Activity event names + Flow kinds (stubs wired) | Google OAuth, live freebusy |
| **25C** | Calendar connection (read) | OAuth connect, calendar select, freebusy, availability API for OS | Event writes |
| **25D** | Suggest-only UX | Work detail “Schedule work” → slots + evidence → proposal → Matt approve queue | Auto Level 2 writes |
| **25E** | Approved writes + Level 2 | Confirmed create/update/cancel; extendedProperties; link sync | Full team multi-calendar |
| **25F** | Sync & Signals | Watch + renew + remote move/delete; Today/Context/Signals live | Recurrence ownership |
| **Later** | Heather training + multi-operator calendars | Curriculum + capability UI | Multi-tenancy / Organizations |

---

## 23. Explicit non-goals (Edition 1)

- Building a second calendar product UI (month grid as OS home)  
- Replacing Google Calendar  
- Replacing Work Engine with calendar tasks  
- Organizations / multi-tenancy  
- Client portal control of Matt’s calendar  
- Unrestricted operator write access  
- Page-load AI scheduling  
- Full Drive / Gmail coupling required for v1  
- Owning Google recurrence series  
- Implementing everything in one phase  

---

## 24. Architecture decision record (ADR)

### What remains source of truth?

**Google Calendar** for event existence, times, cancellation, and recurrence expansion (via freebusy/list).  
**Work Engine** for work identity and execution state.  
**Schedule Link collection** for KXD decisions and bindings.

### What data is stored in Payload/Neon?

Schedule links (proposals + active bindings), approval state, sync pointers, audit trail, optional Work summary fields, OAuth connection metadata (later), policy config (code first).

### What is stored on Work?

Existing planning fields. Later: denormalized `scheduleStatus` + active block times + link id. Not full event payloads.

### Is a dedicated scheduling collection required?

**Yes** — for approvals, history, sync state, and multiple attempts. Metadata-only on Work is insufficient for Heather’s approval workflow.

### How are Google event IDs linked?

Local `googleEventId` + `googleCalendarId` on the link; mirrored `extendedProperties.private` on the Google event.

### How are approvals represented?

`approvalState` on the schedule link / proposal record.

### How are permissions evaluated?

Capability grants + Work sensitivity + slot policy → Level 1/2/3. Not Payload `admin`/`editor` alone.

### How is sync state represented?

`syncState` + `lastSyncedAt` + `etag` on the link; connection-level health in integrations sync history.

### How are conflicts represented?

Evidence JSON on proposal; Signals/Activity for founder-visible conflicts; never silent overwrite.

### How are audit events recorded?

Link audit trail + Activity Engine lifecycle events for meaningful founder-facing changes.

### Event moved outside KXD OS?

Sync updates link times and Work summary; if move violates Level 3 policy, raise Signal + optional re-approval.

### Event deleted outside KXD OS?

Mark link `deleted-remotely`; clear Work schedule summary; Signal.

### Scheduled work completed early?

Work completes via existing transitions; Flow runs; calendar event left or optionally patched — policy choice in 25E (default: leave event; don’t auto-delete).

### Scheduled work not completed?

Work remains open; `work.schedule-missed` Signal/Activity; do not auto-reschedule.

### What is synchronous?

Suggest, approve UI, single event write after confirm, path revalidation.

### What is asynchronous?

Watch renewals, incremental sync catch-up, bulk conflict sweeps (after cron exists).

### What is intentionally deferred?

Multi-calendar team routing, recurrence ownership, training exercises, CMS policy editor, portal calendar, AI soft-preference ranking.

---

## 25. Recommended first implementation phase

### Phase 25B — Scheduling Domain Foundation (no Google writes)

**Why first:** Google Calendar code does not exist; Heather’s permission/approval model is the product differentiator; domain foundation can ship and be tested without OAuth risk.

**Include:**

1. Payload collection `work-schedule-links` (or equivalent) + types/services  
2. Work denormalized schedule summary fields  
3. Policy evaluator (Level 1–3) in `lib/scheduling/`  
4. Capability checks (Matt vs future Heather) — even if only Matt has grants initially  
5. Activity event type constants + Operational Flow kind stubs  
6. Admin/service APIs for create proposal / approve / reject (no Google)  
7. Slot suggestions based on **working-hours rules + Work Time Budget + dueDate/plannedForDate** (deterministic), clearly labeled as “availability pending calendar connection” when Google not linked  

**Exclude:**

- OAuth  
- Google API calls  
- Watch channels  
- Executive Today calendar grid  
- Training lessons  
- Platform registry completion until 25B ships (per 25A constraint: no registry update in this phase)

**Exit criteria:**

- Propose → approve → reject works end-to-end in OS  
- Work shows schedule summary states  
- No calendar writes  
- Build + tests for policy matrix (Level 1/2/3)

**Then 25C** connects Google read/freebusy and upgrades the same suggestion engine.

---

## Appendix A — Files inspected (audit sample)

### Google / integrations

- `lib/google-reviews.ts`  
- `lib/live-integrations/google-business.ts`  
- `lib/live-integrations/workspace.ts`  
- `lib/live-integrations/ga4.ts`  
- `lib/live-integrations/search-console.ts`  
- `lib/live-integrations/scheduler.ts`  
- `lib/live-integrations/sync.ts`  
- `lib/live-integrations/types.ts`  
- `lib/integrations/providers.ts`  
- `lib/integrations/types.ts`  
- `app/api/google-reviews/route.ts`  
- `app/api/stripe/webhook/route.ts`  
- `package.json` (no `googleapis`)

### Work Engine

- `payload/collections/Work.ts`  
- `lib/work/types.ts`  
- `lib/work/services.ts`  
- `lib/work/runner.ts`  
- `lib/work/integration/updates.ts`  
- `lib/work/integration/types.ts`  
- `lib/work/planning/*`  
- `lib/work/composer/time-budget.ts`  
- `migrations/20260731_phase24a_work_planned_for_date.ts`  
- `app/api/admin/work/**`

### Auth / users

- `payload/collections/Users.ts`  
- `payload/access/index.ts`  
- `lib/admin/auth.ts`

### Executive layers

- `lib/executive-context/*`  
- `lib/executive-signals/*`  
- `lib/operational-flow/*`  
- `lib/executive-today/*`  
- `lib/executive-workspace/constants.ts`  
- `lib/kxd-intelligence/*`  
- `lib/activity-engine/*`  
- `lib/training/growth-track.ts`

### Portal (boundary)

- `lib/portal/types.ts` (meetings)  
- `lib/portal/modules.ts`

---

## Appendix B — Risks and unresolved questions

1. **Matt’s calendar identity:** Primary calendar vs dedicated “KXD Ops” calendar — product choice affects Heather visibility.  
2. **Personal event privacy:** Free/busy-only vs title visibility for operators.  
3. **Token storage:** Env refresh token vs Payload-encrypted credentials collection.  
4. **Service account vs user OAuth:** Founder calendar likely needs user OAuth; confirm before 25C.  
5. **Role field unused today:** Capability model must not assume Payload `editor` means Heather.  
6. **No cron:** Watch renewal needs a real scheduler before relying on push alone.  
7. **Client-linked Activity skips:** Internal studio work may not appear on timeline — schedule Signals still needed.  
8. **Time Budget vs calendar duration:** Confirm mapping rules (include buffer? travel?).  
9. **Completed-early calendar policy:** Leave vs patch vs delete — decide in 25E.  
10. **Multi-operator later:** Multiple people scheduling onto Matt’s calendar needs clearer subject vs actor separation.

---

## Appendix C — Confirmation

**Phase 25A produced documentation only.**

- No production application behavior changed  
- No dependencies added  
- No schema fields added  
- No migrations created  
- No routes created  
- No UI created  
- No OAuth implemented  
- No Google API calls added  
- Work Engine / Executive Today / KXD Intelligence / registry untouched  

**Artifact created:** `docs/EXECUTIVE-SCHEDULING-ARCHITECTURE.md`
