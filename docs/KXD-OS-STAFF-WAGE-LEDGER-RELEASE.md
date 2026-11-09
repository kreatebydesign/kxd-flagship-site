# Staff external wage-payment ledger — production release (Edition 1)

**Scope:** Record off-platform wage settlements with entry-level allocations. Not payroll execution, tax filing, or banking integration.

**PR:** [#127](https://github.com/kreatebydesign/kxd-flagship-site/pull/127)

## Preconditions

- Matt (founder) written approval to merge PR #127 and run production migration.
- Neon production branch: `main` (`br-tiny-morning-afqn555m`, endpoint `ep-twilight-math-aferd43x`). **Never** use this URI for preview QA scripts.
- Vercel production deployment idle or rolling promotion window agreed.
- Backup confirmed in Neon console (branch restore point / snapshot taken within 24h of migrate).

## Migration sequence (production)

Apply in Payload `migrations/index.ts` order. New migrations in this release:

| Order | Migration | Purpose |
|--------|-----------|---------|
| 1 | `20261101_staff_time_pay_requests` | Pay correction requests (dependency) |
| 2 | `20261102_staff_pay_historical_entries` | Owner-approved pre-clock durations |
| 3 | `20261109_staff_wage_external_payments` | External wage payments + allocations |

**Operator steps (do not run without confirmation):**

1. Read-only status on production host (no secrets in logs):

   ```bash
   DATABASE_URI='<production-main-direct-url>' npm run migrate:status
   ```

   Expect host containing `ep-twilight-math`, not `ep-frosty-bonus` or ephemeral QA endpoints.

2. Verify pending migrations list includes only expected names above (plus any other already-approved pending migrations).

3. Apply with explicit confirmation:

   ```bash
   KXD_CONFIRM_PRODUCTION_MIGRATE=1 DATABASE_URI='<production-main-direct-url>' \
     KXD_SERVER_ONLY_SHIM=1 node --import ./scripts/shims/register-server-only.mjs --import tsx \
     scripts/run-payload-migrate.ts production
   ```

4. Re-run `migrate:status` until `20261109_staff_wage_external_payments` is recorded.

**Rollback (DDL):**

- If no wage payments have been recorded yet: run migration `down` for `20261109` only (drops `staff_wage_payment_allocations`, `staff_wage_payments`).
- If payments exist: **do not drop tables**. Use void workflow in admin UI and founder decision on data retention.
- `20261101` / `20261102` rollback only if no dependent rows exist (historical entries, pay requests).

## Deployment order

1. Merge PR #127 to `main` (after founder approval).
2. Run production migration sequence (above) **before** or **immediately after** deploy per Matt's preference; recommended **migrate first, then promote** so APIs see tables on first request.
3. Vercel production deploy from `main`.
4. Smoke: founder opens Staff → Payroll, wage payment card loads; Tyler My Time & Pay shows documented / settled / outstanding columns (no 500).

## One-time production record: Tyler October 2026 Zelle

**Facts (verified read-only audit):**

| Field | Value |
|--------|--------|
| Staff | Tyler Rethwill (`users.id = 3`) |
| Documented gross | $1,153.00 (115,300 cents) |
| Payment gross (Oct 15–29 coverage) | $1,074.67 (107,467 cents) |
| Outstanding | $78.33 (shift 12, Nov 5) |
| External reference | `WFCT22V79F3P` (Zelle) |
| Official payroll date | 2026-10-30 |
| Settled (bank) | 2026-11-03 (use actual timestamp Matt confirms) |

**Allocations (V1 — full source each):**

- All five owner-approved **historical entries** (Oct 15–20).
- Completed **time shifts 1–11** (production shift IDs on main).

**Do not allocate shift 12** in this payment.

**Operator action (founder UI or approved API):**

1. Ensure historical entries exist on production (apply owner-approved Oct 15–20 rows if not already present).
2. Record one external wage payment with reference `WFCT22V79F3P`, method Zelle, totals matching 107,467 cents.
3. Confirm My Time & Pay / payroll review shows outstanding $78.33 only on shift 12.
4. Period 2 review: $480.33 documented / $402.00 settled / $78.33 outstanding.

## QA reference

Preview and integration tests must use **QA-only** references (e.g. `KXD-QA-WAGE-…`). Never post test data against `WFCT22V79F3P` on non-production branches if it would confuse operators; on production, record the real reference once only.

## Ephemeral Neon QA branch

For isolated Postgres verification without conflicting preview data:

| Field | Example (Nov 2026 run) |
|--------|-------------------------|
| Branch | `staff-wage-ledger-qa-ephemeral` (`br-proud-bread-af1r71co`) |
| Endpoint | `ep-crimson-sky-afhyv5uw` |
| Parent | `main` (production snapshot, read-only parent) |

Set `KXD_WAGE_LEDGER_QA_ENDPOINT_ID` to the ephemeral endpoint when running QA scripts.
