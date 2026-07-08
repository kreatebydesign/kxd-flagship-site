# Phase 18E — Client Portal Experience Polish Report

**Edition 1 · Launch Readiness UX Pass**  
**Date:** June 25, 2026  
**Scope:** Client portal polish — no architecture changes, no intelligence changes, no new features.

---

## Purpose

Phase 18E prepares the external client portal for real usage. Primal Motorsports validated the workflow in Phase 18C; this phase makes the experience feel **premium, clear, and effortless** for Primal and every future CES client.

No new systems. No Primal-specific UI logic. Copy and presentation improvements only.

---

## Audit Findings

### What was already strong

| Area | Assessment |
|------|------------|
| Portal routes | `/portal`, `/portal/website-review/*`, `/portal/welcome` — complete |
| CES launch mode | `lib/portal/ces-launch-safety.ts` hides unfinished nav modules |
| Website Review flow | 3-step request flow with attachments and visual review session |
| Review inbox connection | Submissions create `client-requests` with `experienceModule: website-review` |
| Loading state | Shimmer skeleton on portal app routes |
| Connected Workspace | Composes website, work, activity panels from existing loaders |

### Gaps identified

| Issue | Impact |
|-------|--------|
| Launch guide hardcoded to Primal slug | Future clients would not see getting-started guidance |
| Home eyebrow hardcoded to Primal | Non-reusable; bypassed CES terminology |
| Internal language ("inbox", "Client HQ") | Felt like admin software, not collaboration workspace |
| Welcome screen lacked purpose clarity | First login did not explain what the workspace is for |
| Disabled quick actions shown as grey cards | Visual clutter in CES launch mode |
| Empty deliverables panel in launch mode | Confusing empty section when module not ready |
| Generic empty states | Technically correct but not guiding |
| Request flow step labels ("Focus", "Confirm") | Slightly internal / software-like |

---

## Improvements Made

### 1. Centralized client language (`lib/ces/copy/portal-language.ts`)

Single source of truth for all portal copy updates:

- **Workspace purpose** — home lead explains review, feedback, and tracking
- **Welcome** — purpose heading + 3-step orientation; collaboration framing (not dashboard)
- **Launch steps** — removed "inbox" reference; client-facing "we'll keep you updated here"
- **Empty states** — actionable guidance (e.g. "Submit your first website review request…")
- **Connected workspace** — "Current updates", "Your website", "Quick actions" (sentence case)
- **Website Review request** — clearer title, lead, and flow step labels
- **Confirmation** — "Reference" instead of "Revision no."

### 2. Welcome experience (`CesPortalWelcome.tsx`)

- Added **"What you can do here"** ordered list before CTAs
- Updated button labels: "Review your website" / "Go to workspace"
- CSS for purpose steps in `kxd-ces.css`

### 3. Launch guide — generalized (`CesPortalLaunchGuide.tsx`)

**Before:** `profile.identity.clientSlug === PRIMAL_CLIENT_SLUG`  
**After:** `isCesFlagshipPortal(profile)` — any client with Website Review in CES launch mode

Primal benefits automatically; no special-case code.

### 4. Portal home — de-Primalized (`CesPortalHome.tsx`)

- Removed `PRIMAL_CLIENT_SLUG` import and hardcoded eyebrow
- Uses CES profile terminology for all clients
- CSS class `kxd-ces-portal-home--flagship` (with `--primal` alias retained in CSS)

### 5. Connected workspace — reduced clutter (`CesConnectedWorkspace.tsx`)

- Quick actions: **only enabled actions** shown (no disabled "Coming soon" cards)
- Deliverables panel: **hidden** when CES launch mode has no deliverables to show

### 6. Website Review request flow (`WebsiteReviewRequestFlow.tsx`)

- Step labels: "What to change" → "Your notes" → "Review & send"

### 7. Shell fallback (`ClientHqShell.tsx`)

- Default sidebar label: "Your workspace" (was "Client HQ")

### 8. Loading state (`app/(portal)/portal/(app)/loading.tsx`)

