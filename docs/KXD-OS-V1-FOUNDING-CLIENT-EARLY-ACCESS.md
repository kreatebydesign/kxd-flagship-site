# KXD OS v1 — Founding Client Early Access

**Release identity:** KXD OS v1 — Founding Client Early Access  
**Intended release date:** August 1, 2026  
**Audience:** A small set of existing KXD clients using real workspaces while development continues.

This is not a wide-open public SaaS launch.

---

## What v1 includes

- Operator KXD OS for running real client work
- Secure client portal sign-in and sign-out
- Client-scoped workspaces (CES modules where entitled)
- Website Review submission and operator Review Inbox processing
- Website Workspace collaboration where enabled
- Client requests / revision flow where enabled
- Notifications and client-visible activity
- Reporting visibility for published client reports where configured
- Plans / access visibility and upgrade requests where enabled
- Client Launch Wizard / operator launch workflow
- Discreet portal **Send feedback** for early-access notes
- Production auth, isolation, and fail-closed cron guards

## What v1 intentionally does not include

- Multi-brand organization switching
- Parent organizations or cross-company dashboards
- Self-service workspace provisioning
- Full invoicing / payment center execution
- Monthly billing recaps or Work Ledger
- Wix hosting-transition automation
- Internal Resource Center
- Credential vault
- Public self-service registration
- New SaaS subscription packaging
- New industry editions
- Broad public website redesigns
- Broad design-system rewrites

---

## Supported founding-client workflows

1. Operator opens KXD OS, finds a client, and works from the client workspace.
2. Client signs in at the portal host and lands in their authorized workspace.
3. Client reviews work, submits Website Review / workspace feedback, or a request.
4. Operator finds the item (Review Inbox / requests / communications), updates it, and completes eligible work.
5. Client-visible status and notifications update without exposing internal-only notes.
6. Operator launches a new client through the established launch workflow.
7. Client sends early-access product feedback from the portal.

Likely initial clients (examples, not hard-coded product assumptions):

- Primal Motorsports
- DCoGT
- AutoDV8ions
- Cusick or one related business initially
- One simpler KXD retainer client

---

## Internal operator preflight checklist

- [ ] `PAYLOAD_SECRET` is a strong random value in production (not the development fallback)
- [ ] `DATABASE_URI` points at the production Postgres (Neon direct URL)
- [ ] `CRON_SECRET` is set (reporting cron fails closed without it)
- [ ] `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are set (portal password reset)
- [ ] Blob storage configured (`BLOB_READ_WRITE_TOKEN` or `BLOB_STORE_ID` + OIDC)
- [ ] `PORTAL_PUBLIC_URL=https://portal.kreatebydesign.com`
- [ ] `NEXT_PUBLIC_SITE_URL` matches the primary public site domain
- [ ] Founding clients have active portal users linked to the correct Client
- [ ] CES / plan entitlements match what each client should see
- [ ] Stripe commercial execution remains gated closed for this release
- [ ] Run verification commands listed below
- [ ] Manual smoke sequence completed on staging or local with test data only

## Client onboarding checklist

- [ ] Client record exists with correct slug, contacts, and status
- [ ] Portal user created (active) and welcome state understood
- [ ] Password set or reset email verified end-to-end
- [ ] Client Launch Wizard / readiness checks pass for the client
- [ ] Entitled modules confirmed (Website Review, Workspace, Inventory, etc.)
- [ ] Client can sign in, open home, submit one review/request, and sign out
- [ ] Operator can find and process that submission
- [ ] Client knows how to use **Send feedback** during early access

## Production smoke-test checklist

1. Operator login → `/os` → client workspace
2. Portal login on `portal.kreatebydesign.com`
3. Portal navigation on desktop and mobile (open / close menu)
4. Website Review submission
5. Operator Review Inbox processing (including bulk complete where eligible)
6. Client request / website workspace flow where entitled
7. Reporting visibility for a published report (if configured)
8. Plan / access visibility
9. Feedback submission → appears as inbound client communication
10. Cross-client isolation attempt (direct URL / API) denied safely
11. Expired / unauthorized session redirects to login
12. Sign-out clears portal session

