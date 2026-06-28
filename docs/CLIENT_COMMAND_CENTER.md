# Client Command Center

KXD OS operational home for every client relationship.

## Routes

| Route | Purpose |
| --- | --- |
| `/admin/operations/client-command` | Searchable client hub |
| `/admin/operations/client-command/[clientId]?tab=` | Per-client workspace |
| `/admin/operations/client-command/backfill` | Manual activity backfill |

## Activity Engine (Phase 8B)

The Activity Engine is the permanent memory layer for client relationships. Any meaningful client action should create a timeline event tied to that client.

### Architecture

```
KXD OS module (hook, API, or manual UI)
        ↓
lib/client-command/activity/publish.ts  →  publishClientActivity()
        ↓
lib/executive-timeline/create-event.ts  →  executive-timeline-events collection
        ↓
Client Command Center Timeline tab (load + formatters)
```

**Canonical storage:** `executive-timeline-events` (primary). Legacy `client-timeline-events` are still read and merged for display.

**Dedupe:** Before create, the publish layer checks for an existing event with the same `clientId`, `eventType`, and `metadata.dedupeKey` (`sourceId:eventType`). Re-runs and backfills are safe.

**Extended metadata** (when not a top-level collection field): `sourceType`, `sourceId`, `relatedLinks`, `attachments`, `author`, `priority` live in `metadata` JSON on the timeline record.

### Core files

| File | Role |
| --- | --- |
| `lib/client-command/activity/types.ts` | Activity input/result types |
| `lib/client-command/activity/rules.ts` | Category, importance, status defaults |
| `lib/client-command/activity/formatters.ts` | Icons, date grouping, doc → UI mapping |
| `lib/client-command/activity/publish.ts` | Publish helpers + dedupe |
| `lib/client-command/activity/load.ts` | Load merged timeline for workspace |
| `lib/client-command/activity/backfill.ts` | Idempotent historical scan |
| `payload/hooks/client-activity.ts` | Payload collection auto-publish hooks |

### Publishing events

Always prefer the typed helpers — they set `sourceModule`, relations, and dedupe keys correctly.

```ts
import {
  publishClientActivity,
  publishProjectActivity,
  publishRequestActivity,
  publishInvoiceActivity,
  publishRetainerActivity,
  publishNoteActivity,
  publishMeetingActivity,
  publishInfrastructureActivity,
  publishDeploymentActivity,
  publishEmailActivity,
} from "@/lib/client-command/activity";

await publishProjectActivity({
  clientId: 12,
  projectId: 45,
  eventType: "project.launched",
  title: "Project launched · Brand refresh",
  summary: "Live at https://example.com",
});
```

For one-off or custom modules, use `publishClientActivity()` with a stable `sourceId` and `eventType`.

Pass an existing `payload` instance when calling from Payload hooks to avoid extra connections.

### Auto-publish (Payload hooks)

| Collection | Events |
| --- | --- |
| `client-projects` | `project.created`, `project.launched` |
| `client-requests` | `request.opened`, `request.completed` |
| `proposals` | `proposal.created`, `invoice.paid` |
| `retainers` | `retainer.created`, `retainer.renewed` |
| `executive-notes` | `note.created` |
| `success-check-ins` | `meeting.logged` |
| `client-infrastructure` | `infrastructure.created`, `infrastructure.updated` |

### Manual activity (workspace UI)

On the Timeline tab:

- **Add Note** — creates `executive-notes` + timeline via hook
- **Log Meeting** — creates `success-check-ins` + timeline via hook
- **Add Timeline Event** — manual `timeline.manual` on `executive-timeline-events`

API: `POST /api/admin/client-command/activity`

### Backfill

`backfillClientActivity({ clientId?, limit? })` scans existing records and publishes missing events. Idempotent — duplicates are skipped.

**UI:** `/admin/operations/client-command/backfill`  
**Server action:** `runClientActivityBackfill(clientId?)` in `lib/client-command/activity/actions.ts`

Run backfill after deploying Phase 8B to populate timelines from historical data.

### How future modules should write to the timeline

1. Import the closest helper from `lib/client-command/activity/publish.ts`.
2. Use a stable `sourceId` (record ID or deterministic key).
3. Use a stable `eventType` string (e.g. `module.action`).
4. Set `sourceModule` to a value allowed on `executive-timeline-events.sourceModule` (extend types + collection options if needed).
5. Do not call `payload.create` on `executive-timeline-events` directly — use the publish layer for dedupe and consistent metadata.
6. For bulk historical import, call the same helpers from backfill logic.

### Testing

1. Open `/admin/operations/client-command` and search for a client (e.g. any live Payload client).
2. Open workspace → **Timeline** tab.
3. Use **Add Note**, **Log Meeting**, or **Add Timeline Event** — entries should appear grouped by date.
4. Create a project or request in Payload — timeline should update on next refresh.
5. Run backfill from hub link or `/admin/operations/client-command/backfill` — skipped count should rise on second run.

For a specific client, pass their numeric `clientId` on the backfill page to scope the scan.
