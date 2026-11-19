# Founder Hybrid Premium — Phase 1 validation

**Date:** 2026-11-16  
**Worktree:** `.worktrees/founder-hybrid-phase1`  
**Visual approval:** Not granted (validation only)

## Build and TypeScript

| Check | Result |
|-------|--------|
| `npm install` (local worktree) | **OK** |
| `npx tsc --noEmit` | **PASS** (exit 0) |
| `npm run build` | **PASS** (exit 0) |
| `verify:runtime-contract` | **PASS** (106/106) |
| `verify:phase3-operator-containment` | **PASS** |

## Experience verifiers (investigation)

| Verifier | Result | Verdict |
|----------|--------|---------|
| `verify:experience-phase2-batch-b` | **FAIL** | **Outdated assertions** + **intentional UI swap** |
| `verify:phase7-batch-d` | **FAIL** | **Outdated path assertions** + **intentional UI swap** |

**Path drift (not missing functionality):** Scripts read `app/admin/operations/today/page.tsx` and `.../today/loading.tsx`. Real routes live at `app/admin/operations/(studio)/today/*`. Loading and page exist; verifiers were never updated for the `(studio)` route group.

**Page mount assertion:** Both verifiers require `ExecutiveTodayScreen` on the Today page. Phase 1 intentionally mounts `FounderHybridTodayScreen` while keeping `ExecutiveTodayScreen.tsx` in the codebase. This is **not** a backend or data regression; it is a **presentation change** pending product approval.

**No missing auth, loaders, or home policy:** `loadExecutiveToday`, `FOUNDER_HOME_PATH`, and arrival `loading.tsx` are unchanged in location and behavior.

## Founder-only flag (staff / portal)

| Surface | Hybrid active? | Evidence |
|---------|----------------|----------|
| Founder `OperationsShell` (`variant="full"`) | Yes when `FOUNDER_HYBRID_SHELL_ENABLED` | `OperationsShell.tsx`: `founderHybrid = flag && !isStaff` |
| Staff shell (`variant="staff"`) | **No** | Same guard; staff keeps `OperationsSidebarNav` |
| Client portal | **No** | No `founder-hybrid` imports under `app/(portal)/` |
| CSS scope | Operations layout only | `founder-hybrid.css` imported in `app/admin/operations/layout.tsx` only |

## ExecutiveTodayScreen → FounderHybridTodayScreen regression matrix

| Original capability | Hybrid Today | Status |
|---------------------|--------------|--------|
| Greeting, posture, day sentence | Header | **Preserved** |
| Primary move + WhyThisDisclosure | Priority card | **Preserved** |
| Calm day → Focus “Begin the day” when no `primary.href` | Missing | **Regression** |
| `data-today-primary-move` marker | Missing | **Regression** (verifier / analytics) |
| Waiting for you | Work panel | **Preserved** |
| Commercial items | Sales panel | **Preserved** |
| Opportunities | Sales panel | **Preserved** |
| Day flow / schedule | Schedule panel | **Preserved** (see calendar link note) |
| Momentum + day shape | Footer | **Preserved** |
| Priorities (“Also on your desk”) | Work panel | **Preserved** (`xp.priorities` ⊆ `data.focus`) |
| Signals (`xp.signals`, decision-filtered) | Not shown; raw `data.activity` in Client activity | **Regression** (different slice) |
| `TODAY_QUIET_EXITS` quick nav | Missing | **Regression** |
| `data.intelligence` headline/summary | Not surfaced | **Omission** (data available, not shown) |
| Ritual shell / `data-experience="clear"` | OperationsShell dashboard | **Intentional** (design direction) |
| Arrival loading UI | Still at `(studio)/today/loading.tsx` | **Preserved** (route-level) |
| External calendar links `target=_blank` | Internal `<Link>` only | **Possible regression** |

## Primary navigation (unauthenticated probe)

Dev server: `http://localhost:3012`  
`/admin/operations/today` → **307** to `/admin/login?redirect=%2Fadmin%2Foperations%2Ftoday` (expected).

Authenticated click-through of primary nav **not performed** in this run (no credentials in agent session).

## Browser / screenshots — **Today not captured**

Automated browser session **does not have Payload admin credentials**. All attempts to open Today redirect to login.

**Captured (auth gate only, not Today):**

- `docs/founder-hybrid-phase1/screenshots/validation-auth-gate-1440.png`
- `docs/founder-hybrid-phase1/screenshots/validation-auth-gate-1920.png` (viewport capture unusable / black frame)
- `docs/founder-hybrid-phase1/screenshots/validation-auth-gate-390.png`

**Do not use** `before-desktop-reference.jpg` / `after-desktop-reference.jpg` for approval; those are earlier direction mockups.

### Manual Today capture procedure

```bash
cd ".worktrees/founder-hybrid-phase1"
# .env.local copied from parent for local dev only (not committed)
npm run dev
# open http://localhost:3012/admin/login
# sign in with Payload users collection operator account
# land on http://localhost:3012/admin/operations/today
```

Capture at **1440×900**, **1920×1080**, and **390×844** (save as `today-desktop-1440.png`, etc.).

## Visual / UX risks (code review, pending live Today)

1. **Mobile:** Sidebar becomes full-width block; no collapse menu; long page with platform tools expanded.
2. **Density:** Four metrics + four panels can exceed viewport height vs ritual “first viewport clarity”.
3. **Contrast:** Graphite sidebar (`#2b2b2e`) with muted text should be checked against WCAG on device.
4. **Next.js dev overlay:** Login screenshot showed **“1 Issue”** dev indicator; confirm no production build errors (production `build` passed).

## Proposed corrections **before** design approval (no code applied in this validation)

1. Restore calm-state Focus CTA when `!xp.primary.href`.
2. Add `data-today-primary-move="true"` on primary link.
3. Restore `TODAY_QUIET_EXITS` (or equivalent footer quick links).
4. Add **Signals** panel using `xp.signals`, keep **Client activity** distinct or merge with clear labeling.
5. Calendar-only links: `target="_blank"` + `rel="noreferrer"` when `calendarHtmlLink` without `workHref`.
6. Optional: surface `data.intelligence.headline` in header subline.
7. Mobile: collapsible sidebar or top nav pattern before ship.

---

**Status:** Stop here. Awaiting founder visual approval after manual authenticated Today review.