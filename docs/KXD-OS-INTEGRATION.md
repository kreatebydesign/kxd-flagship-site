# KXD OS Integration Strategy

## Principle

The website is the front door. KXD OS is the operational layer behind it. This rebuild prepares integration contracts without building OS features.

## What Exists Now

- Payload collections with `kxdOs` reference fields on inquiries and platform applications
- Integration config in `lib/kxd-os/integration.ts`
- Collection-to-entity mapping for future sync
- Reserved routes: `/portal/*`, `/dashboard/*`, `/ops/*`

## What Does Not Exist Yet

- KXD OS API server
- Client portal UI
- CRM dashboard
- Support ticket system
- Workspace management
- Operational dashboards

## Integration Model

```
┌─────────────────┐         ┌──────────────────┐
│  KXD Website    │         │    KXD OS        │
│  (this repo)    │         │  (future repo)   │
├─────────────────┤         ├──────────────────┤
│ Payload CMS     │◄───────►│ CRM / Workspaces │
│ Inquiries       │  sync   │ Client Portals   │
│ Applications    │         │ Support          │
│ Projects        │         │ Dashboards       │
└─────────────────┘         └──────────────────┘
         │                           │
         └──── Shared Database ──────┘
              or REST API
```

## Entity Mapping

| Website Collection | KXD OS Entity |
|--------------------|---------------|
| `inquiries` | `lead` |
| `platform-applications` | `lead` |
| `projects` | `project` |

## Sync Fields

Each lead collection includes a `kxdOs` group:

```typescript
{
  leadId?: string;        // OS-assigned lead ID
  workspaceId?: string;   // OS workspace if created
  applicationId?: string; // Platform application reference
}
```

## Future Sync Triggers

1. **Inquiry created** → Create lead in KXD OS
2. **Platform application submitted** → Create qualified lead with platform metadata
3. **Project published** → Optional portfolio sync to client workspace
4. **Review synced from Google** → No OS action (website-only)

## API Contract (Prepared)

Environment variable: `KXD_OS_API_BASE_URL`

Future endpoints (not implemented):

```
POST /api/leads          ← from inquiry webhook
POST /api/applications   ← from platform application
GET  /api/workspaces/:id ← client portal auth
POST /api/support        ← client support requests
```

## Authentication Boundary

- Website admin: Payload `users` collection
- Client portal (future): KXD OS auth, separate from Payload admin
- Staff operations (future): KXD OS roles, not website CMS roles

## Why This Architecture

KXD builds operational platforms for clients (Primal OS, DCoGT portal, etc.). The flagship website must use the same architectural patterns — Payload as content layer, OS as operations layer — so future KXD OS features plug in without rebuilding the marketing site.

## Implementation Phases

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Website + Payload CMS | **Current** |
| 2 | Inquiry form + email routing | Next |
| 3 | Stripe deposits | Prepared |
| 4 | KXD OS lead sync API | Future |
| 5 | Client portal routes | Future |
| 6 | Support + dashboards | Future |
