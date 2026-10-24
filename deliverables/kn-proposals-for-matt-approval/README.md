# K&N proposals — Matt approval (PR #104)

**Generated from production proposal records 11 & 12 with executive polish applied in-memory only.**  
Production database records are **not** updated until Matt runs `CONFIRM_POLISH=kn-proposals-11-12`.

| File | Proposal | Investment |
|------|----------|------------|
| `KXD-P-2026-0009-KN-Option-A-Enterprise-UX-UI-FINAL.pdf` | Option A (ID 11) | $39,500 |
| `KXD-P-2026-0010-KN-Option-B-Interactive-Code-First-FINAL.pdf` | Option B (ID 12) | $49,500 |

Companion `.html` files match PDF content for browser review.

Regenerate:

```bash
KXD_SERVER_ONLY_SHIM=1 npx tsx --import ./scripts/shims/register-server-only.mjs --env-file=.env.production.local scripts/polish-kn-proposals-executive.ts
```

Visual QA:

```bash
npx tsx scripts/qa-kn-proposal-pdf-visual.ts
```
