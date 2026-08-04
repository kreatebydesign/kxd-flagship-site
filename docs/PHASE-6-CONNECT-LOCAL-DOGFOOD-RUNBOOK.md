# Phase 6 — Local Connect Dogfood Runbook (Batch C4)

**Scope:** controlled **local internal dogfooding** only.  
**Not:** production rollout, public availability, portal exposure, or navigation enablement.

Connect remains **OFF by default**. Activation is intentional and operator-driven.

---

## Prerequisites

1. Branch with C0–C4 Connect work available locally
2. Local database only (`127.0.0.1` / `localhost` Postgres or SQLite)
3. Migrations applied locally:
   ```bash
   npm run migrate:local
   ```
4. Local fixtures (optional but recommended for multi-staff smoke):
   ```bash
   CONNECT_LOCAL_FIXTURE_PASSWORD='…' npm run bootstrap:connect-local-fixtures
   ```
5. `.env.local` configured (never production):
   ```bash
   KXD_CONNECT_ENABLED=1
   KXD_CONNECT_ORG_ALLOWLIST=kxd
   KXD_CONNECT_STAFF_DOGFOOD_EMAILS=connect-a@kxd.local,connect-b@kxd.local,connect-c@kxd.local
   # Optional emergency: KXD_CONNECT_KILL_SWITCH=1
   ```
6. Next.js process restarted after any `.env.local` change
7. Confirm Postgres atomic meter path for meaningful dogfood traffic (`verify:phase6-batch-c3-metering` when local Postgres is available)

---

## Activation architecture (evaluation order)

Every layer must pass. Failure at any step fails closed. Decisions are **not cached**.

1. **Global kill switch** — `KXD_CONNECT_KILL_SWITCH=1` ⇒ deny  
2. **Global Connect feature enabled** — edition feature `kxd-connect` **or** `KXD_CONNECT_ENABLED=1`  
3. **Environment allows Connect** — non-production (`NODE_ENV` / `VERCEL_ENV` ≠ `production`)  
4. **Local operator activation** — `.connect/local-activation.json` with `enabled: true`  
5. **Subject kind** — staff only; portal identities denied  
6. **Staff allowlisted** — activation-file emails (else env CSV); empty ⇒ deny  
7. **Organization allowlisted** — activation-file keys (else env CSV); empty ⇒ deny  
8. **Organization active**  
9. **Membership active**  
10. **C1 messaging authorization** (conversation / participation) when using messaging APIs

---

## Local activation

```bash
# Inspect current layers (does not enable)
npm run connect:local-status

# Intentional enable — copies env allowlists into .connect/local-activation.json
npm run connect:local-enable
```

Enable is **idempotent**. Re-running refreshes allowlists from the current env.

Confirm:

- `dogfoodLayersReady: true` in status output  
- Allowlisted staff can open `/admin/connect` (direct URL only)  
- `GET /api/admin/connect/status` reports `localActivationEnabled: true` (still `uiAvailable: false` — no public exposure flag)

---

## Local deactivation

```bash
npm run connect:local-disable
```

Disable is **idempotent** and takes effect on the **next request** (activation file re-read; no deploy).

---

## Verification procedure

```bash
npm run verify:phase6-batch-c0
npm run verify:phase6-batch-c1
npm run verify:phase6-batch-c2
npm run verify:phase6-batch-c3
npm run verify:phase6-batch-c4

npm run connect:local-status
npm run connect:local-enable

# Structured multi-session operating period (service layer)
npm run dogfood:connect-local

# With fixtures + enablement + Next started with Connect env:
# sign in as allowlisted staff → /admin/connect
# sign in as non-allowlisted staff → unavailable

npm run connect:local-disable
```

C5 findings live in `docs/PHASE-6-KXD-CONNECT.md` (Batch C5 section).

---

## Rollback procedure (no deployment)

Immediate options (any one is sufficient to block Connect):

1. `npm run connect:local-disable`  
2. Remove a staff email from `KXD_CONNECT_STAFF_DOGFOOD_EMAILS`, then `npm run connect:local-enable` (syncs file) — or rewrite the activation file staff list  
3. Set organization membership to inactive / disable org  
4. Set `KXD_CONNECT_KILL_SWITCH=1` and restart Next (env-based; use when process restart is acceptable)  
5. Unset `KXD_CONNECT_ENABLED` and restart Next  

Authorization never survives rollback through caching — access is re-evaluated per request.

---

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Enable refuses | Not production? Local DB? `KXD_CONNECT_ENABLED=1`? Allowlists non-empty? Kill switch off? |
| Status shows layers ready but UI unavailable | Active Connect membership? Staff email exactly on allowlist? Org key `kxd` active? |
| Env change ignored | Restart `npm run dev` after `.env.local` edits |
| Still allowed after disable | Confirm `.connect/local-activation.json` has `"enabled": false`; hard-refresh; confirm you hit this repo’s Next process |
| Ops log location | `.connect/ops.log` (gitignored; no message bodies) |

---

## Expected authorization flow

Staff session → `resolveConnectStaffSession` → `evaluateConnectAccess` (layers above) → messaging authorization → UI/API.

Operational logs record activation/deactivation and authorization success/failure reasons. **Never** message or conversation content.

---

## Known limitations

- Local dogfood only — not production, not GA  
- No Connect entry in global navigation  
- No portal / client Connect  
- No notifications, presence, attachments, search, AI, dock, Buddy List  
- Env kill switch / `KXD_CONNECT_ENABLED` require process restart; local activation file disable does not  
- SQLite metering RMW remains a dogfood traffic blocker when Postgres is unavailable  
- Soft residual: Connect org `afterChange` audit FK race (logged, non-blocking)

---

## Explicit non-goals

Do not treat C4 as authorization to:

- Push or deploy  
- Migrate or configure production  
- Enable Connect for production users  
- Expose Connect publicly or in navigation  
- Expand messaging product scope
