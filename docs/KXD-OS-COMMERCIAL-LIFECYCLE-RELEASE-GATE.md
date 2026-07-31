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

## Blockers before controlled Stripe test-mode

1. KXD legal entity, tax treatment, remittance, invoice numbering reviewed for real use  
2. Explicit founder authorization for Stripe **test-mode** API calls  
3. Webhook signature verification path for Stripe (not mock processor)  
4. Clear separation: mock `evt_mock_*` / `cus_mock_*` never share handlers with live Stripe routes  
5. Billing readiness cannot be force-bypassed in non-local environments  

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

---

## Local verification commands

```bash
KXD_SERVER_ONLY_SHIM=1 npx tsx --import ./scripts/shims/register-server-only.mjs scripts/verify-proposal-lifecycle.ts
# Anonymous auth smoke (dev server):
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/admin/sales/contracts/6/lifecycle
npx tsc --noEmit
npm run build
```

---

*Internal release gate — not a marketing surface.*
