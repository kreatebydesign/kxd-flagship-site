# Client AI Memory

Phase 8D — deterministic executive intelligence for every client workspace.

## Overview

Client AI Memory analyzes **real workspace data** (timeline, communications, projects, requests, retainers, invoices, check-ins, notes, infrastructure, audits, launch QA) and produces:

- Executive summary
- Scored health dimensions
- Wins, risks, follow-ups, opportunities
- Next best actions with deep links

No external LLM calls in this phase. Rules are transparent and extensible.

## Architecture

```
ClientWorkspaceBundle (8A workspace data)
        ↓
lib/client-command/memory/signals.ts     → extract MemorySignal[]
lib/client-command/memory/insights.ts    → wins, risks, scores
lib/client-command/memory/recommendations.ts → next best actions
lib/client-command/memory/summary.ts     → ClientMemorySnapshot
        ↓
Client Command Center Intelligence tab + Overview teaser
        ↓
Optional: POST /api/admin/client-command/memory/snapshot
        → publishClientActivity() → executive-timeline-events
```

## Module files

| File | Role |
| --- | --- |
| `types.ts` | Snapshot, scores, signals, actions |
| `signals.ts` | Deterministic rules over workspace bundle |
| `insights.ts` | Group signals + compute 0–100 scores |
| `recommendations.ts` | Next best actions |
| `summary.ts` | `buildClientMemory()`, `buildClientMemoryAiPayload()` |
| `load.ts` | `loadClientMemoryFromBundle()` |

## Scores (0–100)

| Score | Meaning |
| --- | --- |
| `relationshipHealthScore` | Health score + wins minus contact/comm risks |
| `revenueOpportunityScore` | Retainer gaps, growth/sales signals |
| `urgencyScore` | Follow-ups, blockers, critical launch QA |
| `retentionRiskScore` | Stale contact, risks, no retainer |
| `momentumScore` | Recent wins and positive delivery |

## Deterministic rules (examples)

| Signal ID | Trigger |
| --- | --- |
| `comm-needs-reply` | Communications with `needs_reply` status |
| `comm-overdue-followups` | Past-due follow-up dates |
| `comm-stale` | Open communications > 7 days |
| `stale-contact` | No contact > 30 days |
| `open-requests` | Open client requests |
| `no-retainer` | Active client, zero retainers |
| `launch-blockers` | Launch QA critical blockers |
| `low-audit-score` | Website health score < 70 |
| `low-infra-score` | Infrastructure score < 60 |
| Timeline wins | Launch/payment/completed events in last 30 days |

Rules also ingest existing `bundle.recommendations` from portfolio intelligence.

## UI

**Route:** `/admin/operations/client-command/[clientId]?tab=intelligence`

**Sections:** Executive summary, score grid, wins, risks, follow-ups, opportunities, upsell ideas, next best actions, memory notes (pinned executive notes).

**Overview:** Intelligence compact chapter + urgency banner when `urgencyScore >= 65`.

**Timeline:** “Publish timeline snapshot” → `intelligence.snapshot` activity event.

## Future AI adapter points

### `buildClientMemoryAiPayload(bundle)`

Returns structured JSON for LLM context without re-running UI:

- `scores`, `executiveSummary`, `signals`, `nextBestActions`

### KXD Brain ingestion (future)

1. Call `buildClientMemoryAiPayload()` per client on schedule or on-demand.
2. Write condensed snapshot to `brain-memory` with `client` relation and `eventType: client-memory-snapshot`.
3. Brain reasoning layer merges with portfolio signals (`lib/brain/reasoning.ts`).
4. Optional: replace `buildExecutiveSummaryLines()` with LLM narrative while keeping scores/rules as guardrails.

### External AI (future)

- Pass `ClientMemoryAiPayload` as system context to any adapter.
- Require citations: each LLM bullet must reference `signal.id` or `href`.
- Do not call external APIs until product opts in — deterministic layer remains source of truth.

## API

`POST /api/admin/client-command/memory/snapshot`

Body: `{ "clientId": number }`

Publishes timeline event via Phase 8B activity engine (dedupe key uses timestamp-based `sourceId`).

## Testing

1. Open client workspace with projects, communications, or open requests.
2. Go to **Intelligence** tab — verify scores and actions reflect real data.
3. Click **Publish timeline snapshot** — confirm event on Timeline tab.
4. Overview should show intelligence summary and link when urgency is high.

Empty states appear when no signals match — not placeholder fiction.
