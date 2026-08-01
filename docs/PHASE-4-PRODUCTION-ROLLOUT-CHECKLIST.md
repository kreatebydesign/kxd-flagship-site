# Phase 4 — Production Rollout Checklist

**Status:** Repository Batch H code/docs complete — **authenticated production rollout QA blocked** until a safe multi-client identity and membership configuration is confirmed.  
**Companion:** `docs/PHASE-4-MULTI-CLIENT-PORTAL.md`, `docs/KXD-OS-CURRENT-STATE.md`  
**Verifier:** `npm run verify:phase4-multi-client-portal-completion`

> Do not mark Phase 4 fully production-complete until the live authenticated gates below pass.  
> Do not invent an Approvals product. Portal “client approvals” remain existing Website Review / request awaiting-input states only.

---

## Environment

- [ ] Production deployment is READY on the intended commit
- [ ] Production aliases (`www`, `portal`, apex) resolve to that deployment
- [ ] No pending Phase 4 migrations (Batch H expects **none**)
- [ ] Manual Neon snapshot taken if any later approved membership mutation is performed
- [ ] Support/monitoring channel identified for portal login failures

## Portal identity and memberships (operator, Matt-approved)

- [ ] Confirm `matt@kreatebydesign.com` Portal User state (exists / active)
- [ ] Confirm Kreate by Design Client record (portal-compatible)
- [ ] Confirm Matt ↔ Kreate by Design active membership (if intended)
- [ ] Confirm Matt ↔ Primal Motorsports active membership (if intended)
- [ ] Confirm Cusick Motorsports / CMM Client record
- [ ] Confirm OTP / On Track Performance Client record
- [ ] Confirm 2475 Townsgate Client record
- [ ] Confirm OTP Carts Client record **or** document readiness blocker
- [ ] Confirm Don (or designated) Portal User exists before Cusick linking
- [ ] Confirm four Cusick active memberships only after OTP Carts readiness
- [ ] Retire or quarantine test identities (`inventory.qa`, `matt.primal@kxd.local`, etc.) when no longer needed

> **Mutation rule:** Do not create/update/disable Portal Users, Clients, memberships, or entitlements without Matt’s explicit approval and a written rollback plan.

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
