# Phase 7 — Today

**Status:** Batch A ✅ approved · Batch B ✅ approved · Batch C ✅ implemented · Batch D ✅ implemented · Batch D.1 ✅ implemented  
**Product home:** **Today** (`/admin/operations/today`)  
**Retired product name:** “Command Center” (historical working title only)

---

## Product law

Batch A (Product Architecture), Batch B (Product Consolidation & Home Policy), and Batch C (Home Policy Enforcement) are product law.

Do not redesign them. Implement them faithfully.

### Permanent rule

> When the founder logs into KXD OS, they always begin in **Today**.  
> There is never a second home.

### Cognitive load rule

Whenever there is a choice between adding information and reducing cognitive load, always choose reducing cognitive load. The founder should feel more confident after spending 30 seconds in Today than before opening KXD OS.

### Confidence rule

If there is ever a choice between showing more information and creating more confidence, choose confidence.

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

1. Orientation (greeting + date + posture)  
2. Do This First / Today’s Focus (one primary decision)  
3. My Priorities (≤5)  
4. Today’s Schedule (≤5, always; quiet when empty)  
5. Needs Judgment (exceptions only — render only when true)  
6. What Changed (≤6 signals)  
7. Weekly Snapshot (collapsed) — **Batch F**  
8. Quiet exits into modules  

No new intelligence layer. No parallel loaders. No widget marketplace.

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

### Home ownership law

1. Only Today may be the edition `homeRoute`.  
2. Only Today may be the post-login destination for the founder.  
3. No other product may market itself as morning start, cockpit, command center, or home.  
4. “Command Center” may appear only in internal archaeology — never as OS home identity.  
5. **Client Command** remains a valid per-client HQ name.

---

## Batch C — Home Policy Enforcement (implemented)

**Goal:** Identity and ownership — not redesign.

| Workstream | Result |
|------------|--------|
| Home ownership | `FOUNDER_HOME_PATH` / edition `homeRoute` / login → Today only |
| Navigation | Workflow map: Today · Work · Clients · Business · Studio · System |
| Routing | Founder login → Today; staff guard unchanged |
| Product identity | Competing home labels demoted |
| Module preservation | Destinations untouched |

Verifier: `npm run verify:phase7-batch-c`

---

## Batch D — Experience Design & Presentation Alignment (implemented)

**Goal:** First complete Today experience — compose existing truth beautifully.

Caps, calm empties, quiet exits, and removal of Capture / capacity / end-of-day from the morning surface.

Verifier: `npm run verify:phase7-batch-d`

---

## Batch D.1 — Founder Experience Recomposition (implemented)

**Goal:** Recompose Today so the first emotion is confidence — not report prose.

### First viewport (exact order)

1. **How is my business?** — calm posture line (COO tone)  
2. **What deserves me first?** — one Today’s Focus + one primary action  
3. **Who or what is waiting?** — Waiting For You (actionable only)  
4. **What does my day look like?** — Today’s Flow (Morning / Afternoon / Evening)

### Supporting / background

| Section | Role |
|---------|------|
| Momentum | Emotional reward — movement, not KPIs |
| Also on your desk | Batch A priorities, quieter supporting list |
| Signals | Decision-changing change only (≤3 notable preferred) |
| Quiet exits | Work · Clients · Review Inbox · Focus |

### Language doctrine

- Trusted COO tone  
- Never robotic / analytics / enterprise filler  
- Robotic primary copy rewritten at the presentation layer only  
- Empty states increase confidence (“Nothing is waiting on you.”)

### Architecture preserved

- Same loaders / intelligence / routing / navigation / permissions  
- `lib/executive-today/recomposition.ts` is presentation-only  

### Key files

| Area | Path |
|------|------|
| Today screen | `components/admin/executive-today/ExecutiveTodayScreen.tsx` |
| Recomposition | `lib/executive-today/recomposition.ts` |
| Presentation contracts | `lib/executive-today/presentation.ts` |
| Loader | `lib/executive-today/load.ts` |
| Styles | `design-system/os/styles/kxd-os.css` |
| Verifiers | `verify:phase7-batch-d`, `verify:phase7-batch-d1` |

### Verification

```bash
npm run verify:phase7-batch-c
npm run verify:phase7-batch-d
npm run verify:phase7-batch-d1
npm run verify:executive-today-calendar
```

---

## Remaining batches

| Batch | Purpose |
|-------|---------|
| **E** | Absorb / retire demoted surfaces |
| **F** | Weekly Snapshot ownership on Today |
| **G** | Connect unread exception seam (gated) |

**Stop point:** Batch D.1 complete. Do not begin Batch E until authorized.
