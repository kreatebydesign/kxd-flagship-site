/**
 * POST /api/admin/creative/flyers
 * Internal intake — creates a Flyer Request record in Payload.
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

    if (!body.flyerTitle?.trim()) {
      return NextResponse.json({ success: false, error: "Flyer title is required." }, { status: 400 });
    }
    if (!body.client) {
      return NextResponse.json({ success: false, error: "Client is required." }, { status: 400 });
    }

    const payload = await getPayload({ config });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = {
      flyerTitle: body.flyerTitle.trim(),
      status:   body.status   || "new",
      priority: body.priority || "normal",
    };

    if (body.client)            data.client          = Number(body.client);
    if (body.relatedProject)    data.relatedProject  = Number(body.relatedProject);
    if (body.relatedCampaign)   data.relatedCampaign = Number(body.relatedCampaign);
    if (body.flyerType)         data.flyerType       = body.flyerType;
    if (body.sizeFormat)        data.sizeFormat      = body.sizeFormat;
    if (body.audience?.trim())  data.audience        = body.audience.trim();
    if (body.keyDetails?.trim()) data.keyDetails     = body.keyDetails.trim();
    if (body.cta?.trim())       data.cta             = body.cta.trim();
    if (body.internalNotes?.trim()) data.internalNotes = body.internalNotes.trim();
    if (body.deadline)          data.deadline        = new Date(body.deadline).toISOString();
    if (body.eventDate)         data.eventDate       = new Date(body.eventDate).toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = await payload.create({ collection: "flyer-requests" as any, data: data as any });

    return NextResponse.json({ success: true, id: record.id });
  } catch (err) {
    console.error("[KXD Creative] Failed to create flyer request:", err);
    return NextResponse.json({ success: false, error: "Failed to create flyer request." }, { status: 500 });
  }
}
