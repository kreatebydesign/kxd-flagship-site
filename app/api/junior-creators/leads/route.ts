/**
 * GET /api/junior-creators/leads — own leads
 * POST /api/junior-creators/leads — submit lead (session-scoped)
 */
import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { getJuniorCreatorSession } from "@/lib/junior-creators/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getJuniorCreatorSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const payload = await getPayload({ config });

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "research-leads" as any,
    where: { juniorCreatorUser: { equals: session.juniorCreatorUserId } },
    limit: 100,
    depth: 0,
    sort: "-createdAt",
    overrideAccess: true,
  });

  return NextResponse.json({ ok: true, leads: result.docs });
}

export async function POST(req: NextRequest) {
  const session = await getJuniorCreatorSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const payload = await getPayload({ config });

    const data: Record<string, unknown> = {
      juniorCreatorUser: session.juniorCreatorUserId,
      researcherName: session.displayName,
      source: body.source?.trim() || "Craigslist",
      status: "new",
    };

    if (body.state?.trim()) data.state = body.state.trim();
    if (body.city?.trim()) data.city = body.city.trim();
    if (body.leadUrl?.trim()) data.leadUrl = body.leadUrl.trim();
    if (body.estimatedService) data.estimatedService = body.estimatedService;
    if (body.notes?.trim()) data.notes = body.notes.trim();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = await payload.create({
      collection: "research-leads" as any,
      data: data as any,
      overrideAccess: true,
    });

    return NextResponse.json({ ok: true, id: record.id });
  } catch (err) {
    console.error("[KXD Junior Creators] Lead submit failed:", err);
    return NextResponse.json(
      { ok: false, message: "Failed to submit lead." },
      { status: 500 },
    );
  }
}
