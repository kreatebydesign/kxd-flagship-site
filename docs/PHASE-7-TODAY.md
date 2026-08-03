# Phase 7 — Today

**Status:** Batch A ✅ approved · Batch B ✅ approved · Batch C ✅ implemented  
**Product home:** **Today** (`/admin/operations/today`)  
**Retired product name:** “Command Center” (historical working title only)

---

## Product law

Batch A (Product Architecture) and Batch B (Product Consolidation & Home Policy) are product law.

Do not redesign them. Implement them faithfully.

### Permanent rule

> When the founder logs into KXD OS, they always begin in **Today**.  
> There is never a second home.

### Cognitive load rule

Whenever there is a choice between adding information and reducing cognitive load, always choose reducing cognitive load. The founder should feel more confident after spending 30 seconds in Today than before opening KXD OS.

### Identity doctrine (summary)

| Today is | Today is not |
|----------|--------------|
| The operating system home | A dashboard |
| The morning answer to “What needs my attention today?” | Work itself |
| A calm orientation layer | A KPI wall / notification center |
| A composition over existing truth systems | A second CRM or AI chat |

**Today owns attention. Modules own depth.**

---

## Batch A — Product Architecture (approved)

Defines the permanent Today section model and module placement rules:

1. Primary decision  
2. My Priorities (≤5)  
3. Today’s Schedule  
4. Exceptions (only when true)  
5. What changed (≤6 signals)  
6. Weekly Snapshot (collapsed)  
7. Quiet exits into modules  

No new intelligence layer. No parallel loaders. No widget marketplace.

Full architecture decisions were approved in the Batch A product session and remain unchanged.

---

## Batch B — Product Consolidation & Home Policy (approved)

### Consolidation decisions

| Product | Decision |
|---------|----------|
| **Today** (was Executive Today) | Sole home |
| Morning Brief | Merge into Today |
| Focus / Weekly Review | Ritual destinations |
| Executive Dashboard | Demote — never home |
| Operations Command | Retire product identity; demote |
| Founder Studio | Demote — absorb later |
| Founder Intelligence | Merge / absorb later |
| KXD Brain | Demote — specialist destination |
| Intelligence | Keep — deep briefings |
| Staff Home | Keep — separate persona |

### Navigation philosophy

```
Today · Work · Clients · Business · Studio · System
```

Allowed near Today: Focus, Weekly Review, Intelligence.  
Not peers of Today: Executive, Founder, Founder Intelligence, Brain, Operations Command.

### Home ownership law

1. Only Today may be the edition `homeRoute`.  
2. Only Today may be the post-login destination for the founder.  
3. No other product may market itself as morning start, cockpit, command center, or home.  
4. “Command Center” may appear only in internal archaeology — never as OS home identity.  
5. **Client Command** remains a valid per-client HQ name.

---

## Batch C — Home Policy Enforcement & Today Foundation (implemented)

**Goal:** Identity and ownership — not redesign.

### Implemented

| Workstream | Result |
|------------|--------|
| Home ownership | `FOUNDER_HOME_PATH` / edition `homeRoute` / `OPERATIONS_HOME_PATH` → Today only |
| Navigation | Workflow map: Today first; competitors demoted under Business/System |
| Routing | Founder login fallback → Today; `/admin/operations` + `/brief` → Today; staff guard unchanged |
| Product identity | User-facing Dashboard / Command Center / Founder Studio / Executive / Brain home labels retired or demoted |
| Module preservation | Work, Clients, Intelligence, Review Inbox, Client Command, Calendar, Reports, Commercial, Connect untouched as destinations |
| Technical cleanup | Duplicate home ownership removed from edition default + login fallback + search pins |

### Explicitly not in Batch C

- Today visual redesign  
- New cards / widgets / KPIs / AI / charts  
- Absorb/retire redirects for demoted surfaces (Batch E)  
- Weekly Snapshot ownership (Batch F)  
- Connect seam on Today (Batch G)

### Key files

| Area | Path |
|------|------|
| Home policy | `lib/admin/home-policy.ts` |
| Home constant | `lib/admin/constants.ts`, `lib/admin/os-home.ts` |
| Edition homeRoute | `lib/editions/navigation.ts` |
| Navigation | `components/admin/operations/shared/operations-nav.ts` |
| Login landing | `components/admin/KxdAdminLoginForm.tsx`, `KxdAdminLoginView.tsx` |
| Verifier | `scripts/verify-phase7-batch-c.ts` |

### Verification

```bash
npm run verify:phase7-batch-c
```

---

## Remaining batches

| Batch | Purpose |
|-------|---------|
| **D** | Today presentation alignment to Batch A section model |
| **E** | Absorb / retire demoted surfaces |
| **F** | Weekly Snapshot ownership on Today |
| **G** | Connect unread exception seam (gated) |

**Stop point:** Batch C complete. Do not begin Batch D until authorized.
