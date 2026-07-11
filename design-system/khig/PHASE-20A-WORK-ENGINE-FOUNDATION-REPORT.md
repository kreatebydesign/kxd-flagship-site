# Phase 20A — Work Engine Foundation

**Edition:** KXD OS Edition 1  
**Status:** Complete

## Architecture

```
Payload `work` collection (system of record)
        ↓
lib/work/runner + integration (mutations, spawn, timeline)
        ↓
lib/work/engine getWorkWorkspace() [React cache]
        ↓
lib/work/services.ts  ← public API for modules
        ↓
/admin/work editorial workspace
Morning Brief / Observer / Intelligence (shared cache)
```

This is an **additive** evolution of Phase 14B — not a rewrite, not a ClickUp clone.

## Status model

| Value | Label |
|-------|--------|
| `new` | Inbox |
| `planned` | Planned |
| `in-progress` | In Progress |
| `waiting-on-client` | Waiting on Client |
| `waiting-on-kxd` | Waiting on KXD |
| `blocked` | Blocked |
| `review` | Review |
| `completed` | Completed |
| `archived` | Archived |

`new` retained as the Inbox value for existing records.

## Public services

`createWorkItem`, `updateWorkItem`, `completeWorkItem`, `archiveWorkItem`,  
`getTodayWork`, `getUpcomingWork`, `getBlockedWork`, `getWaitingOnClient`,  
`getWaitingOnKXD`, `getOverdueWork`, `getWorkEngineWorkspace`

## Apply migration

```bash
npm run migrate
```

Migration: `20260727_phase20a_work_engine_foundation`
