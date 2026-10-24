# KXD OS — Security Register (Edition 1)

**Living register** — verified findings, severity, ownership, release dependencies.  
Do not treat checklist items as complete without evidence in this file or linked PR/deploy records.

---

## SEC-2026-10-24-001 — Staff documents layout / SEC-001 (PR #110)

| Field | Value |
|-------|--------|
| **Severity** | High (restricted staff could be blocked from documents; interim auth-only layout risk on founder pages) |
| **Status** | **Remediated on branch** `feat/staff-documents-v1-finish` @ `7e0acb78` — **awaiting Matt merge/deploy approval** |
| **PR** | https://github.com/kreatebydesign/kxd-flagship-site/pull/110 |
| **Owner** | Engineering |
| **Evidence** | `verify:staff-documents-security-gate`, `verify:operations-layout-return-path`, `verify:staff-documents-page-access`, `npm run build` |
| **Fix summary** | `(studio)/layout.tsx` fail-closed founder ops; `/staff` subtree unchanged; `resolveStaffAwarePathname` canonical path precedence; parent `operations/layout.tsx` auth-only |

---

## SEC-2026-10-22-002 — Node.js October 2026 security releases (Stripe email context)

| Field | Value |
|-------|--------|
| **Source** | [Node.js Oct 21, 2026 security releases](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases) |
| **Highest** | HIGH (incl. **CVE-2026-111497** Brotli decoder OOB → potential RCE via `node:zlib`) |
| **Affected lines** | **Node.js 22.x, 24.x, 26.x** (patched: **v22.23.4**, **v24.22.1**, **v26.12.1**) |
| **KXD repo** | No `engines` in `package.json`; no `.nvmrc`; `vercel.json` has no Node pin; local dev observed **v20.20.2** |
| **Assessment** | **Oct 2026 CVE set does not list Node 20.x** in official release notes. If Vercel production runtime is **20.x**, these specific patches may not apply; **confirm runtime in Vercel project settings** (not verified in this session — MCP scope 403). |
| **Status** | **Monitor / verify runtime** — separate runtime PR if production uses 22+ or when upgrading to 22 LTS |
| **Owner** | Matt + Engineering |
| **Dependency** | Vercel project Node version; optional `.nvmrc` + `engines` after runtime confirmation |

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
