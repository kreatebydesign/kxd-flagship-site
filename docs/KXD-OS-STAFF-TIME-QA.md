# Staff Time — automated QA

## Vercel Preview (canonical branch URL)

Preview deployments use **Vercel Deployment Protection** (`vercel_auth_enabled`). Automated browser and API tests must send:

- Header: `x-vercel-protection-bypass: <VERCEL_AUTOMATION_BYPASS_SECRET>`
- Env var on the runner: `VERCEL_AUTOMATION_BYPASS_SECRET` (Preview scope in Vercel project settings)

Without bypass, `/api/users/login` returns SSO HTML or 401 and Playwright cannot complete.

```bash
export VERCEL_AUTOMATION_BYPASS_SECRET=… # from Vercel → Project → Settings → Deployment Protection
export PREVIEW_BASE_URL="https://kxd-flagship-site-git-<branch>-kxd.vercel.app"
export KXD_PREVIEW_QA_CREDENTIALS_PATH=/tmp/kxd-preview-qa-credentials.json
npm run verify:staff-time-playwright-qa
```

Screenshots default to `storage/qa-screenshots/pr90-staff-time/`.

## Preview database QA users

Isolated Neon branch `preview-kxd-os` only:

```bash
KXD_CONFIRM_PREVIEW_DB_WRITE=1 DATABASE_URI=…preview-kxd-os… npm run seed:preview-staff-time-qa
DATABASE_URI=…preview-kxd-os… npm run verify:preview-staff-time-qa
```

## Local fallback (developer machine)

When Preview bypass is unavailable, use local Postgres (`.env.local`) + production build:

```bash
npm run seed:local-staff-time-browser-qa
npm run build && npm run start -- --port 3001
QA_BASE_URL=http://localhost:3001 KXD_QA_CREDENTIALS_PATH=/tmp/kxd-local-staff-time-qa-credentials.json npm run verify:staff-time-playwright-qa
```

Note: `next start` loads production env files; ensure QA users are seeded against the same database the server uses.

## CSRF / staff hosts

```bash
npm run verify:payload-staff-csrf-origins
npm run verify:staff-time-post-auth-headers
```

Production must include `https://portal.kreatebydesign.com` and `https://www.kreatebydesign.com` in Payload `csrf` (`lib/payload/csrf-origins.ts`).
