# Phase 4 — Production Rollout Checklist

**Status:** Batches A–I implemented; Batch J = identity security production rollout + smoke verification. Authenticated multi-company QA and real-user activation remain gated by the pilot runbook.  
**Companion:** `docs/PHASE-4-MULTI-CLIENT-PORTAL.md`, `docs/PHASE-4-PORTAL-IDENTITY-SECURITY.md`, `docs/PHASE-4-BATCH-J-IDENTITY-ROLLOUT.md`, `docs/PHASE-4-BATCH-J-PILOT-ACTIVATION-RUNBOOK.md`, `docs/KXD-OS-CURRENT-STATE.md`  
**Verifiers:** `npm run verify:phase4-multi-client-portal-completion`, `npm run verify:phase4-portal-identity-security`

> Do not mark Phase 4 fully production-complete until the live authenticated gates below pass.  
> Do not invent an Approvals product. Portal “client approvals” remain existing Website Review / request awaiting-input states only.  
> Real client invitations and Don/Billy/Nicole/Adam/Tyler mutations remain **unexecuted** until pilot approval.

---

## Environment

- [ ] Production deployment is READY on the intended commit
- [ ] Production aliases (`www`, `portal`, apex) resolve to that deployment
- [ ] Phase 4 membership migration already applied; Batch I `20260814_phase4_portal_identity_security` applied only after explicit approval
- [ ] `PORTAL_MFA_ENCRYPTION_KEY` configured before enabling TOTP in production
- [ ] Manual Neon snapshot taken if any later approved membership/identity mutation is performed
- [ ] Support/monitoring channel identified for portal login failures

## Portal identity and memberships (operator, Matt-approved)

- [ ] Confirm `matt@kreatebydesign.com` Portal User state (exists / active)
- [ ] Confirm Kreate by Design Client record (portal-compatible)
- [ ] Confirm Matt ↔ Kreate by Design active membership (if intended)
- [ ] Confirm Matt ↔ Primal Motorsports active membership (if intended)
- [ ] Confirm Cusick Motorsports / CMM Client record (ID `5` per inventory)
- [ ] Confirm OTP / On Track Performance Client record (ID `9`)
- [ ] Confirm 2475 Townsgate Client record (ID `10`)
- [ ] Confirm OTP Carts Client record (ID `14`) **or** document readiness blocker
- [ ] Confirm Don (or designated) Portal User exists before Cusick linking — **do not create in Batch I commit**
- [ ] Confirm four Cusick active memberships only after OTP Carts readiness + CES profiles
- [ ] Billy Cusick `client-admin` / Nicole OTP Carts `client-admin` only after explicit approval (client IDs, not email domains)
- [ ] Adam Boatman / Tyler Edwards: **role migration only** after confirmation — preserve credentials/sessions
- [ ] Retire or quarantine test identities (`inventory.qa`, `matt.primal@kxd.local`, etc.) when no longer needed

> **Mutation rule:** Do not create/update/disable Portal Users, Clients, memberships, invitations, or entitlements without Matt’s explicit approval and a written rollback plan.

## Batch I — Invitations / roles / passkeys / MFA (unexecuted until approved)

- [ ] Apply Batch I migration to production only after snapshot + approval
- [ ] Matt security enrollment (passkey and/or TOTP) without locking out ops
- [ ] Optional KXD Client creation (separate approval)
- [ ] Operator-only invitations; keep client-delegated invites disabled
- [ ] Local/mail-sink QA of activate → enroll → login before real client email
- [ ] Confirm biometrics privacy copy (KXD never stores Face ID / Touch ID / Windows Hello data)
- [ ] Rollback ready: revoke invites, disable memberships, disable MFA flags, redeploy prior release

## Safe login verification

- [ ] Unauthenticated `/portal/*` redirects to login
- [ ] Portal APIs return 401 when unauthenticated
- [ ] Login succeeds for an approved eligible identity
- [ ] Inactive portal user cannot establish a session
- [ ] Zero active memberships fail closed (no session)

## Active-account switching

- [ ] Single-membership users do **not** see a switcher
- [ ] Multi-membership users see only active authorized accounts
- [ ] Switch accepts only an active membership
- [ ] Forged / foreign client IDs are denied generically
- [ ] Refresh and direct `/portal/...` navigation keep the authorized active client
- [ ] After revoke/disable of a membership, next request cannot use that client

## Authorization and isolation

- [ ] Authorized Portfolio lists only membership clients
- [ ] Requests / assets / deliverables / reports scoped to active client
- [ ] Website Review / Website Workspace scoped + CES-gated
- [ ] Cross-client record IDs fail closed (uniform denial)
- [ ] CES-disabled modules fail closed (pages + APIs)
- [ ] Relationship Intelligence remains portal-inaccessible
- [ ] Staff Approval Queue / Matt-approval systems remain portal-inaccessible
- [ ] No `/portal/approvals` route or Approvals nav item

## Responsive and accessibility

- [ ] Mobile / tablet / desktop: current account always clear
- [ ] Account switcher keyboard-accessible (Arrow/Home/End/Escape, focus visible)
- [ ] Mobile nav toggle has accessible name; focus order logical
- [ ] Long client names wrap without clipping critical controls
- [ ] Empty / unauthorized states do not expose sibling-client data
- [ ] `prefers-reduced-motion` respected
- [ ] Touch targets practical on narrow viewports

## Remaining documented risks (do not claim fixed)

- [ ] **Pre-existing public Payload `/media/...` onboarding-asset exposure** — still open; not redesigned in Batch H
- [ ] Reports list loads full report docs in a **server component** only (detail uses client-safe view model) — confirm no client-boundary serialization of internal fields

## Rollback expectations

- [ ] Application rollback = redeploy prior READY production deployment
- [ ] Membership mutations (if any were approved) have a documented reverse disable/restore plan
- [ ] No destructive drop of legacy `portal-users.client` in Phase 4 completion

## Test-account retirement

- [ ] List remaining QA-only portal identities
- [ ] Disable or remove after production multi-client QA completes
- [ ] Confirm production operators know the supported login identities

## Phase 4 completion decision

Phase 4 is **fully complete** only when repository definition criteria are met, including:

1. Deployed release production-verified
2. Don/Cusick read-only QA across all four configured account contexts (OTP Carts ready)
3. Security, regression, responsive, and accessibility gates passed
4. Isolation proven under authenticated multi-client use

**Current Batch H repository posture:** code-complete + static verifiers green; authenticated production multi-client QA **blocked** pending safe identity/membership inventory against production.
