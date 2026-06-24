/**
 * POST /api/admin/client-requests
 * Internal intake endpoint — creates a new Client Request record in Payload.
 * Requires authenticated Payload admin session.
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

    if (!body.requestTitle?.trim()) {
      return NextResponse.json(
        { success: false, error: "Request title is required." },
        { status: 400 }
      );
    }
    if (!body.client) {
      return NextResponse.json(
        { success: false, error: "Client is required." },
        { status: 400 }
      );
    }

    const payload = await getPayload({ config });

    const data: Record<string, unknown> = {
      requestTitle:     body.requestTitle.trim(),
      status:           "new",
      priority:         body.priority        || "normal",
    };

    // Relationship fields — send numeric IDs
    if (body.client)          data.client          = Number(body.client);
    if (body.relatedProject)  data.relatedProject  = Number(body.relatedProject);

    // Optional text fields
    if (body.requestType?.trim())        data.requestType       = body.requestType.trim();
    if (body.requestedBy?.trim())        data.requestedBy       = body.requestedBy.trim();
    if (body.requestedByEmail?.trim())   data.requestedByEmail  = body.requestedByEmail.trim();
    if (body.requestDetails?.trim())     data.requestDetails    = body.requestDetails.trim();
    if (body.internalNotes?.trim())      data.internalNotes     = body.internalNotes.trim();

    // Date field — validate before storing
    if (body.dueDate?.trim()) {
      const parsed = new Date(body.dueDate.trim());
      if (!isNaN(parsed.getTime())) {
        data.dueDate = parsed.toISOString();
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = await payload.create({ collection: "client-requests" as any, data: data as any });

    return NextResponse.json({ success: true, id: record.id });
  } catch (err) {
    console.error("[KXD] Failed to create client request:", err);
    return NextResponse.json(
      { success: false, error: "Failed to create request. Check server logs." },
      { status: 500 }
    );
  }
}
