/**
 * POST /api/admin/creative/brand-kits
 * Internal intake — creates a Brand Kit record in Payload.
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

    if (!body.brandName?.trim()) {
      return NextResponse.json({ success: false, error: "Brand name is required." }, { status: 400 });
    }
    if (!body.client) {
      return NextResponse.json({ success: false, error: "Client is required." }, { status: 400 });
    }

    const payload = await getPayload({ config });

    const slug = body.slug?.trim() ||
      body.brandName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") +
      "-" + Date.now().toString(36);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = {
      brandName: body.brandName.trim(),
      slug,
      status: body.status || "draft",
    };

    if (body.client)           data.client          = Number(body.client);
    if (body.relatedProject)   data.relatedProject  = Number(body.relatedProject);
    if (body.industry?.trim()) data.industry        = body.industry.trim();
    if (body.audience?.trim()) data.audience        = body.audience.trim();
    if (body.internalNotes?.trim()) data.internalNotes = body.internalNotes.trim();
    if (body.nextAction?.trim())    data.nextAction  = body.nextAction.trim();
    if (body.nextActionDueDate)     data.nextActionDueDate = new Date(body.nextActionDueDate).toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = await payload.create({ collection: "brand-kits" as any, data: data as any });

    return NextResponse.json({ success: true, id: record.id });
  } catch (err) {
    console.error("[KXD Creative] Failed to create brand kit:", err);
    return NextResponse.json({ success: false, error: "Failed to create brand kit." }, { status: 500 });
  }
}
