# Founder Hybrid Premium — Phase 1 (local)

## Local preview

From this worktree:

```bash
cd .worktrees/founder-hybrid-phase1
# reuse parent node_modules (symlink) or npm install
npm run dev
```

Sign in via Payload admin, then open:

`http://localhost:3000/admin/operations/today`

Hybrid shell applies to all founder `OperationsShell` routes (`variant="full"`). Staff shell is unchanged.

## Toggle

Set `FOUNDER_HYBRID_SHELL_ENABLED` in `lib/admin/founder-hybrid/flags.ts` to `false` to revert chrome without removing Today layout code.

## Screenshots

Capture manually at desktop (≥1280px), tablet (~768px), and mobile (~390px):

- Before (baseline on `main`): narrow ritual Today without persistent sidebar.
- After: this branch — wide dashboard inside graphite sidebar shell.

Suggested paths: `docs/founder-hybrid-phase1/screenshots/{before,after}-{desktop,tablet,mobile}.png`