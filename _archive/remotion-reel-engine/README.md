# KXD Reel Engine — Archived (Phase 5A/5B)

**Archived on:** 2026-06-15  
**Reason:** Vercel 250 MB serverless function size limit

## Why It Was Archived

`@remotion/bundler`, `@remotion/renderer`, and `playwright` together exceed
Vercel's 250 MB unzipped serverless function limit. Bundling these packages into
any API route makes the entire deployment fail.

## What's Here

| File | Description |
|---|---|
| `remotion/KxdReelComposition.tsx` | Remotion React composition for KXD website showcase reels |
| `remotion/index.tsx` | Remotion entry point (`registerRoot`) |
| `lib/reel-renderer.ts` | Orchestrates Remotion bundle + renderMedia() → MP4 |
| `lib/reel-screenshot-capture.ts` | Playwright-based website screenshot capture (5 sections) |

## How to Restore

Choose one of these production-safe approaches:

### Option A — Remotion Lambda (Recommended)
1. Install `@remotion/lambda`
2. Deploy composition to AWS Lambda via `npx remotion lambda deploy`
3. Replace `renderReelToMp4()` calls with `renderMediaOnLambda()`
4. Move `reel-renderer.ts` back to `lib/` with the Lambda client instead of local render

### Option B — Background Worker (Cloud Run / Railway)
1. Spin up a Node.js service with no serverless size cap
2. POST render/screenshot jobs to it from the Vercel API routes
3. Use a webhook or polling to return results

### Option C — Self-hosted Next.js
1. Deploy Next.js to a VPS/container (not serverless)
2. Re-import `reel-renderer.ts` and `reel-screenshot-capture.ts` from `lib/`
3. No size limit applies

## Routes That Proxy This Work

These routes return 503 with descriptive messages until the engine is restored:

- `app/api/admin/reels/screenshot/route.ts` — screenshot capture
- `app/api/admin/reels/render/route.ts` — MP4 render

These routes are fully operational (no Remotion/Playwright dependency):

- `app/api/admin/reels/route.ts` — CRUD for PromoVideoRequests
- `app/api/admin/reels/storyboard/route.ts` — GPT storyboard generation
