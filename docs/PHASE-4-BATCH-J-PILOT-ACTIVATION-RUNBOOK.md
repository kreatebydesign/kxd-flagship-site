# Phase 4 Batch J — Pilot Activation Runbook

**Audience:** KXD operators only  
**Prerequisite:** Batch J production deploy + migration `20260814_phase4_portal_identity_security` applied and smoke-verified.  
**Separation:** This runbook is **pilot verification**. Broad client rollout (Adam/Tyler/Don/Billy/Nicole and others) is a later approved step.

Do **not** send invitations to real external clients until the pilot checklist below passes.

## A. Safe pilot (internal / designated)

1. **Select one internal/designated pilot identity**
   - Prefer a KXD-controlled mailbox.
   - Do not use Adam, Tyler, Don, Billy, or Nicole for the first pilot.

2. **Issue one controlled invitation**
   - Portal Access → Invitations → compose one client + role.
   - Prefer a non-production-critical client or Primal if already authorized.
   - Confirm Resend delivery or capture local activate URL only in non-prod.

3. **Verify activation**
   - Open `/portal/activate?token=…`
   - Invalid/expired tokens show generic failure (no account leak).
   - Set password + accept terms → lands on security enrollment.

4. **Optional passkey enrollment**
   - On a supported device, register one passkey.
   - Confirm copy: biometrics stay on device; KXD stores credential public key only.

5. **Optional TOTP enrollment**
   - Requires `PORTAL_MFA_ENCRYPTION_KEY` configured.
   - Scan QR / enter code → store recovery codes offline once.
   - Confirm `security_enrollment_completed_at` gate clears and portal app loads.

6. **Test one recovery code**
   - Sign out → password login → MFA step → use one recovery code.
   - Confirm that code cannot be reused.

7. **Logout / session behavior**
   - Sign out clears portal session cookie.
   - Unauthenticated `/portal/settings/security` redirects to login.

8. **Multi-company membership (authorized fixtures only)**
   - Only if the pilot user is intentionally granted ≥2 active memberships.
   - Switch accounts; confirm each surface shows only the active client’s data.
   - Forged client IDs in switch API fail closed.

9. **Role permission spot-check**
   - Confirm displayed role matches invitation.
   - Confirm client cannot manage invitations (early access disabled).
   - Confirm operator Portal Access still requires Payload admin session.

10. **Evidence (no secrets)**
    - Record: invitation status transitions, timestamps, client IDs, role labels.
    - Never paste tokens, recovery codes, TOTP secrets, cookies, or passwords into tickets/docs.

11. **Rollback if problems appear**
    - Revoke invitation if still open.
    - Disable pilot membership(s) and/or portal user.
    - Disable `totpEnabled` if MFA misbehaves.
    - Redeploy prior release if deploy-level defect.

## B. Broad client rollout (later — not this pilot)

Only after pilot approval:

1. Matt security enrollment (optional MFA/passkey) without ops lockout  
2. Optional KXD Client creation (separate approval)  
3. Matt KXD + Primal memberships  
4. Don four `client-owner` memberships after CES readiness  
5. Billy Cusick `client-admin`; Nicole OTP Carts `client-admin` (explicit client IDs)  
6. Adam/Tyler **role migration only** after confirmation — preserve credentials/sessions  
7. Keep client-delegated invites disabled  

## Explicit exclusions

- No public registration  
- No SMS MFA  
- No domain-based access  
- No Approvals product  
- No Phase 5 work inside this Batch J pilot (Phase 5 is a separately approved parallel lane; see `docs/PHASE-5-CLIENT-BILLING-VISIBILITY.md`)  
- No KXD Connect / Support / Academy / Meetings / Social Studio / weather / personalized shell in this activation path  