- Uses `PORTAL_CLIENT_LANGUAGE.loadingWorkspace` constant

### 9. Primal profile terminology (`lib/ces/profile/primal.ts`)

- Launch step 4 aligned with global client language (no "inbox")

---

## Client Experience Changes

| Moment | Before | After |
|--------|--------|-------|
| First login | Generic welcome | Purpose-oriented with 3 clear capabilities |
| Workspace home | Primal-only launch guide | All CES flagship clients see guide |
| Empty work panel | Brief generic message | Guides to first review request |
| Empty activity | Passive "workspace is ready" | Explains when updates will appear |
| Quick actions | 4 items, 2 disabled | 2 enabled actions only |
| Submit feedback | "Start a revision" / "Focus" | "Submit website feedback" / "What to change" |
| Internal terms | "inbox", "Client HQ" | Removed from client-facing copy |

---

## Reusable Patterns

| Pattern | Location | Reuse |
|---------|----------|-------|
| `PORTAL_CLIENT_LANGUAGE` | `lib/ces/copy/portal-language.ts` | All portal copy — override per client via CES terminology |
| `isCesFlagshipPortal()` | `lib/portal/ces-launch-safety.ts` | Launch guide, nav hiding, quick actions |
| `portalCopy(t, key, fallback)` | `portal-language.ts` | Profile terminology with safe fallbacks |
| Enabled-only quick actions | `CesConnectedWorkspace.tsx` | Any CES launch client |
| Welcome purpose steps | `CesPortalWelcome.tsx` | All first-login users |

---

## Architecture Impact

| Area | Changed? |
|------|----------|
| Intelligence pipeline | No |
| Observer / Brain / Pulse / Narrative / Context / Memory | No |
| Portal auth / session | No |
| Website Review API / data layer | No |
| Review inbox | No |
| CES profile resolution | No |
| New routes or collections | No |

**Impact:** Presentation and copy layer only. Existing workflows preserved.

---

## Future Recommendations

1. **Welcome completion** — Tyler (and any pending users) complete `/portal/welcome` before go-live
2. **CES terminology seeds** — New clients inherit polished defaults from `buildDefaultCesProfileData()` (Phase 18D)
3. **Deliverables module** — When enabled for a client, deliverables panel reappears automatically via `showDeliverablesLink`
4. **Visual review session** — Consider a one-line hint on first visual review open (no code change required in this phase)
5. **Legacy `PortalNav.tsx`** — Unused by ClientHqShell; safe to deprecate in a future cleanup pass

---

## Files Modified

| File | Change |
|------|--------|
| `lib/ces/copy/portal-language.ts` | Client-facing copy polish |
| `lib/ces/profile/primal.ts` | Launch step 4 terminology |
| `components/ces/portal/CesPortalWelcome.tsx` | Purpose steps on welcome |
| `components/ces/portal/CesPortalHome.tsx` | De-Primalized; flagship class |
| `components/ces/portal/CesPortalLaunchGuide.tsx` | `isCesFlagshipPortal` gate |
| `components/ces/portal/CesConnectedWorkspace.tsx` | Clutter reduction |
| `components/ces/modules/website-review/WebsiteReviewRequestFlow.tsx` | Flow step labels |
| `components/client-hq/ClientHqShell.tsx` | Workspace fallback label |
| `app/(portal)/portal/(app)/loading.tsx` | Shared loading copy |
| `design-system/ces/styles/kxd-ces.css` | Welcome purpose + flagship CSS |

---

## Build Status

```
npm run build — PASSED
TypeScript — clean
```

---

## Acceptance Criteria

| Criterion | Met |
|-----------|-----|
| Client portal feels launch-ready | ✔ |
| Existing workflows preserved | ✔ |
| Primal not a special case in UI | ✔ |
| No architecture drift | ✔ |
| No duplicate systems | ✔ |
| Build passes | ✔ |

---

*Phase 18E complete. The client portal reads as a professional collaboration workspace — calm, clear, and ready for Adam, Tyler, and every future client.*
