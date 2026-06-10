/**
 * POST /api/admin/creative/campaigns
 * Internal intake — creates a Creative Campaign record in Payload.
 */
import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.campaignTitle?.trim()) {
      return NextResponse.json({ success: false, error: "Campaign title is required." }, { status: 400 });
    }
    if (!body.client) {
      return NextResponse.json({ success: false, error: "Client is required." }, { status: 400 });
    }

    const payload = await getPayload({ config });

    // Auto-generate slug from title if not provided
    const slug = body.slug?.trim() ||
      body.campaignTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") +
      "-" + Date.now().toString(36);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = {
      campaignTitle: body.campaignTitle.trim(),
      slug,
      status:   body.status   || "draft",
      priority: body.priority || "normal",
    };

    if (body.client)          data.client          = Number(body.client);
    if (body.relatedProject)  data.relatedProject  = Number(body.relatedProject);
    if (body.campaignType)    data.campaignType    = body.campaignType;
    if (body.goal?.trim())    data.goal            = body.goal.trim();
    if (body.audience?.trim()) data.audience       = body.audience.trim();
    if (body.internalNotes?.trim()) data.internalNotes = body.internalNotes.trim();
    if (body.launchDate)      data.launchDate      = new Date(body.launchDate).toISOString();
    if (body.deadline)        data.deadline        = new Date(body.deadline).toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = await payload.create({ collection: "creative-campaigns" as any, data: data as any });

    return NextResponse.json({ success: true, id: record.id });
  } catch (err) {
    console.error("[KXD Creative] Failed to create campaign:", err);
    return NextResponse.json({ success: false, error: "Failed to create campaign." }, { status: 500 });
  }
}