---

## Issue severity definitions

| Severity | Meaning |
|---|---|
| **BLOCKER** | Security, data isolation, authentication failure, broken critical workflow, or release-preventing production defect |
| **HIGH** | Serious usability, reliability, or accessibility defect likely to disrupt founding clients |
| **MEDIUM** | Legitimate imperfection that can be safely deferred |
| **POST-V1** | New capability or product expansion outside early access |

## Feedback triage categories

1. Security or data isolation
2. Bug
3. Usability blocker
4. Strong recurring product need
5. Client-specific customization
6. Backlog idea

Early-access feedback is stored as inbound **Client Communications** (`source: portal-experience-feedback`). Do not promise implementation from a submission alone.

---

## Known limitations (safe for early access)

- Some legacy Client HQ routes remain URL-reachable when hidden from CES nav; data stays client-scoped.
- Payload REST `/api/portal-users/login` can still mint a `payload-token`, but portal-users JWTs cannot pass admin/OS collection access or mutate their client link.
- Password reset always returns a generic success response (anti-enumeration); production must have Resend configured or resets will not arrive.
- `/api/google-reviews` remains a public diagnostic-style endpoint with masked credentials.
- Stripe foundations exist; commercial execution stays closed.
- Primal-specific CES helpers remain reference wiring — do not treat them as the only client model.
- Middleware cookie presence is a first gate for `/api/admin/*`; handlers must still call `requirePayloadAdminApi()` (verified for brain, executive-notes, client-command, and remaining admin routes).

## Release-hardening notes (this pass)

- Portal **Send feedback** reuses Client Communications (`source: portal-experience-feedback`) — no new collection or migration.
- Portal error / not-found boundaries and catch-all prevent raw framework 404/error chrome for clients.
- Incomplete legacy `/portal/onboarding` questionnaire redirects to `/portal`.
- `/api/db-health` requires Payload admin authentication.
- Operator surfaces `/admin/work`, `/admin/sales`, `/admin/training` are included in middleware auth matching.
- Admin APIs that previously relied only on cookie presence now call `requirePayloadAdminApi()` (brain, executive notes, client-command, proposal pricing sync).
- Critical portal forms communicate session expiry on 401 without clearing the draft message.

## Rollback / recovery references

- Prefer Vercel deployment rollback to the last known-good production deployment.
- Do not force-push `main`.
- Database migrations are explicit (`npm run migrate*`) — do not run production migrations as part of casual rollback.
- See `docs/PAYLOAD-MIGRATIONS.md` and `docs/KXD-OS-RUNTIME-ARCHITECTURE.md`.

---

## Verification commands (local / CI)

```bash
npx tsx scripts/verify-portal-admin-auth-boundaries.ts
npm run verify:experience-feedback
npm run verify:runtime-contract
npm run verify:client-plans
npm run verify:client-launch-wizard
npm run verify:website-review-upload
npm run verify:website-review-page-location
npm run verify:review-inbox-bulk-complete
npm run verify:stripe-integration-readiness
npx tsc --noEmit
npm run build
```

Optional live / DB-backed checks when a local database and seed data are available:

```bash
npm run verify:primal-portal
npm run verify:client-launch -- --client primal-motorsports
```

---

## Post-v1 roadmap (explicitly deferred)

1. Multi-Brand Client Workspace Provisioning
2. Client Billing, Work Ledger, and Hosting Transitions
3. Internal Resource Center
4. Secure Credential Vault
5. Self-service onboarding and SaaS packaging

---

## Architecture pointers

- Runtime surfaces: `docs/KXD-OS-RUNTIME-ARCHITECTURE.md`
- Current platform state: `docs/KXD-OS-CURRENT-STATE.md`
- Engineering contract: `docs/KXD-OS-ENGINEERING-BRIEF.md`
- CES: `docs/CLIENT-EXPERIENCE-SYSTEM-ARCHITECTURE.md`
