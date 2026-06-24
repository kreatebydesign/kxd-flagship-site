/**
 * /api/admin/research-leads
 * POST — create research lead
 * PATCH — quick status update
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { getPayload } from "payload";
import config from "@payload-config";
import { RESEARCH_RESEARCHERS, RESEARCH_STATUSES } from "@/lib/research-leads";

export const dynamic = "force-dynamic";

const VALID_STATUSES = new Set(RESEARCH_STATUSES.map((s) => s.value));
const VALID_RESEARCHERS = new Set(RESEARCH_RESEARCHERS.map((r) => r.value));

export async function POST(req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();

    if (!body.researcherName?.trim() || !VALID_RESEARCHERS.has(body.researcherName.trim() as typeof RESEARCH_RESEARCHERS[number]["value"])) {
      return NextResponse.json({ success: false, error: "Select a valid researcher." }, { status: 400 });
    }

    const payload = await getPayload({ config });

    const data: Record<string, unknown> = {
      researcherName: body.researcherName.trim(),
      source: body.source?.trim() || "Craigslist",
      status: "new",
    };

    if (body.state?.trim()) data.state = body.state.trim();
    if (body.city?.trim()) data.city = body.city.trim();
    if (body.leadUrl?.trim()) data.leadUrl = body.leadUrl.trim();
    if (body.estimatedService) data.estimatedService = body.estimatedService;
    if (body.notes?.trim()) data.notes = body.notes.trim();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = await payload.create({ collection: "research-leads" as any, data: data as any });

    return NextResponse.json({ success: true, id: record.id });
  } catch (err) {
    console.error("[KXD] Failed to create research lead:", err);
    return NextResponse.json(
      { success: false, error: "Failed to submit lead. Check server logs." },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const id = Number(body.id);
    const status = body.status;

    if (!id || !status || !VALID_STATUSES.has(status as typeof RESEARCH_STATUSES[number]["value"])) {
      return NextResponse.json({ success: false, error: "Valid id and status required." }, { status: 400 });
    }

    const payload = await getPayload({ config });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await payload.update({
      collection: "research-leads" as any,
      id,
      data: { status },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[KXD] Failed to update research lead:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update status." },
      { status: 500 },
    );
  }
}
