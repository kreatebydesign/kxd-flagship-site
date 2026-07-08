# Phase 18F — Production Launch Readiness Audit Report

**Edition 1 · External Client Safety & Reliability**  
**Date:** June 25, 2026  
**Scope:** Production readiness audit for real client usage — no architecture changes, no intelligence changes, no new features.

---

## Purpose

Phase 18F confirms KXD OS is **safe, reliable, and professional** for external clients using the portal. Primal Motorsports is the first validated workspace. This audit improves launch confidence without expanding scope.

---

## Systems Audited

| Area | Files / systems reviewed |
|------|--------------------------|
| Authentication | `app/api/portal/auth/*`, `lib/portal/session.ts`, `middleware.ts` |
| Client permissions | `getPortalSession()`, CES queries, middleware admin gates |
| Website Review | `app/api/portal/website-review/*`, `lib/ces/modules/website-review/*` |
| Review Inbox | `lib/website-review-inbox/*`, `app/admin/operations/review-inbox/*` |
| Email | `lib/portal/email.ts`, `lib/website-review-inbox/notify.ts` |
| Storage | `payload/collections/ClientReviewMedia.ts`, attachment serve route |
| Production env | `payload.config.ts`, build warnings, integration registry |
| Error handling | Portal API routes, CES components, loading states |
| Launch readiness | `npm run verify:client-launch -- --client primal-motorsports` |

---

## Findings Summary

| Severity | Count | Theme |
|----------|-------|-------|
| Blocker (ops) | 2 | Production env + attachment storage on Vercel |
| Warning | 5 | Email config, test users, welcome pending, notifications |
| Info | 4 | Strong isolation patterns, good client error copy |
| Passed | 12 | Core workflows verified |

---

## Authentication

### Verified ✅

| Check | Result |
|-------|--------|
| Portal login | `POST /api/portal/auth/login` — Payload auth on `portal-users` |
| Session cookie | HMAC-signed `kxd-portal-session`, httpOnly, secure in production, 7-day max age |
| Inactive users blocked | `active === false` returns 403 with client-safe message |
| Password reset flow | Forgot → token → reset routes present |
| Reset validation | Min 8 chars; expired/invalid token returns clear message |
| Welcome flow | `needsPortalWelcome()` redirects to `/portal/welcome`; completion via API |
| Middleware gate | `/portal/*` (except login/forgot/reset) requires session cookie |
| Email enumeration | Forgot-password always returns `{ ok: true }` |

### Risks ⚠️

| Risk | Detail |
|------|--------|
| **RESEND not configured** | Password reset emails will not send in production (dev logs link to console) |
| **PAYLOAD_SECRET required** | `payload.config.ts` has dev fallback secret — must set `PAYLOAD_SECRET` in production |
| **Middleware cookie-only check** | Middleware checks cookie presence; signature validated server-side per request (acceptable) |

### Fixes completed

- `forgot-password/route.ts` — production `console.warn` when `RESEND_API_KEY` missing (ops visibility)
- `login/route.ts` — dev seed hint generalized (`--client <client-slug>` instead of Primal hardcode)

---

## Client Permissions

### Verified ✅

| Check | Result |
|-------|--------|
| Session → client binding | `getPortalSession()` resolves `clientId` from portal user relationship |
| Website Review scoping | `getWebsiteReviewRequestsForClient(clientId)` + `getWebsiteReviewById` filters by client |
| Attachment access | Upload/delete/serve verify `rowClientId === session.clientId` |
| Attachment validation | `validateAttachmentIdsForClient` on submit |
| Admin isolation | `/admin/operations/*` requires Payload auth cookie via middleware |
| Admin API isolation | `/api/admin/*` returns 401 without Payload session |
| CES launch mode | `isPortalNavVisibleForCesLaunch` hides unfinished modules |
| Portal user deactivation | Deactivated users get `null` session |

### Risks ⚠️

| Risk | Detail |
|------|--------|
| **Test portal accounts** | 3 non-production Primal portal users still active — deactivate before external go-live |
| **Legacy PortalNav** | `components/portal/PortalNav.tsx` unused by ClientHqShell — no security impact |

### Passed

Client isolation is consistently enforced at API and data-loader layers. No cross-client data leakage paths found in Website Review workflow.

---

## Website Review

### Verified ✅

| Check | Result |
|-------|--------|
| Client submission | `POST /api/portal/website-review` creates `client-requests` with `experienceModule: website-review` |
| Work spawn | `spawnWorkItemFromPortalRequest` called on submit |
| Internal notification | `notifyWebsiteReviewSubmitted` — fire-and-forget, never blocks client |
| Review Inbox | Filters `website-review` module requests at `/admin/operations/review-inbox` |
| Status workflow | Maps to client vocabulary via `lib/ces/vocabulary/website-review` |
| Timeline activity | `website-review.*` events published on status changes |
| Visual review | Session route loads `companyWebsite` iframe |
| Attachments | Max 5 files, 10 MB each, MIME allowlist |
| Primal data | 3 website-review requests present; workflow end-to-end validated in Phase 18C |

### Risks 🔴

| Risk | Detail |
|------|--------|
| **Attachment storage on Vercel** | `client-review-media` uses local `staticDir` (`private/client-review-media`). Build warns: no cloud storage adapter. **Uploads may not persist across serverless instances in production.** |

### Recommendation

Configure Payload cloud storage (e.g. Vercel Blob, S3) for `client-review-media` and `media` before relying on production attachment uploads. Text-only reviews work without storage.

---

## Email Infrastructure

### Environment variables

