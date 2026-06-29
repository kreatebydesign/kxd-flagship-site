# Client Communications Layer

Phase 8C — internal communications foundation for KXD OS Client Command Center.

## Overview

Client communications are stored in Payload and surfaced in the client workspace **Communications** tab (`?tab=emails` for route compatibility).

This phase is **manual capture + follow-up intelligence**, not live Gmail or inbox sync.

## Collection: `client-communications`

| Field | Type | Notes |
| --- | --- | --- |
| `client` | relation → `clients` | Required |
| `type` | select | `email`, `call`, `meeting`, `text`, `note`, `form_submission`, `campaign_update`, `support_followup` |
| `direction` | select | `inbound`, `outbound`, `internal` |
| `status` | select | `logged`, `needs_reply`, `replied`, `resolved`, `archived` |
| `priority` | select | `low`, `normal`, `high`, `urgent` |
| `date` | datetime | When the communication occurred |
| `followUpDate` | date | Optional follow-up reminder |
| `subject` | text | |
| `summary` | textarea | |
| `bodyPreview` | textarea | Short excerpt for list views |
| `contactName` | text | |
| `contactEmail` | email | |
| `participants` | array | `{ name, email }` |
| `source` | text | e.g. `manual`, `gmail`, `resend`, `contact-form` |
| `relatedProject` | relation → `client-projects` | |
| `relatedRequest` | relation → `client-requests` | |
| `metadata` | json | Integration payloads |

Payload admin: `/admin/collections/client-communications`

## Application layer

| Path | Role |
| --- | --- |
| `lib/client-command/communications/types.ts` | Types |
| `lib/client-command/communications/data.ts` | Load, create, update, follow-up snapshot |
| `lib/client-command/communications/activity.ts` | Timeline publish bridge |
| `payload/hooks/client-communications.ts` | Auto-publish on create |

## API

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/admin/client-command/communications` | POST | Create communication |
| `/api/admin/client-command/communications/[id]` | PATCH | Update status, priority, follow-up date |

## Timeline integration (Phase 8B)

On **create**, `publishCommunicationActivityHook` publishes to `executive-timeline-events`:

- **Email** → `publishEmailActivity()` → `email.logged`
- **Other types** → `publishClientActivity()` → `communication.{type}` with `sourceModule: Communications`

Dedupe uses communication record ID as `sourceId`.

## Follow-up intelligence

`buildCommunicationsSnapshot()` computes:

- `upcomingFollowUps` — follow-up date today or later, open status
- `overdueFollowUps` — follow-up date before today, open status
- `needsReplyCount` — status `needs_reply`
- `staleUnresolvedCount` — open communications older than 7 days
- `hasStaleUnresolved` — flags workspace header + overview banner

## UI

**Tab:** `/admin/operations/client-command/[clientId]?tab=emails` (label: Communications)

Features:

- Search, filter by type/status/priority
- Timeline-style grouped list
- Quick capture form (Add Communication, Log Email, Log Call, Log Meeting Follow-up)
- Row actions: Needs Reply, Resolved, Set Follow-up Date
- Overview panel: open count, needs reply, overdue/upcoming follow-ups
- Nav badge when `needsReplyCount > 0`

## Future: Gmail / Google Workspace

Integration points (not implemented in this phase):

1. **Inbound sync** — OAuth → poll or push Gmail API → `createClientCommunication()` with `source: gmail`, `metadata: { threadId, messageId }`
2. **Outbound tracking** — log sent mail from Workspace send-as or Resend with same metadata shape
3. **Dedupe** — use `metadata.gmailMessageId` as stable `sourceId` for activity dedupe
4. **Body** — store `bodyPreview` from snippet; full body in `metadata` or separate storage later

Hook: extend `publishCommunicationActivity` — no workspace UI changes required once records exist.

## Future: Resend / form submissions

1. **Resend webhooks** — `email.delivered`, `email.opened` → `type: email`, `direction: outbound`, `source: resend`
2. **Contact forms** — `/api/inquiries` or `/api/project-inquiries` handlers → `type: form_submission`, `source: contact-form`
3. **Campaign updates** — marketing automation → `type: campaign_update`, `source: resend` or CRM

Store event payload in `metadata` for audit and future threading.

## Testing

1. Open a client workspace → **Communications** tab.
2. **Log Email** with subject + summary → appears in list and Timeline tab after refresh.
3. **Mark Needs Reply** → status badge updates; overview needs-reply count increases.
4. Set **follow-up date** → appears in overview upcoming list.
5. Create communication older than 7 days with open status (Payload admin) → stale banner on workspace header.

## Migration

`migrations/20260711_phase8c_client_communications.ts` — run `npm run migrate` on Postgres deployments.
