/**
 * POST /api/admin/reels/render
 * KXD Creative Engine — Phase 5B
 *
 * Renders a website showcase reel to MP4 using Remotion.
 *
 * Request body:
 *   { reelRequestId: number, manifestOnly?: boolean }
 *
 * manifestOnly: true  → skip rendering, return the render manifest JSON
 * manifestOnly: false → full Remotion render (default)
 *
 * Flow:
 *   1. Load PromoVideoRequest (must have isWebsiteReel: true)
 *   2. Validate: screenshots captured + storyboard generated
 *   3. Mark renderStatus = "rendering"
 *   4. Build composition props (parse scenes, resolve screenshot URLs)
 *   5. Bundle Remotion composition (cached after first call)
 *   6. renderMedia() → public/generated-reels/kxd-reel-{id}-v{n}.mp4
 *   7. Save renderedVideoUrl + renderStatus back to Payload
 *   8. Return result
 *
 * Production note:
 *   On Vercel serverless this will timeout for reels longer than ~20s
 *   (30fps × 20s = 600 frames at ~50ms/frame = 30s + 15s bundle = 45s,
 *    close to Hobby 60s limit). Phase 5C: queue + background worker.
 *
 * Prerequisites:
 *   Run `npm run migrate` so Phase 5B render columns exist in Neon.
 *   npx playwright install chromium — only needed for screenshot capture, not render.
 */

import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { renderReelToMp4, buildRenderManifest } from "@/lib/reel-renderer";
import fs from "fs";
import path from "path";

export const dynamic     = "force-dynamic";
export const maxDuration = 300;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns a clear, actionable error message.
 * Detects schema-drift errors (missing column / invalid enum) and surfaces the
 * migration command so the developer knows what to do immediately.
 */
function formatError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);

  if (
    raw.includes("column") ||
    raw.includes("relation") ||
    raw.includes("invalid input value") ||
    raw.includes("does not exist")
  ) {
    return (
      `Database schema error: ${raw} — ` +
      `The Phase 5B render columns may be missing. Run: npm run migrate`
    );
  }

  return raw;
}

export async function POST(req: NextRequest) {
  const startMs = Date.now();

  try {
    const body = await req.json() as { reelRequestId?: number; manifestOnly?: boolean };
    const requestId    = body.reelRequestId;
    const manifestOnly = body.manifestOnly === true;

    if (!requestId || typeof requestId !== "number") {
      return NextResponse.json({ success: false, error: "reelRequestId (number) is required." }, { status: 400 });
    }

    const payload = await getPayload({ config });

    // ── 1. Load request ─────────────────────────────────────────────────────

    let doc: AnyDoc;
    try {
      doc = await payload.findByID({
        collection: "promo-video-requests" as "clients",
        id: requestId,
        depth: 2,
      }) as AnyDoc;
    } catch {
      return NextResponse.json({ success: false, error: `Reel request ${requestId} not found.` }, { status: 404 });
    }

    if (!doc.isWebsiteReel) {
      return NextResponse.json({
        success: false,
        error:   "This record is not a website reel (isWebsiteReel must be true).",
      }, { status: 422 });
    }

    // ── 2. Validate prerequisites ───────────────────────────────────────────

    const screenshots: AnyDoc[] = Array.isArray(doc.capturedScreenshots) ? doc.capturedScreenshots : [];
    if (screenshots.length === 0) {
      return NextResponse.json({
        success: false,
        error:   "No screenshots captured. Run screenshot capture first (POST /api/admin/reels/screenshot).",
      }, { status: 422 });
    }

    if (!doc.generatedScript && !doc.sceneSequence) {
      return NextResponse.json({
        success: false,
        error:   "No storyboard generated. Run storyboard generation first (POST /api/admin/reels/storyboard).",
      }, { status: 422 });
    }

    // ── 3. Manifest-only mode ───────────────────────────────────────────────

    const baseUrl = req.nextUrl.origin || "http://localhost:3000";

    if (manifestOnly) {
      const manifest = buildRenderManifest({ doc, baseUrl });
      return NextResponse.json({ success: true, manifestOnly: true, manifest });
    }

    // ── 4. Mark as rendering ────────────────────────────────────────────────
    //
    // If Phase 5B migration hasn't been run, payload.update() here throws:
    //   "column 'render_status' of relation 'promo_video_requests' does not exist"
    // formatError() catches this and surfaces the migration command.

    const currentVersion = typeof doc.renderVersion === "number" ? doc.renderVersion : 0;
    const nextVersion    = currentVersion + 1;

    try {
      await payload.update({
        collection: "promo-video-requests" as "clients",
        id: requestId,
        data: {
          renderStatus:    "rendering",
          renderVersion:   nextVersion,
          renderStartedAt: new Date().toISOString(),
        } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      });
    } catch (statusErr) {
      const msg = formatError(statusErr);
      console.error("[KXD Render] Failed to mark renderStatus=rendering:", msg);
      return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }

    // ── 5. Render ────────────────────────────────────────────────────────────

    const renderResult = await renderReelToMp4({
      doc,
      requestId,
      version: nextVersion,
      baseUrl,
      fps: 30,
    });

    // ── 6. Save to Payload Media (optional) ─────────────────────────────────

    let mediaId: number | null = null;

    if (renderResult.success && renderResult.outputPath) {
      try {
        const buffer   = fs.readFileSync(renderResult.outputPath);
        const filename = path.basename(renderResult.outputPath);

        const mediaDoc = await payload.create({
          collection: "media",
          file: {
            data:     buffer,
            mimetype: "video/mp4",
            name:     filename,
            size:     buffer.length,
          },
          data: { alt: `${doc.videoTitle || "Website Reel"} — Rendered MP4 v${nextVersion}` },
        });
        mediaId = mediaDoc.id as number;
      } catch (uploadErr) {
        console.warn("[KXD Render] Media upload skipped:", String(uploadErr));
      }
    }

    // ── 7. Update request record ─────────────────────────────────────────────

    const updateData: AnyDoc = {
      renderStatus:      renderResult.success ? "complete" : "failed",
      renderCompletedAt: new Date().toISOString(),
      renderDurationMs:  renderResult.durationMs ?? (Date.now() - startMs),
    };

    if (renderResult.success) {
      updateData.renderedVideoUrl = renderResult.servedUrl;
      if (mediaId) updateData.renderedVideoAsset = mediaId;
    } else {
      updateData.renderError = String(renderResult.error ?? "Unknown render error").slice(0, 500);
    }

    try {
      await payload.update({
        collection: "promo-video-requests" as "clients",
        id: requestId,
        data: updateData as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      });
    } catch (updateErr) {
      // Record final status update failure but do not abort — render may still have succeeded.
      console.error("[KXD Render] Failed to persist final render status:", String(updateErr));
    }

    const elapsedMs = Date.now() - startMs;

    if (!renderResult.success) {
      const errMsg = String(renderResult.error ?? "Unknown render error");
      console.error("[KXD Render] Render failed:", errMsg);
      return NextResponse.json({ success: false, error: errMsg, elapsedMs }, { status: 500 });
    }

    return NextResponse.json({
      success:          true,
      reelRequestId:    requestId,
      renderVersion:    nextVersion,
      servedUrl:        renderResult.servedUrl,
      renderedVideoUrl: renderResult.servedUrl,
      mediaId,
      frameCount:       renderResult.frameCount,
      durationMs:       renderResult.durationMs,
      elapsedMs,
    });

  } catch (err) {
    const msg = formatError(err);
    console.error("[KXD Render] Route error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
