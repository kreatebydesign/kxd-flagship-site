# Phase 4 Batch J — Identity Security Production Rollout

**Purpose:** Controlled production release of Batch I identity/security foundation + compatibility verification.  
**Not in scope:** Real client invitations, Don/Billy/Nicole/Adam/Tyler mutations, KXD Connect, Support, Academy, Meetings, Social Studio, weather, personalized workspace shell, Phase 5, Approvals product.

## Release identity

| Item | Value |
|---|---|
| Implementation commit | `f3cfb92` — `feat(portal): add Phase 4 Batch I invitations, roles, passkeys, and MFA` |
| Batch J docs/fixups | Additional focused commit(s) on `main` after `f3cfb92` if required |
| Migration | `20260814_phase4_portal_identity_security` (additive) |
| Verifier | `npm run verify:phase4-portal-identity-security` |

## Environment preflight (names only)

Required for production health of Batch I surfaces:

| Variable | Role | Notes |
|---|---|---|
| `PAYLOAD_SECRET` | Portal session HMAC | Existing |
| `DATABASE_URL` / `DATABASE_URI` | Postgres | Existing Neon store |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Invitation + reset email | Existing |
| `PORTAL_PUBLIC_URL` | Activate link origin + WebAuthn allowlist helper | Set to portal origin |
| `PORTAL_MFA_ENCRYPTION_KEY` | AES-GCM for TOTP secrets | Required before TOTP enrollment; fail-closed without it |

Optional: `PORTAL_WEBAUTHN_RP_ID`, `PORTAL_WEBAUTHN_ORIGINS` (local overrides).

## Migration order (repository-safe)

Per `docs/PAYLOAD-MIGRATIONS.md`:

1. Deploy the release that contains the migration.
2. `npm run migrate:status` against production credentials (host/db metadata only).
3. Confirm pending includes exactly `20260814_phase4_portal_identity_security` (plus none unexpected).
4. `KXD_CONFIRM_PRODUCTION_MIGRATE=1 npm run migrate:production`
5. Re-run `migrate:status` — new migration `Ran: Yes` exactly once.
6. Do **not** run seed scripts. Do **not** create invitations/passkeys/MFA/memberships to “prove” deploy.

Deployment does **not** auto-apply Payload migrations; apply is a separate guarded command.

## Compatibility policy

- Existing password login remains available.
- Passkeys are an **additional** method — not a forced replacement.
- MFA remains **optional** for existing users (`forceMfaForExistingUsers: false`).
- Invitation activation enrollment gate applies only when `termsAcceptedAt` is set (invite accept path).
- Client-delegated invitations remain **disabled**.
- Legacy membership role resolves to `client-member`.

## Rollback strategy

1. Revoke any open invitations (operator Portal Access).
2. Disable affected memberships / portal users if needed.
3. Disable MFA flags (`totpEnabled`) if a TOTP incident occurs — do not delete audit history casually.
4. Redeploy prior release commit.
5. Schema rollback of Batch I tables only with explicit maintenance approval (prefer leave additive columns/tables).

## Future product direction (not this batch)

KXD Connect, Support, personalized workspaces, Meetings, Academy, Social Studio, Media Vault integration, location/weather, and broader acquisition-readiness systems remain **future approved roadmap work** — not part of Batch J deployment.

## Pilot activation

See `docs/PHASE-4-BATCH-J-PILOT-ACTIVATION-RUNBOOK.md` for the next controlled activation steps after smoke verification. Real-user expansion (Adam/Tyler/Don/Billy/Nicole) requires separate operator approval after pilot success.
