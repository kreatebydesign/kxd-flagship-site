# Phase 18D — Client Launch Readiness Foundation Report

**Edition 1 · Repeatable Launch Pattern**  
**Date:** June 25, 2026  
**Scope:** Reusable client launch readiness system — no platform redesign, no intelligence changes.

---

## Purpose

Phase 18C validated **Primal Motorsports** as the first external client workspace. Phase 18D generalizes that validation into a **repeatable Client Launch Readiness pattern** every future client can use.

Primal remains the first example — not a special-case system.

---

## Launch Path

```
Client created
      ↓
Workspace configured (CES profile active)
      ↓
Modules enabled
      ↓
Portal access created
      ↓
Website Review ready (when enabled)
      ↓
Welcome experience complete (optional for core go-live)
      ↓
Client ready for collaboration
```

---

## Architecture

```
Existing systems (reused)
├── clients collection
├── client-experience-profiles
├── portal-users
├── client-onboarding (intake — separate concern)
└── lib/portal/readiness.ts (adapter)

New foundation
└── lib/client-launch/
    ├── types.ts        — readiness model + existing wizard types
    ├── checklist.ts    — canonical launch steps
    ├── validators.ts   — blocker/warning rules
    ├── defaults.ts     — reusable CES profile defaults
    ├── readiness.ts    — evaluate + load from Payload
    └── index.ts        — public exports
```

**Entry points:**

```typescript
import {
  evaluateClientLaunchReadiness,
  loadClientLaunchReadiness,
  loadClientLaunchReadinessBySlug,
  buildDefaultCesProfileData,
} from "@/lib/client-launch";
```

**CLI:**

```bash
npm run verify:client-launch -- --client primal-motorsports
npm run verify:client-launch -- --id 1
```

---

## Readiness Model

```typescript
type ClientLaunchReadiness = {
  clientId: number;
  clientName: string;
  clientSlug: string | null;

  workspaceReady: boolean;
  portalReady: boolean;
  usersReady: boolean;
  modulesReady: boolean;
  welcomeReady: boolean;
  reviewReady: boolean;

  overallStatus: "not_ready" | "in_progress" | "ready";
  blockers: LaunchBlocker[];
  checklist: LaunchChecklistItem[];
};
```

### Status semantics

| Status | Meaning |
|--------|---------|
| `not_ready` | Blockers present — cannot go live |
| `in_progress` | Core config valid; optional steps incomplete (e.g. welcome pending) |
| `ready` | All required checklist steps complete |

### Primal validation (post-18D)

```
Overall: IN_PROGRESS
✔ workspaceReady · portalReady · usersReady · modulesReady · reviewReady
○ welcomeReady (2 users pending welcome — warning only)
```

Core collaboration is available; full `ready` status awaits welcome completion.

---

## Systems Reused (not duplicated)

| System | Role |
|--------|------|
| `lib/portal/readiness.ts` | Thin adapter over client-launch for Portal Access |
| `lib/portal/access-data.ts` | Now passes welcome-pending counts into evaluation |
| `lib/client-onboarding.ts` | Intake readiness — separate from portal launch |
| `lib/ces/profile/primal.ts` | Brand overrides for first pilot — not runtime special case |
| `scripts/verify-primal-portal-readiness.ts` | Retained; uses portal adapter |

---

## Files Created

| File | Purpose |
|------|---------|
| `lib/client-launch/checklist.ts` | 7-step launch checklist |
| `lib/client-launch/validators.ts` | Client, CES, portal user, review, env rules |
| `lib/client-launch/defaults.ts` | `buildDefaultCesProfileData()` for new clients |
| `lib/client-launch/readiness.ts` | Evaluate, load, env helpers |
| `lib/client-launch/index.ts` | Package exports |
| `scripts/verify-client-launch-readiness.ts` | Generic CLI verification |

## Files Modified

| File | Change |
|------|--------|
| `lib/client-launch/types.ts` | Added launch readiness types |
| `lib/portal/readiness.ts` | Delegates to client-launch evaluation |
| `lib/portal/access-data.ts` | Welcome-pending user tracking |
| `package.json` | Added `verify:client-launch` script |

---

## Defaults Pattern

`buildDefaultCesProfileData()` provides reusable CES profile defaults:

- KXD OS dark palette + configurable accent
- Website Review module enabled by default
- Portal terminology from `PORTAL_CLIENT_LANGUAGE`
- Client-name-aware workspace labels

Primal's profile remains in `lib/ces/profile/primal.ts` as brand-specific overrides on top of this pattern.

---

## What Was Not Changed

- Observer, Business Brain, Pulse, Executive Narrative, Business Context, Business Memory
- Portal UI / CES components
- Client Launch Wizard (intake workflow)
- Intelligence layers

---

## Build Status

```
npm run build — PASSED
npm run verify:client-launch -- --client primal-motorsports — PASSED (core, exit 0)
```

---

## Acceptance Criteria

| Criterion | Met |
|-----------|-----|
| Reusable launch readiness model | ✔ |
| Not Primal-specific | ✔ |
| Reuses existing systems | ✔ |
| No duplicate readiness logic | ✔ (portal adapter) |
| No intelligence changes | ✔ |
| Build passes | ✔ |

---

*Phase 18D complete. Future clients follow the same launch path — configure workspace, enable modules, create portal access, verify readiness.*
