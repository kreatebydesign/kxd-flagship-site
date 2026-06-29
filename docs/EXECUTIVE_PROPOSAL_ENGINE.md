# Executive Proposal & Estimate Engine (Phase 9A)

Sales engine layer for KXD OS — proposals, estimates, templates, approvals, and executive pipeline visibility.

## Collections

| Slug | Purpose |
|------|---------|
| `proposal-templates` | Reusable executive proposal templates |
| `proposals` | Extended with lifecycle, pricing, project/retainer links |
| `proposal-sections` | Reusable builder blocks (Phase 6A) |
| `estimate-items` | Line items — pricing engine input |
| `proposal-approvals` | Approval and revision history |
| `proposal-activity` | Executive lifecycle activity log |

## Lifecycle statuses

Draft → Internal Review → Sent → Viewed → Questions → Revision Requested → Approved / Declined / Expired / Archived

Timeline events: `proposal.created`, `proposal.internal-review`, `proposal.sent`, `proposal.viewed`, `proposal.question`, `proposal.revised`, `proposal.approved`, `proposal.declined`, `proposal.expired`, `proposal.archived`

## Pricing engine

`lib/executive-proposals/pricing.ts` — fixed, hourly, monthly retainer, quantity, optional upgrades; discounts; tax-ready; projected annual value.

Estimate items auto-sync proposal `pricingSnapshot` and investment fields.

## Integrations

- **Executive Dashboard** — Proposal Pipeline widget (pending, viewed, follow-up, approved, expiring, pipeline value, forecast)
- **Client Command** — `?tab=proposals` with current proposal, history, approvals, intelligence signals
- **Timeline** — Client Command activity + executive timeline + `proposal-activity` records
- **Intelligence** — Rule-based `buildProposalIntelligence()` — future-ready for KXD Brain (no AI in 9A)

## API

`POST /api/admin/executive-proposals/sync-pricing` — recalculate proposal totals from estimate items.

## Builder

Executive builder remains at `/admin/sales/proposals` — Phase 9A extends data model and OS surfaces without replacing the sales UI.
