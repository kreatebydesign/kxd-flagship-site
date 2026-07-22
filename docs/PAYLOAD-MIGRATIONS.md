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
| `npm run migrate` / `npm run migrate:local` | Applies pending migrations in **`migrations/index.ts` order** | Local Postgres or SQLite only |
| `npm run migrate:production` | Applies pending migrations in **`migrations/index.ts` order** | Requires `KXD_CONFIRM_PRODUCTION_MIGRATE=1` |
| `npm run migrate:unsafe` | Raw `payload migrate` (filesystem lexicographic order, no target guard) | Emergency / advanced only |
| `npm run verify:migration-bootstrap` | Full empty-DB bootstrap + schema checks | Local Postgres only; requires `KXD_BOOTSTRAP_VERIFY=1` |

All guarded commands print the resolved **host + database name** (never credentials).

## Migration discovery vs apply order

Payload’s built-in file reader uses `fs.readdirSync(migrationDir).sort()` (lexicographic).
That is **not** dependency order. Example:

- Lexicographic: `…phase33a1…` → `…phase33a2…` → `…phase33a_…`
- Required: `…phase33a_…` (creates `reporting_sync_states`) → `…phase33a1…` → `…phase33a2…`

`migrations/index.ts` is the **authoritative apply order** for guarded migrate commands.
Do not re-enable `prodMigrations` in `payload.config.ts` (removed to avoid Vercel cold-start hangs).

`migrate:unsafe` still uses lexicographic file order and can fail on empty databases.

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
- Prefer **local Postgres** for full historical bootstrap (migrations are Postgres DDL).

## Safe local workflow (forward migrate)

1. Point env at an isolated database:
   - Local Postgres: `DATABASE_URI=postgres://…@127.0.0.1:5432/kxd_dev`
2. Inspect: `npm run migrate:status`
3. Apply: `npm run migrate:local` (or `npm run migrate`)
4. Re-check status; pending list should be empty

Do not use production credentials for write-capable local verification.

## Fresh empty-database bootstrap (recovery / local setup)

Supported path for a brand-new Postgres database:

1. Create an empty local database (no user tables).
2. Export a local URL only, for example:

   ```bash
   export DATABASE_URI=postgres://postgres@127.0.0.1:5432/kxd_bootstrap
   unset DATABASE_URL POSTGRES_URL
   ```

3. Confirm the guard resolves local:

   ```bash
   npm run migrate:status
   # expect: kind=local-postgres host=127.0.0.1 …
   ```

4. Either:

   ```bash
   npm run migrate:local
   ```

   or the full verification harness:

   ```bash
   KXD_BOOTSTRAP_VERIFY=1 npm run verify:migration-bootstrap
   ```

5. Expected result:
   - Every migration in `migrations/index.ts` recorded once
   - `migrate:status` shows no pending (`Ran: Yes` for all)
   - Critical tables exist (`clients`, `reporting_sync_states`, launch/inventory/scheduling surfaces, etc.)

6. Destroy disposable bootstrap databases when finished. Do not keep dumps with secrets.

### Disaster-recovery implications

- Forward production migrate remains name-based and safe for already-applied rows.
- Empty-database rebuild must use guarded `migrate:local` / `verify:migration-bootstrap` (index order).
- Never rewrite `payload_migrations` history on production to “fix” bootstrap.
- Emergency SQL remains last resort when the CLI cannot run.

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

When adding migrations:

1. Prefer timestamp prefixes that sort after existing files.
2. Always register the migration in `migrations/index.ts` in dependency order.
3. Treat `index.ts` order as authoritative for guarded applies.
4. Avoid names that sort before their prerequisites under lexicographic order
   (especially `phaseNNa1` before `phaseNNa_`).