| Variable | Required for | Status (typical dev) |
|----------|--------------|----------------------|
| `RESEND_API_KEY` | Password reset emails, review notifications | Not set locally |
| `RESEND_FROM_EMAIL` | Sender address (defaults to hello@kreatebydesign.com) | Optional |
| `KXD_REVIEW_NOTIFICATION_EMAIL` | Operator alert on new review submission | Not set |
| `PORTAL_PUBLIC_URL` | Password reset link origin in production | Optional (falls back to `portal.kreatebydesign.com`) |

### Behavior

| Flow | When Resend missing |
|------|---------------------|
| Password reset (dev) | Reset link logged to console |
| Password reset (prod) | User sees success; email not sent; warn logged |
| Review notification (dev) | Logged to console with inbox URL |
| Review notification (prod) | Skipped; warn logged if `KXD_REVIEW_NOTIFICATION_EMAIL` unset |

**No emails sent during this audit.**

---

## Production Environment

### Required variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URI` | Neon Postgres (direct URL for Payload) |
| `PAYLOAD_SECRET` | Session signing, Payload auth — **must not use dev fallback** |
| `RESEND_API_KEY` | Portal password reset |
| `RESEND_FROM_EMAIL` | Email sender |
| `KXD_REVIEW_NOTIFICATION_EMAIL` | Internal review alerts |
| `PORTAL_PUBLIC_URL` | `https://portal.kreatebydesign.com` (recommended) |

### Deployment assumptions

| Assumption | Notes |
|------------|-------|
| Next.js 16 on Vercel | Build passes; SQLite fallback not used in production |
| Neon Postgres | All client/portal data |
| Portal host | `portal.kreatebydesign.com` → `/portal/login` redirect from `/` |
| Payload admin | Separate auth surface at `/admin` |
| Local filesystem uploads | **Not durable on Vercel** — see attachment risk |

### External services

- **Neon** — database
- **Resend** — transactional email (optional in dev, required for prod password reset)
- **Cloud storage** — not configured (attachment blocker)

---

## Error Handling

### Client-facing quality ✅

| Area | Assessment |
|------|------------|
| Login errors | Generic, non-enumerating; inactive account message clear |
| Review submit | Client-safe messages; attachment errors surfaced |
| Upload errors | MIME/size validation with plain language |
| Welcome complete | Retry message on failure |
| Loading states | Shimmer + "Opening your workspace…" |
| Empty states | Guided copy (Phase 18E) |
| Gone revisions | `WebsiteReviewGone` component with recovery path |

### Minor gaps (documented, not fixed)

| Gap | Impact |
|-----|--------|
| Forgot-password silent success when Resend fails | By design (no enumeration); ops must monitor logs |
| Upload 500 on missing file | "We couldn't upload that file" — acceptable |
| Attachment serve 404 | "File unavailable" — acceptable when storage missing |

---

## Fixes Completed

| File | Change |
|------|--------|
| `app/api/portal/auth/forgot-password/route.ts` | Production warn when `RESEND_API_KEY` missing |
| `app/api/portal/auth/login/route.ts` | Generic dev portal-user seed hint |

No architecture changes. No intelligence changes. No duplicate systems.

---

## Remaining Launch Checklist

### Before Primal external go-live

- [ ] Set `PAYLOAD_SECRET` in production (strong, unique value)
- [ ] Set `DATABASE_URI` to Neon direct connection
- [ ] Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL`
- [ ] Set `KXD_REVIEW_NOTIFICATION_EMAIL` for operator alerts
- [ ] Set `PORTAL_PUBLIC_URL=https://portal.kreatebydesign.com`
- [ ] Configure cloud storage for `client-review-media` (if attachments required)
- [ ] Deactivate test portal users (keep Adam + Tyler only)
- [ ] Confirm Tyler completes welcome flow on first login
- [ ] Share portal URL and credentials via secure channel
- [ ] Smoke test: login → welcome → submit review → verify Review Inbox

### Verification commands

```bash
npm run verify:client-launch -- --client primal-motorsports
npm run build
```

---

## Primal Readiness Status

### Core collaboration: **READY**

`npm run verify:client-launch -- --client primal-motorsports` — exit **0** (core config, no blockers)

| Item | Status |
|------|--------|
| Client record | ✅ Active |
| CES profile | ✅ Active, Website Review enabled |
| Adam (`adam.boatman@primalmotorsports.com`) | ✅ Active, welcome complete |
| Tyler (`tyler.edwards@primalmotorsports.com`) | ✅ Active, welcome pending |
| Website Review workflow | ✅ 3 requests, inbox connected |
| Portal UX (18E) | ✅ Polished |
| Production email | ⚠️ Requires Resend in prod env |
| Production attachments | 🔴 Requires storage adapter on Vercel |

### Overall: **READY with operational prerequisites**

Safe for text-based Website Review and collaboration once production env and ops checklist are complete. Attachment uploads require storage configuration before relying on them in production.

---

## Future Recommendations

1. **Cloud storage adapter** — Highest priority for production attachment reliability
2. **Production env verification script** — Extend `verify:client-launch` with env var checks (no email send)
3. **Deactivate test accounts** — Portal Access admin before go-live
4. **Monitor Resend delivery** — Confirm password reset and review notifications in staging
5. **Staging smoke test** — Full client journey on production-like URL before sharing with Adam/Tyler

---

## Architecture Impact

| Area | Changed? |
|------|----------|
| Intelligence pipeline | No |
| Observer / Brain / Pulse / Narrative / Context / Memory | No |
| Portal architecture | No |
| New systems | No |
| External client workflow | Intact |

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
| No architecture drift | ✔ |
| No intelligence changes | ✔ |
| No duplicate systems | ✔ |
| External client workflow intact | ✔ |
| Build passes | ✔ |

---

*Phase 18F complete. KXD OS is production-ready for external client collaboration pending operational environment configuration — not code architecture changes.*
