/**
 * POST /api/admin/reels/render
 * KXD Creative Engine — Phase 5B
 *
 * TEMPORARILY DISABLED IN PRODUCTION
 *
 * @remotion/bundler and @remotion/renderer pull in the full Webpack compiler
 * (~150–200 MB unzipped) and cannot be bundled into a Vercel serverless
 * function without exceeding the 250 MB size limit. The full implementation
 * lives in lib/reel-renderer.ts and is ready for reactivation once this route
 * is migrated to one of:
 *
 *   a) Remotion Lambda (@remotion/lambda) — renders in AWS Lambda natively
 *   b) A standalone background worker (Cloud Run / Railway) that polls a queue
 *   c) A self-hosted Next.js server (non-serverless) with no bundle size cap
 *
 * TODO(Phase 5B-prod): Restore renderReelToMp4() import and handler when the
 * rendering infrastructure is moved to Remotion Lambda or a background worker.
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    {
      ok: false,
      message:
        "Reel rendering is temporarily unavailable in production. " +
        "This feature requires Remotion (@remotion/bundler + @remotion/renderer) " +
        "which exceeds Vercel serverless function size limits. " +
        "It will be restored via Remotion Lambda or a background worker " +
        "in a future deployment.",
    },
    { status: 503 },
  );
}
