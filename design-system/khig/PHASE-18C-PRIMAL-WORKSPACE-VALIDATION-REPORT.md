# Phase 18C — Primal Motorsports Client Workspace Validation Report

**Edition 1 · Production Readiness Pass**  
**Date:** June 25, 2026  
**Scope:** Validate Primal Motorsports end-to-end client workspace — no architecture changes, no intelligence changes.

---

## Purpose

Phase 18C confirms that **Primal Motorsports** is correctly connected and ready for **Adam** and **Tyler** to use KXD OS for website review and collaboration.

This was a validation and polish pass — not a redesign. Existing CES, portal, review inbox, and timeline systems were audited as-is.

---

## Systems Reviewed

| System | Location | Status |
|--------|----------|--------|
| Client record | `clients` · slug `primal-motorsports` | ✔ Active |
| CES Experience Profile | `lib/ces/profile/primal.ts` · `client-experience-profiles` | ✔ Active |
| Portal authentication | `lib/portal/session.ts` · `/portal/login` | ✔ Scoped per client |
| Portal Access admin | `/admin/operations/portal-access` | ✔ Ready |
| Connected Workspace | `lib/portal/connected-workspace.ts` | ✔ Website Review wired |
| Website Review (portal) | `/portal/website-review/*` | ✔ Module enabled |
| Review Inbox (admin) | `/admin/operations/review-inbox` | ✔ Filters `website-review` |
| Timeline / activity | `client-activity` hooks · `executive-timeline-events` | ✔ Client-safe events |
| Portal readiness script | `npm run verify:primal-portal` | ✔ Passes after fix |
| CES launch safety | `lib/portal/ces-launch-safety.ts` | ✔ Hides unfinished nav |

---

## Validation Results

### Admin side

**Client record**

- Name: Primal Motorsports
- Slug: `primal-motorsports`
- Status: active
- Website: `https://primalmotorsports.com`
- Brand tier: flagship

**Workspace connection**

- Active CES profile: *Primal Motorsports Experience*
- Accent: `#A83424`
- Enabled modules: `website-review` only
- Terminology and launch copy aligned in `lib/ces/profile/primal.ts`

**Portal users**

| User | Email | Active | Welcome |
|------|-------|--------|---------|
| Adam | `adam.boatman@primalmotorsports.com` | ✔ | ✔ Complete |
| Tyler | `tyler.edwards@primalmotorsports.com` | ✔ | Pending first login |

Additional test accounts exist (`matt.primal@kxd.local`, `matt@kreatebydesign.com`, etc.) — see Remaining Items.

**Projects / deliverables**

- No `client-projects` records for Primal in the database.
- No `monthly-deliverables` records.
- CES launch mode correctly hides deliverables/projects nav for Website Review–only clients.

**Review workflow**

- 3 `client-requests` with `experienceModule: website-review` present.
- Submissions create `client-requests`, spawn work items, and notify review inbox.
- Status changes publish `website-review.*` timeline events (client-visible when `internalOnly: false`).

**Activity / timeline**

- Recent Primal timeline includes `website-review.in-review` and `website-review.completed` events.
- Internal infrastructure events are filtered from client portal via `isClientSafeTimelineDoc`.

### Client side

**Login**

- `/portal/login` with forgot/reset password routes present.
- Session scoped to portal user → single client (`getPortalSession` enforces `active` and client relationship).

**Workspace access**

- Portal layout resolves CES profile per session (`resolveExperienceProfile`).
- Tyler will see `/portal/welcome` on first login (`welcomeCompletedAt` not set) — expected onboarding.

**Website review**

- Landing: `/portal/website-review`
- Visual review: `/portal/website-review/session/new` (iframe loads `companyWebsite`)
- Submit revision: `/portal/website-review/request`
- Detail: `/portal/website-review/[requestId]`

**Feedback capture**

- `POST /api/portal/website-review` writes `client-requests` with `experienceModule: website-review`, attachments, review context, and spawns work.

**Revision clarity**

- Primal launch guide on portal home (`CesPortalLaunchGuide`) explains 4-step flow.
- CES launch safety hides unrelated portal nav (projects, requests, assets, etc.) so clients are not sent to unfinished modules.
- Quick actions limited to review website + start revision for flagship CES clients.

**Internal visibility**

- Review Inbox at `/admin/operations/review-inbox` surfaces website-review requests.
- Status API and workspace detail at `/admin/operations/review-inbox/[id]`.
- Portal Access screen shows Primal production candidate banner with readiness checklist.

---

## Findings

### Blocker (fixed)

