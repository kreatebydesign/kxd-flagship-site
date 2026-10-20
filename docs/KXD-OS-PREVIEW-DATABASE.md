# KXD OS — Preview database (Neon)

Preview deployments must **never** write to production Neon (`main` / Vercel production branch).

## Canonical preview branch

| Field | Value |
|--------|--------|
| Neon project | `kxd-flagship-db` (`mute-violet-81514071`) |
| Branch name | `preview-kxd-os` |
| Branch ID | `br-small-fire-af71dl63` |
| Endpoint ID | `ep-frosty-bonus-afx8tf8q` |
| Pooler host | `ep-frosty-bonus-afx8tf8q-pooler.c-2.us-west-2.aws.neon.tech` |
| Direct host | `ep-frosty-bonus-afx8tf8q.c-2.us-west-2.aws.neon.tech` |

Production main (do not use for Preview):

| Field | Value |
|--------|--------|
| Branch | `main` (`br-tiny-morning-afqn555m`) |
| Endpoint ID | `ep-twilight-math-aferd43x` |

## Vercel configuration

- **Production** retains Neon integration variables scoped to **Production** only (`DATABASE_URL`, `POSTGRES_*`, etc.).
- **Preview** has its own full Postgres bundle (including `DATABASE_URI` for Payload) pointing at `preview-kxd-os`.
- Marker env vars (Preview only): `KXD_NEON_PREVIEW_BRANCH_ID`, `KXD_NEON_PREVIEW_BRANCH_NAME`, `KXD_NEON_PREVIEW_ENDPOINT_ID`.

Payload resolves `DATABASE_URI` then `DATABASE_URL` (`payload.config.ts`). Scripts that use `POSTGRES_URL` must read the same Preview-scoped values.

### Re-apply or rotate preview credentials

Use a local secrets file (never commit):

```bash
# preview-db.json: { "pooledUrl": "postgresql://...", "neonProjectId": "mute-violet-81514071" }
node scripts/configure-kxd-os-preview-database-env.mjs \
  --config /path/to/preview-db.json \
  --scope-production-only-ids "<comma-separated production-only env ids if re-splitting>"
```

Then redeploy affected Preview deployments.

## Migrations on preview

1. Confirm target host (no credentials in logs):

   ```bash
   npm run migrate:status
   # expect host=ep-frosty-bonus-afx8tf8q... kind=remote-postgres
   ```

2. Apply **only** with explicit remote confirm and verified preview URI:

   ```bash
   KXD_CONFIRM_PRODUCTION_MIGRATE=1 npm run migrate:production
   ```

   Use `migrate:production` for any **remote** Postgres (including preview branch), not production Neon main.

3. **Never** run preview migrations against `ep-twilight-math` / `main`.

## Data and access

`preview-kxd-os` is created from a **production snapshot**. Treat it as **sensitive**: real client, staff, and financial data may be present. Restrict Vercel SSO, avoid destructive tests on real employee accounts, and prefer isolated QA users for write tests.

## Runtime guard

On Vercel Preview, `payload.config.ts` refuses the production Neon endpoint if `KXD_NEON_PREVIEW_ENDPOINT_ID` is set and the resolved host does not match the preview endpoint.

## Canonical Preview hostname (auth)

Use **one hostname** for the whole QA session:

`https://kxd-flagship-site-git-feature-staff-time-b1-foundation-kxd.vercel.app`

Vercel also serves each build at a **deployment-specific** URL (e.g. `kxd-flagship-site-qlsums4r0-kxd.vercel.app`). The Payload `payload-token` cookie is **host-scoped**. Logging in on the branch alias and then opening a deployment-specific URL (or production) in another tab looks like “logged out” and shows `/admin/login` again — including on Staff Oversight. This is not a Staff Oversight permission bug.

After login, navigate with **in-app links** (e.g. Tools → Staff Oversight) on the same tab/host.

## Staff Time B1 preview QA

Dedicated users (preview DB only, `@kxd-preview-qa.local`):

1. `KXD_CONFIRM_PREVIEW_DB_WRITE=1` + preview `DATABASE_URI` → `npm run seed:preview-staff-time-qa`
2. Credentials written locally to `/tmp/kxd-preview-qa-credentials.json` (mode `0600`) — **never commit or paste in chat**
3. `npm run verify:preview-staff-time-qa` — service-layer QA on preview-kxd-os (shift lifecycle, oversight, scope)
4. Manual UI: sign in at Preview `/admin/login` with QA BDS / operator emails from the credentials file; complete Staff Time and Oversight walkthrough

Do not use real employee passwords on preview when the branch contains production data snapshots.
