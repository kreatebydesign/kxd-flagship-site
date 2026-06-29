# Client Command Actions (Phase 8E)

Executive action layer for KXD OS Client Command. Intelligence recommendations become trackable, executable workflows inside the client workspace.

## Collection

**`client-actions`** — Payload slug `client-actions`

Tracks executive actions with source, priority, status, action type, assignments, due dates, memory dedupe keys, and links to communications, projects, requests, and timeline events.

## Workspace

**Tab:** `/admin/operations/client-command/[clientId]?tab=actions`

Sections: Today's Priorities, Overdue, Upcoming, Revenue Opportunities, Retention Risks, Completed Recently.

Bulk operations: complete, dismiss, archive, assign, change priority, move due date.

## Intelligence sync

On workspace load:

1. Dismissed `memoryReference` counts feed Client Memory (3 dismissals suppress a recommendation).
2. Fast completions within 48h boost relationship health and momentum scores.
3. `syncIntelligenceActions` creates pending actions from `nextBestActions` using `intel:{actionId}` dedupe.

## API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/admin/client-command/actions` | GET | Load actions snapshot for client |
| `/api/admin/client-command/actions` | POST | Create action |
| `/api/admin/client-command/actions/[id]` | PATCH | Update action |
| `/api/admin/client-command/actions/bulk` | PATCH | Bulk update |
| `/api/admin/client-command/actions/quick` | POST | One-click intelligence operations |

## Timeline

Hooks on `client-actions` publish lifecycle events via `publishClientActivity`:

- `action.created`
- `action.assigned` (in-progress)
- `action.completed`
- `action.dismissed`
- `action.archived`
- `action.escalated` (waiting)

## Executive dashboard

Widget **Today's Client Priorities** on `/admin/operations/executive` — Critical, High, Due Today, Overdue, Needs Reply. Each item links directly to the client Actions tab.

## Memory persistence

Dismissals with `memoryReference` are counted; recommendations suppressed after 3 dismissals. Completed actions within 48 hours improve relationship health scoring for future intelligence runs.
