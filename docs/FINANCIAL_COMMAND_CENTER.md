# KXD OS Phase 9D — Financial Command Center

## Overview

Phase 9D adds the financial operating layer for KXD OS — executive revenue intelligence, client billing profiles, normalized revenue events, and deterministic snapshots. This is **not** payment processing; Stripe, QuickBooks, and Wave integration fields are future-ready only.

## Architecture

### Module split (migrate-safe)

| Module | Path | Notes |
|--------|------|-------|
| Snapshot builders | `lib/financial-command/snapshots.ts` | Payload-safe — derives from collections |
| Revenue publish | `lib/financial-command/timeline-publish.ts` | Payload-safe — hooks + migrate |
| Rebuild engine | `lib/financial-command/rebuild.ts` | Payload-safe |
| Billing profiles | `lib/financial-command/billing-profile.ts` | Payload-safe |
| Dashboard / data | `lib/financial-command/dashboard.ts`, `data.ts` | `server-only` |
| Intelligence | `lib/financial-command/intelligence.ts` | Deterministic rules, `aiReady` |
| Server barrel | `lib/financial-command/index.ts` | App imports |
| Client barrel | `lib/financial-command/client.ts` | Client Components |

### Collections

| Collection | Slug | Purpose |
|------------|------|---------|
| Billing Profiles | `billing-profiles` | Per-client billing configuration (unique `client`) |
| Revenue Events | `revenue-events` | Normalized revenue lifecycle log (dedupe via `dedupeKey`) |
| Financial Snapshots | `financial-snapshots` | Persisted executive/client snapshot metrics |
| Client Financial Health | `client-financial-health` | Per-client health score, risk, recommendations |

## Snapshot engine

Deterministic builders derive from:

- **Clients** — active status, retainer amounts
- **Retainers** — MRR, renewals, billing status
- **Client Projects** — project value
- **Proposals** — pipeline value
- **Contracts** — contracted / at-risk revenue
- **Billing Profiles** — missing setup detection
- **Revenue Events** — lifetime value enrichment

Snapshot types: `executive`, `client`, `mrr`, `pipeline`, `contracted`, `renewal`, `at-risk`

Rebuild via `POST /api/admin/financial-command/rebuild`.

## Billing profile fields

- Billing contact, email, payment preference, invoice cadence, payment terms
- Billing status: `not-configured` → `active`
- Missing setup flags (auto-derived + stored)
- Future: `stripeCustomerId`, `stripeSubscriptionId`, `quickbooksCustomerId`, `waveCustomerId`

## Revenue events

Published via Payload hooks on proposals, contracts, retainers, projects, and proposal conversion:

- `revenue.proposal-approved`, `revenue.proposal-converted`
- `revenue.contract-signed`
- `revenue.retainer-started`, `revenue.retainer-renewed`, `revenue.retainer-ended`
- `revenue.project-launched`, `revenue.project-completed`
- `billing.setup-missing`, `revenue.at-risk`, `revenue.recovered` (intelligence/rebuild)

Timeline: executive-timeline-events via `publishClientActivity`.

## Executive Dashboard

**Financial Command** widget: MRR, pipeline, contracted revenue, projected annual value, at-risk revenue, alerts, top clients by revenue.

## Client Command

- **Financial tab** (`?tab=financial`) — revenue profile, billing, events, intelligence
- **Overview** — Financial snapshot block with MRR, contracted, pipeline, LTV, billing status

## Intelligence (deterministic)

Rule-based signals: missing billing, renewal approaching, contract without billing, approved-not-converted, revenue at risk, upsell, underpriced retainer, retainer review. Marked `aiReady` for future KXD Brain.

## API routes

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/admin/financial-command` | Executive metrics + widget |
| POST | `/api/admin/financial-command/rebuild` | Rebuild snapshots + health |
| GET | `/api/admin/financial-command/client/[clientId]` | Client financial snapshot |
| PATCH | `/api/admin/financial-command/client/[clientId]/billing-profile` | Upsert billing profile |

## Future integrations

- **Stripe** — `stripeCustomerId`, `stripeSubscriptionId` on billing profiles
- **QuickBooks / Wave** — customer ID fields reserved
- **Profitability engine** — extend snapshots with cost data from `infrastructure-costs`

## Migration

`20260715_phase9d_financial_command_center`
