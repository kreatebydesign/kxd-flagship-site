# Payload Migrations (KXD OS)

Operational guide for the official Payload migration workflow in this repository.

## Why this exists

Payload CLI loads `payload.config.ts` and the full collection/hook import graph.
Modules on that graph must be **Payload-safe** (no `import "server-only"`).

`npm run migrate` previously failed when a Shared Core helper used by a collection
hook carried a Next.js `server-only` boundary. Direct SQL plus manual
`payload_migrations` inserts is an **emergency fallback only** — not the standard path.

## Commands

| Command | Effect | Safety |
|---------|--------|--------|
| `npm run migrate:status` | Lists applied vs pending migrations | Read-only |
| `npm run migrate` / `npm run migrate:local` | Applies pending migrations | Local Postgres or SQLite only |
| `npm run migrate:production` | Applies pending migrations to remote Postgres | Requires `KXD_CONFIRM_PRODUCTION_MIGRATE=1` |
| `npm run migrate:unsafe` | Raw `payload migrate` with no target guard | Emergency / advanced only |

All guarded commands print the resolved **host + database name** (never credentials).

## Identify the resolved database target

Payload prefers `DATABASE_URI`, then `DATABASE_URL` (see `payload.config.ts`).
If neither is set, it falls back to SQLite (`PAYLOAD_SQLITE_PATH` or `file:./.payload/kxd.sqlite`).

Before any apply:

```bash
npm run migrate:status
```

Confirm the printed line:

```text
[KXD] Resolved DB target: kind=… host=… database=…
```

- **Local apply** requires `kind=local-postgres` or `kind=sqlite`.
- **Production apply** requires `kind=remote-postgres` and an explicit confirm env var.
- If `.env.local` points at Neon/production, `migrate` / `migrate:local` will refuse.

## Safe local workflow

1. Point env at an isolated database:
   - Local Postgres: `DATABASE_URI=postgres://…@127.0.0.1:5432/kxd_dev`
   - Or unset `DATABASE_URI` / `DATABASE_URL` and use SQLite for disposable tests
2. Inspect: `npm run migrate:status`
3. Apply: `npm run migrate:local` (or `npm run migrate`)
4. Re-check status; pending list should be empty

Do not use production credentials for write-capable local verification.

## Production workflow (deliberate)

1. Deploy the release that contains the new migration file(s).
2. Read-only inspect against production credentials:

   ```bash
   npm run migrate:status
   ```

3. Confirm:
   - Resolved host is the expected production database
   - Pending migrations match the release (expected names only)
   - No unexpected extra pending migrations
4. Apply only with explicit confirmation:

   ```bash
   KXD_CONFIRM_PRODUCTION_MIGRATE=1 npm run migrate:production
   ```

5. Re-run `npm run migrate:status` and confirm the new migration shows `Ran: Yes` exactly once.

## Checks before applying pending migrations

- [ ] Working tree / release commit matches the migration files being applied
- [ ] Resolved host/database is the intended target
- [ ] Pending names are expected for this release
- [ ] Backups / rollback plan understood for schema changes
- [ ] For production: `KXD_CONFIRM_PRODUCTION_MIGRATE=1` set intentionally for this session only

## If unexpected migrations are pending

1. **Stop** — do not apply.
2. Diff the pending names against the release commit and `migrations/`.
3. Determine whether files were committed early, renamed, or history diverged.
4. Resolve with an intentional release decision — do not delete or re-record rows casually.
5. Emergency SQL / manual `payload_migrations` bookkeeping only when the official CLI cannot run and Matt approves the procedure.

## Emergency fallback (not standard)

Use direct SQL + manual `payload_migrations` insert **only** when:

- The official CLI cannot load config (architecture bug), **or**
- An incident requires a controlled out-of-band apply

If used:

1. Apply additive SQL exactly matching the migration file
2. Record the migration name once in `payload_migrations`
3. File a follow-up to restore the official CLI path (this document’s purpose)
4. Never duplicate the migration name; never rewrite prior migration history

## Architecture rule for future migrations

Modules imported by `payload.config.ts`, collections, or hooks must remain Payload-safe.
Follow `lib/financial-command/timeline-publish.ts`, `lib/work/integration/events.ts`,
and `lib/infrastructure/preview-domain.ts`.

Next.js-only behavior (`server-only`, request APIs, React client modules) belongs in
route handlers / server adapters — not on the Payload config import graph.
