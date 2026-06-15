/**
 * POST /api/admin/reels/screenshot
 * KXD Creative Engine — Phase 5A
 *
 * Captures website screenshots using Playwright and saves them
 * to Payload's Media collection.
 *
 * Request body:
 *   { promoVideoRequestId: number }
 *
 * Flow:
 *   1. Load PromoVideoRequest
 *   2. Validate websiteUrl is present
 *   3. Run Playwright screenshot capture (5 sections)
 *   4. Upload each screenshot to Payload Media
 *   5. Link media IDs to the request's capturedScreenshots field
 *   6. Update screenshotStatus to "complete"
 *   7. Return results
 *
 * Prerequisites:
 *   npx playwright install chromium
 */

import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { captureWebsiteScreenshots } from "@/lib/reel-screenshot-capture";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export async function POST(req: NextRequest) {
  const startMs = Date.now();

  try {
    const body = await req.json() as { promoVideoRequestId?: number };
    const requestId = body.promoVideoRequestId;

    if (!requestId || typeof requestId !== "number") {
      return NextResponse.json(
        { success: false, error: "promoVideoRequestId (number) is required." },
        { status: 400 }
      );
    }

    const payload = await getPayload({ config });

    // ── 1. Load request ─────────────────────────────────────────────────────

    let reelDoc: AnyDoc;
    try {
      reelDoc = await payload.findByID({
        collection: "promo-video-requests" as "clients",
        id: requestId,
        depth: 0,
      }) as AnyDoc;
    } catch {
      return NextResponse.json(
        { success: false, error: `Reel request ${requestId} not found.` },
        { status: 404 }
      );
    }

    const websiteUrl = String(reelDoc.websiteUrl || "").trim();
    if (!websiteUrl) {
      return NextResponse.json(
        { success: false, error: "No website URL on this record. Add one and try again." },
        { status: 422 }
      );
    }

    // ── 2. Mark as capturing ────────────────────────────────────────────────

    await payload.update({
      collection: "promo-video-requests" as "clients",
      id: requestId,
      data: { screenshotStatus: "capturing" } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    });

    // ── 3. Capture screenshots ──────────────────────────────────────────────

    const captureResult = await captureWebsiteScreenshots(websiteUrl, {
      viewportWidth:  1440,
      viewportHeight: 900,
      waitMs:         2500,
    });

    if (!captureResult.success || captureResult.screenshots.length === 0) {
      await payload.update({
        collection: "promo-video-requests" as "clients",
        id: requestId,
        data: {
          screenshotStatus: "failed",
          screenshotError:  captureResult.errors.join(" | ") || "Unknown capture error",
        } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      const errorDetail = captureResult.errors.join(" | ") || "Unknown capture error";
      return NextResponse.json({
        success: false,
        errors:  captureResult.errors,
        error:   `Screenshot capture failed: ${errorDetail}. Check that Playwright is installed (npx playwright install chromium) and the URL is reachable.`,
      }, { status: 500 });
    }

    // ── 4. Upload to Payload Media ──────────────────────────────────────────

    const mediaIds: number[] = [];
    const uploadErrors: string[] = [...captureResult.errors];

    for (const screenshot of captureResult.screenshots) {
      try {
        const mediaDoc = await payload.create({
          collection: "media",
          file: {
            data:     screenshot.buffer,
            mimetype: screenshot.mimeType,
            name:     screenshot.filename,
            size:     screenshot.buffer.length,
          },
          data: {
            alt: `${reelDoc.videoTitle || "Website Reel"} — ${screenshot.label}`,
          },
        });
        mediaIds.push(mediaDoc.id as number);
      } catch (uploadErr) {
        uploadErrors.push(`Upload failed for "${screenshot.section}": ${String(uploadErr)}`);
      }
    }

    // ── 5. Update request record ────────────────────────────────────────────

    const allExisting: number[] = Array.isArray(reelDoc.capturedScreenshots)
      ? reelDoc.capturedScreenshots.map((r: number | AnyDoc) =>
          typeof r === "number" ? r : (r as AnyDoc).id as number
        )
      : [];

    const combinedIds = [...new Set([...allExisting, ...mediaIds])];

    const screenshotUpdateData: AnyDoc = {
      capturedScreenshots:   combinedIds,
      screenshotStatus:      mediaIds.length > 0 ? "complete" : "failed",
      screenshotsCapturedAt: captureResult.capturedAt,
      status:                reelDoc.status === "new" ? "storyboarding" : reelDoc.status,
    };
    // Only write screenshotError when there is an error message — avoid setting
    // the column to null explicitly, which can cause issues in some Payload adapters.
    if (uploadErrors.length > 0) {
      screenshotUpdateData.screenshotError = uploadErrors.slice(0, 3).join(" | ");
    }

    await payload.update({
      collection: "promo-video-requests" as "clients",
      id: requestId,
      data: screenshotUpdateData as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    });

    const elapsedMs = Date.now() - startMs;

    return NextResponse.json({
      success:          true,
      promoVideoRequestId: requestId,
      websiteUrl,
      captured:         captureResult.screenshots.length,
      uploaded:         mediaIds.length,
      mediaIds,
      errors:           uploadErrors,
      capturedAt:       captureResult.capturedAt,
      elapsedMs,
    });

  } catch (err) {
    console.error("[KXD Reels] Screenshot route error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
