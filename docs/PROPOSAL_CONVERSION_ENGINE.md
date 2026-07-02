# KXD OS Phase 9C — Proposal Conversion Engine

## Overview

Phase 9C connects approved proposals to client launch automation through an idempotent conversion engine, contract lifecycle management, and executive workspace surfaces.

## Architecture

### Module split (migrate-safe)

| Module | Path | Notes |
|--------|------|-------|
| Conversion engine | `lib/proposal-conversion/engine.ts` | Payload-safe — no `server-only` |
| Timeline publish | `lib/proposal-conversion/timeline-publish.ts` | Used by engine + hooks |
| Contract templates | `lib/contracts/templates.ts` | Merge fields — payload-safe |
| Contract timeline | `lib/contracts/timeline-publish.ts` | Payload hooks |
| Server barrel | `lib/proposal-conversion/index.ts` | Dashboard, data, intelligence |
| Client barrel | `lib/proposal-conversion/client.ts` | Types + display helpers |

### Collections

- `proposal-conversions` — unique per proposal; idempotent conversion record
- `contract-templates` — reusable templates with merge fields
- `contracts` — full lifecycle (draft → archived)
- `contract-activity` — contract event log

## Conversion flow

Approved proposal → `convertApprovedProposal()`:

1. Check `proposal-conversions` (unique `proposal`) — return if completed
2. Create/update client (mode-dependent)
3. Create/update project, retainer, onboarding, infrastructure
4. Create contract from template (deduped by proposal)
5. Queue launch actions (memory-reference deduped)
6. Create kickoff placeholder (`success-check-ins`)
7. Publish timeline events
8. Link all records back to proposal

### Conversion modes

- `new-client` — full new client launch
- `existing-client` — attach to existing client
- `project-expansion` — project only on existing client
- `retainer-only` — retainer record only
- `one-time` — project without retainer
- `hybrid` — full launch (default)

## Contract lifecycle

`draft` → `sent` → `viewed` → `signed` | `declined` | `expired` → `archived`

E-sign fields (`esignProvider`, `esignEnvelopeId`) reserved for future integration.

## Timeline events

- `proposal.converted`
- `contract.created`, `contract.sent`, `contract.viewed`, `contract.signed`, `contract.declined`, `contract.archived`
- `launch.started`, `launch.completed`

## API routes

- `POST /api/admin/proposal-conversion/[proposalId]/convert`
- `GET|POST /api/admin/sales/conversion/[id]` — delegates to conversion engine

## Executive surfaces

- **Dashboard** — Proposal Conversion widget (ready, converted, contracts, signed today, launch queue)
- **Client Command** — `?tab=contracts` with contract status, conversion history, intelligence

## Intelligence (deterministic)

Rule-based signals: ready to convert, unsigned contract, kickoff overdue, retainer gap, launch incomplete, onboarding gap.

## Migration

`20260714_phase9c_proposal_conversion_contracts` — tables + enums including `proposal.converted` activity type.
