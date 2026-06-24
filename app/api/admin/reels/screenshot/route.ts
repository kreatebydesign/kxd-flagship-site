/**
 * POST /api/admin/reels/screenshot
 * KXD Creative Engine — Phase 5A
 *
 * TEMPORARILY DISABLED IN PRODUCTION
 *
 * Playwright + Chromium cannot be bundled in Vercel serverless functions
 * without exceeding the 250 MB unzipped size limit. The full implementation
 * lives in lib/reel-screenshot-capture.ts and is ready for reactivation once
 * this route is migrated to one of:
 *
 *   a) Vercel Edge Function + Browserless/Puppeteer-cloud endpoint
 *   b) A standalone Cloud Run / Railway worker that accepts a webhook
 *   c) Playwright installed on a dedicated Next.js server (non-serverless)
 *
 * TODO(Phase 5A-prod): Restore captureWebsiteScreenshots() import and handler
 * when the screenshot infrastructure is moved off Vercel serverless.
 */

import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  return NextResponse.json(
    {
      ok: false,
      message:
        "Screenshot capture is temporarily unavailable in production. " +
        "This feature requires Playwright/Chromium and cannot run inside a " +
        "Vercel serverless function. It will be restored via a dedicated " +
        "cloud worker in a future deployment.",
    },
    { status: 503 },
  );
}
