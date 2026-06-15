/**
 * GET  /api/admin/reels — list all website reel requests
 * POST /api/admin/reels — create a new website reel request
 *
 * Records are stored in promo-video-requests with isWebsiteReel: true.
 */
import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Converts any caught error into a human-readable string.
 * Surfaces Postgres column/enum/relation errors with a migration hint so the
 * root cause is immediately visible in the UI — not swallowed as a generic message.
 */
function formatError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);

  if (
    raw.includes("column") ||
    raw.includes("enum") ||
    raw.includes("relation") ||
    raw.includes("invalid input value")
  ) {
    return `Database schema error: ${raw} — ensure migrations are up to date (npm run migrate).`;
  }

  return raw;
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const payload = await getPayload({ config });

    const result = await payload.find({
      collection: "promo-video-requests" as "clients",
      where: { isWebsiteReel: { equals: true } },
      limit: 100,
      depth: 1,
      sort: "-createdAt",
    });

    return NextResponse.json({ success: true, docs: result.docs, totalDocs: result.totalDocs });
  } catch (err) {
    const msg = formatError(err);
    console.error("[KXD Reels] List error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as AnyDoc;

    if (!body.videoTitle?.trim()) {
      return NextResponse.json({ success: false, error: "Reel title is required." }, { status: 400 });
    }
    if (!body.client) {
      return NextResponse.json({ success: false, error: "Client is required." }, { status: 400 });
    }
    if (!body.websiteUrl?.trim()) {
      return NextResponse.json({ success: false, error: "Website URL is required." }, { status: 400 });
    }

    const payload = await getPayload({ config });

    const data: AnyDoc = {
      videoTitle:    body.videoTitle.trim(),
      isWebsiteReel: true,
      videoType:     body.videoType || "website-launch",
      status:        "new",
      priority:      body.priority || "normal",
      websiteUrl:    body.websiteUrl.trim(),
    };

    if (body.client)          data.client          = Number(body.client);
    if (body.relatedProject)  data.relatedProject  = Number(body.relatedProject);
    if (body.relatedCampaign) data.relatedCampaign = Number(body.relatedCampaign);
    if (body.platform)        data.platform        = body.platform;
    if (body.visualStyle)     data.visualStyle     = body.visualStyle;
    if (body.durationTarget)  data.durationTarget  = body.durationTarget;
    if (body.aspectRatio)     data.aspectRatio     = body.aspectRatio;
    if (body.goal?.trim())    data.goal            = body.goal.trim();
    if (body.audience?.trim())data.audience        = body.audience.trim();
    if (body.musicDirection?.trim()) data.musicDirection = body.musicDirection.trim();
    if (body.internalNotes?.trim()) data.internalNotes = body.internalNotes.trim();
    if (body.clientName?.trim()) data.clientName = body.clientName.trim();

    const record = await payload.create({
      collection: "promo-video-requests" as "clients",
      data: data as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    });

    return NextResponse.json({ success: true, id: record.id });
  } catch (err) {
    const msg = formatError(err);
    console.error("[KXD Reels] Create error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
