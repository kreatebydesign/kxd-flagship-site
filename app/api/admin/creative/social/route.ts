/**
 * POST /api/admin/creative/social
 * Internal intake — creates a Social Post Request record in Payload.
 */
import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.postTitle?.trim()) {
      return NextResponse.json({ success: false, error: "Post title is required." }, { status: 400 });
    }
    if (!body.client) {
      return NextResponse.json({ success: false, error: "Client is required." }, { status: 400 });
    }

    const payload = await getPayload({ config });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = {
      postTitle: body.postTitle.trim(),
      status:   body.status   || "new",
      priority: body.priority || "normal",
    };

    if (body.client)           data.client          = Number(body.client);
    if (body.relatedProject)   data.relatedProject  = Number(body.relatedProject);
    if (body.relatedCampaign)  data.relatedCampaign = Number(body.relatedCampaign);
    if (body.postType)         data.postType        = body.postType;
    if (body.platform)         data.platform        = body.platform;
    if (body.audience?.trim()) data.audience        = body.audience.trim();
    if (body.keyMessage?.trim()) data.keyMessage    = body.keyMessage.trim();
    if (body.cta?.trim())      data.cta             = body.cta.trim();
    if (body.internalNotes?.trim()) data.internalNotes = body.internalNotes.trim();
    if (body.scheduledDate)    data.scheduledDate   = new Date(body.scheduledDate).toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = await payload.create({ collection: "social-post-requests" as any, data: data as any });

    return NextResponse.json({ success: true, id: record.id });
  } catch (err) {
    console.error("[KXD Creative] Failed to create social post request:", err);
    return NextResponse.json({ success: false, error: "Failed to create social post request." }, { status: 500 });
  }
}
