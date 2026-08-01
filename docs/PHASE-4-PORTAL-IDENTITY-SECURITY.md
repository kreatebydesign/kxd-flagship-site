# Phase 4 Batch I — Portal Identity & Security

Private invitation-only activation, membership-scoped roles, WebAuthn passkeys, TOTP MFA, and recovery codes — additive to Phase 4 memberships/sessions.

**Status:** Batch I code-complete at `f3cfb92`. Batch J covers production deploy + migration + smoke verification — see `docs/PHASE-4-BATCH-J-IDENTITY-ROLLOUT.md`. Real client invitations and identity mutations remain operator-gated (pilot runbook).

## Decisions (locked)

| Topic | Decision |
|---|---|
| Passkeys | `@simplewebauthn/server` + `@simplewebauthn/browser` |
| TOTP | `otplib` + `qrcode` |
| Invitation tokens | `crypto.randomBytes(32)` → SHA-256 hash only; 48h TTL; single-use |
| TOTP at rest | AES-256-GCM via `PORTAL_MFA_ENCRYPTION_KEY` (fail closed when MFA ops run without it) |
| WebAuthn RP ID | Production: `portal.kreatebydesign.com`; local: `localhost` |
| Allowed origins | `https://portal.kreatebydesign.com`, `http://localhost:3000`, plus `PORTAL_PUBLIC_URL` origin when set |
| Legacy membership role | Backfill `client-member` (no silent elevation) |
| Early access invites | KXD Payload admins only (`requirePayloadAdminApi`) |
| Client delegated invites | Schema/policy foundation only — **disabled** |
| Email identity | Email remains unique login; no usernames; no domain-based access |
| Biometrics | Face ID / Touch ID / Windows Hello are device capabilities only. **KXD never stores biometric data** — only WebAuthn credential public keys. |
| Existing create-user API | Kept for break-glass compatibility; Portal Access primary path is invitations |

## Env var names (no values)

| Name | Purpose |
|---|---|
| `PORTAL_MFA_ENCRYPTION_KEY` | 32-byte key (64-char hex or base64) for TOTP secret encryption |
| `PORTAL_PUBLIC_URL` | Public portal origin (activate links, WebAuthn origin allowlist) |
| `PORTAL_WEBAUTHN_RP_ID` | Optional local RP ID override |
| `PORTAL_WEBAUTHN_ORIGINS` | Optional comma-separated extra origins |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Invitation + reset email (skip/mock when missing locally) |
| `PAYLOAD_SECRET` | Session HMAC (existing) |

## Schema (additive migration)

`migrations/20260814_phase4_portal_identity_security.ts`

- `portal_client_memberships.role` + `can_manage_members` (default false)
- `portal_invitations` + `portal_invitation_memberships`
- `portal_passkeys`, `portal_mfa_settings`, `portal_recovery_codes`
- `portal_auth_challenges`, `portal_security_events`
- `portal_users`: `terms_accepted_at`, `security_enrollment_completed_at`, `last_step_up_at`

## Roles

- `client-owner` | `client-admin` | `client-member`
- Scoped to membership (portal user × client)
- Never grants KXD operator authority
- Early access: clients cannot manage invitations or member access (`can_manage_members` always false)

## Surfaces

| Surface | Route / API |
|---|---|
| Portal Access invitations | `/admin/operations/portal-access` + `/api/admin/portal-invitations/*` |
| Activate | `/portal/activate?token=…` |
| Security enroll | `/portal/security/enroll` |
| Account security | `/portal/settings/security` |
| Login | `/portal/login` — password, passkey, TOTP step |

## Auth policy (Batch I)

- New invitees: password required; passkey **or** TOTP required before `security_enrollment_completed_at`
- Existing production users (e.g. Adam/Tyler): **no forced MFA** in this batch; Account Security available
- KXD operators (`users`): staged MFA documented only — do not lock out ops in this batch
- Passkey with `userVerified=true` counts as strong auth for step-up; password alone does not once MFA enrolled

## Verifier

```bash
npm run verify:phase4-portal-identity-security
```

## Local QA notes

1. Run Batch I migration against **local** DB only.
2. Set `PORTAL_MFA_ENCRYPTION_KEY` (32 bytes hex/base64) in `.env.local`.
3. Compose invitation in Portal Access; if Resend missing, use printed local activate URL.
4. Activate → set password → enroll passkey on `localhost` RP and/or TOTP with authenticator app.
5. Confirm cancel/fallback: invalid token shows generic error; recovery codes shown once.
6. Login: password path with TOTP when enabled; “Continue with a passkey” when registered.

## Production rollout

- **Batch J procedure:** `docs/PHASE-4-BATCH-J-IDENTITY-ROLLOUT.md`
- **Pilot activation (after smoke):** `docs/PHASE-4-BATCH-J-PILOT-ACTIVATION-RUNBOOK.md`
- Broad client rollout (Matt/Don/Billy/Nicole/Adam/Tyler) remains **unexecuted** until pilot approval.

### Broad client sequence (still operator-gated / unexecuted)

1. Matt security enrollment  
2. Optional KXD Client creation (separate approval)  
3. Matt KXD + Primal memberships  
4. Safe operator MFA without lockout  
5. Don four `client-owner` memberships after CES profiles (Cusick `5`, OTP `9`, Townsgate `10`, OTP Carts `14`)  
6. Billy Cusick `client-admin`; Nicole OTP Carts `client-admin` (explicit client IDs, not email domain)  
7. Adam/Tyler **role migration only** after confirmation (preserve credentials/sessions)  
8. CES for Cusick/OTP/Townsgate/OTP Carts  
9. QA identity retention/retirement  
10. Keep delegated client access disabled  
11. Rollback: revoke invites, disable memberships, disable MFA flags, redeploy prior release  

**Still excluded until separately approved:** real external client email, create/invite Don/Billy/Nicole, mutate Adam/Tyler, SMS MFA, public registration, Approvals product, KXD Connect/Support/Academy/Meetings/Social Studio/weather/personalized shell.

**Phase 5 note:** Phase 5 (Client Billing Visibility) is now **separately approved** as a parallel product lane — see `docs/PHASE-5-CLIENT-BILLING-VISIBILITY.md`. Phase 5 does not authorize Batch J identity mutations, real external invites, or Phase 4 completion.
