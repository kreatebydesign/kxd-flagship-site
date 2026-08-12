/**
 * POST /api/junior-creators/leads — submit lead (session-scoped)
 * GET  /api/junior-creators/leads — own leads
 */
import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { getJuniorCreatorSession } from "@/lib/junior-creators/session";
import { normalizeResearchIntake } from "@/lib/research-leads/intake";

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
    const normalized = normalizeResearchIntake({
      opportunityUrl: body.opportunityUrl,
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone,
      leadUrl: body.leadUrl,
      businessName: body.businessName,
      city: body.city,
      state: body.state,
      estimatedService: body.estimatedService,
      notes: body.notes,
      source: body.source,
    });

    if (!normalized.ok) {
      return NextResponse.json({ ok: false, message: normalized.message }, { status: 400 });
    }

    const payload = await getPayload({ config });
    const d = normalized.data;

    const data: Record<string, unknown> = {
      juniorCreatorUser: session.juniorCreatorUserId,
      researcherName: session.displayName,
      source: d.source,
      status: "new",
    };

    if (d.state) data.state = d.state;
    if (d.city) data.city = d.city;
    if (d.businessName) data.businessName = d.businessName;
    if (d.opportunityUrl) data.opportunityUrl = d.opportunityUrl;
    if (d.contactEmail) data.contactEmail = d.contactEmail;
    if (d.contactPhone) data.contactPhone = d.contactPhone;
    if (d.leadUrl) data.leadUrl = d.leadUrl;
    if (d.estimatedService) data.estimatedService = d.estimatedService;
    if (d.notes) data.notes = d.notes;

    const record = await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "research-leads" as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