**Payload CLI scripts failed with `server-only` import error**

`payload/hooks/work.ts` imported from `@/lib/work/integration` barrel, which re-exported modules marked `server-only`. This broke:

- `npm run verify:primal-portal`
- `npm run seed:clients`
- `npm run seed:primal-experience`
- All Payload CLI / tsx scripts loading `payload.config`

**Fix applied:** Direct hook imports from payload-safe integration modules; removed `server-only` from hook-used files `events.ts` and `relationships.ts` (matching existing pattern in `financial-command/timeline-publish.ts`).

### Non-blocking (operational)

| Item | Notes |
|------|-------|
| Tyler welcome pending | First login routes to `/portal/welcome` — by design |
| Test portal users | 3 non-production accounts active; deactivate before external go-live |
| RESEND not configured | Dev: reset links log to console. Production: set `RESEND_API_KEY` |
| No deliverables/projects | Not required for Website Review pilot; CES hides those surfaces |
| Request #1 status `triaged` | Open item in Review Inbox — operational, not a system defect |
| Vercel upload adapter warning | `client-review-media` needs storage adapter in production deploy |

---

## Fixes Made

| File | Change |
|------|--------|
| `payload/hooks/work.ts` | Direct imports from `events` and `relationships` — avoid barrel loading `server-only` |
| `lib/work/integration/events.ts` | Marked payload-safe; removed `server-only` |
| `lib/work/integration/relationships.ts` | Marked payload-safe; removed `server-only` |

No architecture changes. No intelligence layer changes. No duplicate systems created.

---

## Remaining Items (before external go-live)

1. **Deactivate test portal users** — keep only Adam and Tyler (and any agreed KXD oversight account).
2. **Confirm Tyler completes welcome** on first login.
3. **Set RESEND** in production for password reset emails.
4. **Confirm blob storage** for `client-review-media` attachments on Vercel.
5. **Share portal URL and credentials** with Adam and Tyler via secure channel.
6. **Triage open revision** (request #1) in Review Inbox if still relevant.

---

## Client Readiness Status

### **READY** — core config validated

`npm run verify:primal-portal` exit code **0** after fix:

- ✔ Client record
- ✔ CES profile active
- ✔ Website Review enabled
- ✔ Brand accent configured
- ✔ Portal users active (5 total; Adam + Tyler confirmed)
- ✔ Website URL configured

Adam can log in immediately. Tyler will complete a one-time welcome screen, then has full Website Review access.

---

## Files Reviewed

**Core Primal / CES**

- `lib/ces/profile/primal.ts`
- `lib/ces/copy/portal-language.ts`
- `lib/ces/modules/website-review/*`
- `lib/ces/server.ts` · `lib/ces/profile/resolve.ts`
- `lib/portal/readiness.ts` · `lib/portal/access-data.ts`
- `lib/portal/connected-workspace.ts` · `lib/portal/ces-launch-safety.ts`
- `lib/portal/session.ts` · `lib/portal/welcome.ts` · `lib/portal/nav.ts`

**Portal routes & components**

- `app/(portal)/portal/(auth)/*`
- `app/(portal)/portal/(app)/*`
- `app/(portal)/portal/(welcome)/welcome/page.tsx`
- `app/api/portal/website-review/route.ts`
- `components/ces/portal/CesPortalHome.tsx`
- `components/ces/portal/CesPortalLaunchGuide.tsx`

**Admin**

- `app/admin/operations/portal-access/page.tsx`
- `app/admin/operations/review-inbox/*`
- `components/admin/operations/portal-access/PortalAccessScreen.tsx`

**Data & hooks**

- `payload/collections/PortalUsers.ts` · `ClientRequests.ts` · `ClientExperienceProfiles.ts`
- `payload/hooks/client-activity.ts` · `portal-users.ts` · `work.ts`
- `lib/website-review-inbox/*`
- `lib/client-command/activity/website-review.ts`
- `scripts/verify-primal-portal-readiness.ts`
- `scripts/seed-primal-experience-profile.ts` · `seed-clients.ts` · `seed-portal-user.ts`

---

## Build Status

```
npm run build — PASSED
```

---

## Acceptance Criteria

| Criterion | Met |
|-----------|-----|
| Primal workspace ready for Adam and Tyler | ✔ |
| No architecture changes | ✔ |
| No intelligence changes | ✔ |
| No duplicate systems | ✔ |
| Build passes | ✔ |

---

*Phase 18C complete. Primal Motorsports is connected to KXD OS Website Review with validated admin and client paths.*
