# K&N proposals — executive polish report (Matt)

**Branch:** `polish/kn-proposals-executive`  
**Date:** October 23, 2026  
**Scope:** Content and PDF/HTML presentation for proposals **11** and **12** only. PR **#103** payment/operations integration is out of scope.

## Summary

| Proposal | Number | Investment | Change type |
|----------|--------|------------|-------------|
| Option A | KXD-P-2026-0009 | $39,500 | Executive narrative, roadmap formatting, exclusions, dual-proposal CTA, Option A IP fix |
| Option B | KXD-P-2026-0010 | $49,500 | Same shared scope/roadmap/terms updates; Option B IT-conditional recommendation; +$10k value framing |

**Code (requires deploy for PDF layout):**

- `lib/proposal-builder/export-pdf.tsx` — roadmap deliverable titles and descriptions split (reduces awkward wrapping).
- `lib/proposal-builder/export-html.ts` — matching deliverable detail block for browser preview.

**Content (database):**

- `lib/proposal-builder/kn-proposals-executive-polish.ts` — canonical patch definitions.
- `scripts/polish-kn-proposals-executive.ts` — dry-run export to `.cache/` or `CONFIRM_POLISH=kn-proposals-11-12` to update Payload.

## Before → after (high level)

### Both proposals

- **Exclusions** — Explicitly call out back-end development and **production testing** alongside CMS/Magento, deployment, hosting, and Find Your Filter.
- **Enterprise scope** — Clarify ~38 pages in template families; inventory and acceptance criteria live in discovery + **final agreement** (no invented template list).
- **Roadmap** — Overview explains parallel Phases 3–4 and IT ownership of production path; each phase description uses four lines (KXD / K&N / IT / approval gate) for PDF and HTML readability.

### Option A only (11)

- **Executive summary** — Marketing + IT business value; reinforced exclusions.
- **Intro** — Labels Option A and companion Option B by proposal number and price.
- **Next steps** — Compare both proposals; explains what the additional $10k in Option B buys without recommending Option B unconditionally.
- **IP summary** — Removed erroneous “Option B reference” language; refers to agreed design-source deliverables.

### Option B only (12)

- **Executive summary** — Reference vs. production boundary clarified.
- **Intro** — Same creative scope as Option A + $10k for reference, staging, rolling handoffs.
- **Recommended direction** — Conditional on K&N IT workflow approval; states Next.js/React **not** pre-approved.
- **Next steps** — Mirror Option A with cross-reference to 0009.

## Commercial risks

See [KN-PROPOSAL-COMMERCIAL-FLAGS.md](./KN-PROPOSAL-COMMERCIAL-FLAGS.md).

## Verification

| Check | Result |
|-------|--------|
| Payment math 40/30/30 | Asserted in polish script (unchanged cents) |
| Internal notes leakage | `assertNoInternalLeakage` on canonical export |
| Forbidden internal phrases in HTML | Script asserts before write |
| Production operator preview UI (authenticated) | **Not verified** — no operator session in agent environment |
| Production PDF after code deploy | Re-export after merge/deploy of PDF/HTML changes |
| Send / share / invoice / agreement | **Not executed** — awaiting your approval |

### Commands

```bash
# Dry run — writes .cache/kn-proposal-{11,12}-polished-preview.html and PDF filenames from builder
npx tsx --env-file=.env.production.local scripts/polish-kn-proposals-executive.ts

# Apply content to Neon (after you approve copy)
CONFIRM_POLISH=kn-proposals-11-12 npx tsx --env-file=.env.production.local scripts/polish-kn-proposals-executive.ts
```

## Ready to send?

**After** you approve copy, **after** optional `CONFIRM_POLISH` run, and **after** deploying the PDF/HTML layout branch: re-open both proposals in KXD OS, regenerate PDFs, and confirm all 10 pages visually. Until then: **not ready for client send** — internal-review polish complete pending your sign-off.
