# KXD OS — Security Register (Edition 1)

**Living register** — verified findings, severity, ownership, release dependencies.  
Do not treat checklist items as complete without evidence in this file or linked PR/deploy records.

---

## SEC-2026-10-24-001 — Staff documents layout / SEC-001 (PR #110)

| Field | Value |
|-------|--------|
| **Severity** | High (restricted staff could be blocked from documents; interim auth-only layout risk on founder pages) |
| **Status** | **Production deployed** (2026-10-24) — merge `5cc44a28` (PR #110); premium UX follow-up PR #111 (`e6923139`) on prod `dpl_7e4MaYfgTo5gF6RntQwRSSyscE5a` |
| **PR** | https://github.com/kreatebydesign/kxd-flagship-site/pull/110 (merged); https://github.com/kreatebydesign/kxd-flagship-site/pull/111 (merged, presentation only) |
| **Owner** | Engineering |
| **Production deployment** | Vercel `dpl_7e4MaYfgTo5gF6RntQwRSSyscE5a` — **READY**; aliases include `www.kreatebydesign.com`, `portal.kreatebydesign.com` |
| **Post-deploy probes (unauthenticated, 2026-10-24)** | `GET /admin/operations/staff/documents` **307** → login; `GET /migrated-assets/brand/kxd-logo-transparent.png` **200**; `GET /api/db-health` **401** |
| **Authenticated smoke (Tyler documents UI)** | **UNVERIFIED** — no authorized session in release automation (2026-10-24) |
| **Evidence** | `verify:staff-documents-security-gate`, `verify:operations-layout-return-path`, `verify:staff-documents-page-access`, `verify:staff-documents`, `npm run build` |
| **Fix summary** | `(studio)/layout.tsx` fail-closed founder ops; `/staff` subtree unchanged; `resolveStaffAwarePathname` canonical path precedence; parent `operations/layout.tsx` auth-only |

---

## SEC-2026-10-22-002 — Node.js October 2026 security releases (Stripe email context)

| Field | Value |
|-------|--------|
| **Source** | [Node.js Oct 21, 2026 security releases](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases) |
| **CVE** | **CVE-2026-111497** (HIGH — Brotli decoder OOB via `node:zlib`) |
| **Affected lines** | **Node.js 22.x, 24.x, 26.x** (patched: **v22.23.4**, **v24.22.1**, **v26.12.1**) |
| **Vercel project** | `kxd-flagship-site` — **Node 24.x** (project setting) |
| **Diagnostic** | PR **#115** merged `c7a38193` — `GET /api/admin/system/database-target` returns `nodeRuntimeVersion` + `nodeRuntimeMeetsCve2026111497Minimum` (studio Payload **admin** only) |
| **Production deploy (2026-10-26)** | Vercel `dpl_EtXj1RSyf7L35rZ1rAoTDy4YSbnk` — **READY** @ merge `c7a381930956d39f9bacffe049d00758de11f717` |
| **Post-deploy probes (unauthenticated)** | `GET /api/admin/system/database-target` → **401** `Unauthorized`; `GET /api/db-health` → **401**; `GET /admin/operations/staff/documents` → **307**; `GET /` → **200** |
| **Live runtime patch proof** | **PENDING** — authenticated founder probe not yet recorded (requires Matt session on production) |
| **Status** | **UNVERIFIED** for CVE closure until live `nodeRuntimeVersion` shows **≥ v24.22.1** and `nodeRuntimeMeetsCve2026111497Minimum === true` |
| **Owner** | Matt + Engineering |
| **Verify** | `npm run verify:database-target-node-runtime`; production: `fetch('/api/admin/system/database-target', { credentials: 'include' })` while logged in as Payload **admin** |

---

## SEC-STRIPE-HISTORY-003 — Stripe key exposure (Git history)

| Field | Value |
|-------|--------|
| **Severity** | Medium until verified in Stripe Dashboard (unknown without Matt) |
| **Status** | **Investigated — no live key material in current tree** |
| **HEAD** | `sk_live_` string appears only in **fixtures / redaction / prefix checks** (e.g. `lib/stripe/integration-readiness-logic.ts`, verify scripts) — not `sk_live_[0-9…]` production shapes |
| **Tracked secrets** | **No** `.env` / `.env.local` in git |
| **History** | 7 commits touch `sk_live_` **pattern** in diffs; sampled history scan found **0** blobs matching `sk_live_[0-9a-zA-Z]{20,}` in first 754 commits (full history scan not completed) |
| **Rotation** | **Not performed** — requires Matt approval |
| **Owner** | Matt |

### Stripe rotation plan (approval required — do not execute without Matt)

1. **Inventory** — Stripe Dashboard → Developers → API keys: note live/test/restricted keys and last used.
2. **Map** — Vercel env vars (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, publishable keys) per Production / Preview / Development.
3. **Webhooks** — List endpoints (Checkout, invoices, Connect); record signing secrets per endpoint.
4. **Rotate test first** — New test secret → update Preview/Dev Vercel → smoke checkout + webhook (`stripe listen` or dashboard replay).
5. **Rotate live** — Maintenance window → new live secret → update Production Vercel only → redeploy → verify checkout, invoice, subscription, webhook delivery logs.
6. **Revoke old** — Only after 24h clean metrics and Matt sign-off.
7. **Rollback** — Keep previous secret restricted (not deleted) until validation complete; Vercel instant rollback deployment if needed.

---

## How to update

Add a row per incident with date, severity, evidence command output, PR SHA, and explicit **open / remediated / accepted risk** state.
