# Commercial Lifecycle — Production Release Gate (Plan Only)

**Status:** Local complete with blockers — **do not migrate or deploy** until blockers clear  
**Audience:** Founder / engineering  
**Related:** `docs/KXD-OS-PRODUCT-ROADMAP.md` (product pillars), `docs/KXD-OS-ROADMAP.md` (engineering status)

This document is a **plan**. It does not authorize production migration, Neon access, live Stripe, or production email.

---

## Canonical documentation ownership

| Document | Owns |
|----------|------|
| `docs/KXD-OS-PRODUCT-ROADMAP.md` | Long-term product compass + Future systems dependency order |
| `docs/KXD-OS-ROADMAP.md` | Edition 1 engineering progress (what is built / next) |
| **This file** | Commercial lifecycle production release gate, blockers, smoke tests |

Do not invent a third public roadmap. Do not expose this document via client routes or marketing pages.

---

## Migrations reviewed (local only)

| Migration | Purpose |
|-----------|---------|
| `20260811_proposal_contract_builder` | Builder fields |
| `20260812_proposal_lifecycle_package` | `lifecyclePackage` JSON + signing token hash columns |
| `20260813_commercial_documents` | Private commercial-documents registry |

**Roll-forward notes**
- JSON `lifecyclePackage` is additive; existing contracts default to empty package via normalizer.
- `signingTokenHash` / `publicTokenHash` are nullable; hash-only write path clears plaintext `publicToken` on send/seal.
- `commercial-documents` requires `storage/commercial-documents/` on the app host (not under `public/`).
- Uniqueness/idempotency for filing is application-level `(contractId, kind, contentHash)` — confirm indexes before production if volume grows.

**Rollback limitations**
- Dropping columns loses package evidence — prefer forward fix.
- Filed PDFs are not in the DB dump alone; backup `storage/commercial-documents/` with DB.

---

## Pre-deployment checklist (when authorized later)

1. Full DB backup + storage backup  
2. Confirm `DATABASE_URI` target is intentional (never accidental Neon from local `.env`)  
3. Env validation: no live Stripe execution unless `STRIPE_COMMERCIAL_EXECUTION_AUTHORIZED` explicitly set in a later phase; email provider unset until email gate clears  
4. Apply migrations in order: `…811` → `…812` → `…813`  
5. Deploy application revision compatible with schema  
6. Smoke: admin auth 401 anonymous; create disposable proposal ≠ ID 1; mock path only  
7. Auth: operator download requires session; client download requires completion token  
8. Document generation + storage write verification  
9. Monitoring: filing failures, integrity 409s, webhook rejects  

---

## Controlled Stripe TEST MODE (local integration)

**Status:** Code path implemented; **real Stripe API execution requires protected `sk_test_` credentials in the local environment** (not present at last gate check).

### Canonical boundary

```
Executed agreement → private filing → billing readiness
  → Stripe TEST customer (idempotent)
  → Stripe TEST invoice (idempotent, taxes off)
  → Hosted invoice / test card payment
  → Signed commercial lifecycle webhook (`livemode: false`)
  → Onboarding eligible (manual activation still required)
```

Mock path (`cus_mock_*`, `evt_mock_*`) remains for offline QA and must never share handlers with `/api/stripe/commercial-lifecycle-webhook`.

### Required local environment (placeholders only)

See `.env.example`:

