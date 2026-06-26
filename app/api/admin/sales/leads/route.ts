/**
 * /api/admin/sales/leads
 * POST — create lead
 * PATCH — update pipeline status
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { getPayload } from "payload";
import config from "@payload-config";
import { LEAD_STATUSES } from "@/lib/sales/types";

export const dynamic = "force-dynamic";

const VALID_STATUSES = new Set(LEAD_STATUSES);

export async function POST(req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    if (!body.companyName?.trim() || !body.contactName?.trim()) {
      return NextResponse.json(
        { success: false, error: "Company name and contact name are required." },
        { status: 400 },
      );
    }

    const payload = await getPayload({ config });
    const record = await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "sales-leads" as any,
      data: {
        companyName: body.companyName.trim(),
        contactName: body.contactName.trim(),
        email: body.email?.trim() || undefined,
        phone: body.phone?.trim() || undefined,
        website: body.website?.trim() || undefined,
        industry: body.industry?.trim() || undefined,
        source: body.source?.trim() || undefined,
        estimatedValue: body.estimatedValue ? Number(body.estimatedValue) : undefined,
        estimatedMRR: body.estimatedMRR ? Number(body.estimatedMRR) : undefined,
        probability: body.probability ? Number(body.probability) : 25,
        notes: body.notes?.trim() || undefined,
        status: "new",
      },
      overrideAccess: true,
    });

    return NextResponse.json({ success: true, id: record.id });
  } catch (err) {
    console.error("[KXD Sales] Failed to create lead:", err);
    return NextResponse.json({ success: false, error: "Failed to create lead." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const id = Number(body.id);
    const status = body.status;

    if (!id || !status || !VALID_STATUSES.has(status)) {
      return NextResponse.json({ success: false, error: "Valid id and status required." }, { status: 400 });
    }

    const payload = await getPayload({ config });
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "sales-leads" as any,
      id,
      data: { status },
      overrideAccess: true,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[KXD Sales] Failed to update lead:", err);
    return NextResponse.json({ success: false, error: "Failed to update lead." }, { status: 500 });
  }
}
