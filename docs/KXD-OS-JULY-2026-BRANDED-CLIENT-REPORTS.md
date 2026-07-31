# KXD OS — July 2026 Branded Client Reports (Phase A)

**Status:** Approval-first foundation complete on local disposable database  
**Release date target:** July 31, 2026 (operator generation day)  
**Reporting period:** July 1–30, 2026 (July 31 excluded from finalized Google-data claims)

Companion docs: `docs/REPORTING-PROVIDERS.md`, `docs/KXD-OS-ROADMAP.md`

---

## Included in Phase A

- Approval-first lifecycle: `draft → in-review → approved → ready-for-manual-delivery → archived`
- Operator overview at `/admin/operations/reports`
- Client report workspace at `/admin/operations/reports/branded/[id]?clientId=`
- Verified-data-only composition from ReportingFacts + connection state
- Retainer/scope gating via experience-profile capabilities + operator confirmation (fail closed)
- Immutable approved snapshot + SHA-256 fingerprint
- Premium branded HTML preview + react-pdf PDF (KXD Report Engine tokens)
- Private PDF storage under `storage/branded-monthly-reports/` (gitignored)
- Manual download only — download does **not** mark a report as emailed
- Honest missing/partial/unavailable metric states
- Zero-baseline percentage protection (no infinite growth)
- Out-of-scope opportunities framed as optional upgrades only
- Internal notes excluded from client HTML/PDF

## Excluded from Phase A

- Automatic client email / delivery tracking
- Production email provider enablement
- Scheduled report generation
- SEO operations automation / indexing execution
- Live Stripe or production migration
- Fabricated analytics for clients lacking trustworthy data

---

## Lifecycle

1. Operator selects eligible client and generates a July draft.
2. Operator reviews data sources, scope, and narrative sections.
3. Operator may mark **in review**, then **approve** (explicit confirm).
4. Approval freezes an immutable snapshot + fingerprint.
5. PDF is generated from the approved snapshot only.
6. Download sets status to **ready for manual delivery** (not “sent”).
7. Reopening creates a new revision (version bump) and clears the prior approval lock.
8. Archive preserves historical evidence; superseded versions remain listed.

---

## Data provenance

Every quantitative claim must trace to:

- Stored `ReportingFacts`, and/or
- Fresh provider sync state, and/or
- Explicit “unavailable / not applicable” completeness

Each metric preserves source, window, comparison window, sync freshness, and provenance kind (`verified` | `derived` | `operator-authored` | `system-generated` | `missing`).

---

## Scope / entitlement behavior

| Capability | Client-facing sections |
|---|---|
| `base-website` | Cover, summary, website performance (when data exists), work completed, priorities |
| `seo` | Organic search metrics + SEO narrative |
| `google-ads` | Ads metrics + advertising narrative |
| `premium-partnership` | Premium combined framing (fail closed unless confirmed) |

Connected integrations alone never unlock paid scope. Ambiguous scope fails closed to base website management.

---

## Manual-delivery boundary

This release stores recipients for **future** use only. No scheduler and no email provider are wired to branded monthly reports. Operator downloads the PDF and delivers externally.

---

## PDF privacy

- Admin auth required (`requirePayloadAdminApi`)
- `clientId` must match the report’s client (cross-client denied)
- Approved snapshot fingerprint verified before PDF emit
- Storage keys are private; raw paths are not exposed in public URLs
- Internal notes never enter client HTML/PDF

---

## Roadmap boundaries

| Phase | Scope |
|---|---|
| **A** | July approval-first branded reports (this release) |
| **B** | SEO operations and indexing visibility |
| **C** | Scheduled report generation |
| **D** | Approved automatic email delivery, delivery tracking, failure handling, archive |
| **E** | Controlled SEO execution and upgrade recommendations |

---

## Local migration

Migration: `migrations/20260731_branded_client_monthly_reports.ts`

Apply only to approved local disposable DB:

```bash
npm run migrate:local
```

Production migration requires a separate dual-control approval and is **not** authorized by this phase.

---

## Verification

```bash
npm run verify:branded-client-reports
```

Fixture PDF/HTML QA artifacts write under `tmp/branded-client-reports-qa/` (untracked).
