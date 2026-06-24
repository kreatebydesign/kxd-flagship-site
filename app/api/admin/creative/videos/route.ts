/**
 * POST /api/admin/creative/videos
 * Internal intake — creates a Promo Video Request record in Payload.
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { getPayload } from "payload";
import config from "@payload-config";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();

    if (!body.videoTitle?.trim()) {
      return NextResponse.json({ success: false, error: "Video title is required." }, { status: 400 });
    }
    if (!body.client) {
      return NextResponse.json({ success: false, error: "Client is required." }, { status: 400 });
    }

    const payload = await getPayload({ config });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = {
      videoTitle: body.videoTitle.trim(),
      status:   body.status   || "new",
      priority: body.priority || "normal",
    };

    if (body.client)           data.client          = Number(body.client);
    if (body.relatedProject)   data.relatedProject  = Number(body.relatedProject);
    if (body.relatedCampaign)  data.relatedCampaign = Number(body.relatedCampaign);
    if (body.videoType)        data.videoType       = body.videoType;
    if (body.platform)         data.platform        = body.platform;
    if (body.aspectRatio)      data.aspectRatio     = body.aspectRatio;
    if (body.durationTarget)   data.durationTarget  = body.durationTarget;
    if (body.visualStyle)      data.visualStyle     = body.visualStyle;
    if (body.goal?.trim())     data.goal            = body.goal.trim();
    if (body.audience?.trim()) data.audience        = body.audience.trim();
    if (body.websiteUrl?.trim()) data.websiteUrl    = body.websiteUrl.trim();
    if (body.internalNotes?.trim()) data.internalNotes = body.internalNotes.trim();
    if (body.deadline)         data.deadline        = new Date(body.deadline).toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = await payload.create({ collection: "promo-video-requests" as any, data: data as any });

    return NextResponse.json({ success: true, id: record.id });
  } catch (err) {
    console.error("[KXD Creative] Failed to create video request:", err);
    return NextResponse.json({ success: false, error: "Failed to create video request." }, { status: 500 });
  }
}