- `STRIPE_SECRET_KEY_TEST=sk_test_…` (preferred)
- `STRIPE_WEBHOOK_SECRET_TEST=whsec_…`
- Optional: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST=pk_test_…`
- Fallback: `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` only if still test-prefixed
- Live prefixes fail closed. Dedicated live env vars are never selected.

### Webhook setup (Stripe CLI)

```bash
stripe listen --forward-to localhost:3000/api/stripe/commercial-lifecycle-webhook
# Put the printed whsec_… into STRIPE_WEBHOOK_SECRET_TEST (never commit)
```

Operator actions (admin contract workspace): credential check → ensure test customer → prepare test invoice → pay with Stripe test cards → webhook grants eligibility.

### Migrations

No new migration required for Stripe TEST MODE — state lives in `lifecyclePackage.stripeTest` JSON on contracts.

### Monitoring / recovery

- Watch webhook rejects (signature, livemode, metadata mismatch, amount/currency)
- Operator retry: ensure customer / prepare invoice (idempotent)
- Do not delete evidence to recover

---

## Blockers before controlled Stripe test-mode **execution**

1. ~~Place `sk_test_` + `whsec_` in protected local `.env.local` (never commit)~~ — local operator configured  
2. ~~Stripe CLI or Dashboard webhook forwarding to `/api/stripe/commercial-lifecycle-webhook`~~ — active for disposable E2E  
3. ~~Disposable local fixtures only — never Proposal ID 1~~ — verified  
4. ~~Confirm test mode via credential prefix + Balance `livemode === false`~~ (Account self-retrieve may omit `livemode`; adapter uses Balance)  
5. ~~Complete one disposable test payment + replay + mismatch path~~ — verified on disposable local DB  

## Blockers before production Stripe

1. Flip of broader commercial execution remains **closed** (`STRIPE_COMMERCIAL_EXECUTION_AUTHORIZED = false`)  
2. KXD legal/tax/remittance reviewed for live invoicing (no invention)  
3. Live keys / live webhooks remain rejected by commercial lifecycle resolvers  
4. Recurring schedules / subscriptions still blocked in this pilot  
5. Separate production webhook endpoint + monitoring + dual-control approval  

### Phase 5 product-track note (does not clear these blockers)

**Phase 5 — Client Billing Visibility** (`docs/PHASE-5-CLIENT-BILLING-VISIBILITY.md`) is approved for phased implementation and may add a **narrow read-only** Stripe invoice list/retrieve path separate from `STRIPE_COMMERCIAL_EXECUTION_AUTHORIZED`. Phase 5 does **not** authorize invoice creation, charging, subscriptions, refunds, dunning, production email, or flipping the commercial execution gate. Lifecycle TEST-mode invoice behavior must not be broadened by Phase 5. Live financial mutations still require a separately named and approved batch.

## Blockers before production email

1. Provider selection + authenticated sender/reply-to  
2. Suppression/bounce/complaint handling  
3. Template QA + XSS escaping review of client-controlled fields  
4. Delivery intent vs result persistence with provider message IDs  
5. No raw tokens in logs, previews, or analytics  

## Blockers before production migration/deployment

1. All Stripe/email blockers above or explicit scoped waiver  
2. Neon/production backup proven  
3. Proposal ID 1 / production data protection policy confirmed  
4. Adversarial auth suite green against staging  
5. Private storage mounts + no public media exposure  
6. Release owner sign-off  
7. Onboarding remains separately controlled after payment eligibility  

---

## Local verification commands

```bash
KXD_SERVER_ONLY_SHIM=1 npx tsx --import ./scripts/shims/register-server-only.mjs scripts/verify-proposal-lifecycle.ts
npm run verify:lifecycle-stripe-test
# Disposable E2E (local DB + Stripe CLI required; never Proposal ID 1):
KXD_SERVER_ONLY_SHIM=1 STRIPE_E2E_PAY=1 npx tsx --env-file=.env.local \
  --import ./scripts/shims/register-server-only.mjs scripts/run-stripe-test-mode-e2e.ts
KXD_SERVER_ONLY_SHIM=1 CONTRACT_ID=<id> npx tsx --env-file=.env.local \
  --import ./scripts/shims/register-server-only.mjs scripts/verify-stripe-test-e2e-followup.ts
# Anonymous auth smoke (dev server):
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/admin/sales/contracts/6/lifecycle
npx tsc --noEmit
npm run build
```

---

*Internal release gate — not a marketing surface.*
