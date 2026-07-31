/**
 * /api/admin/sales/leads
 * POST — create lead / prospect (does not create a client)
 * PATCH — update pipeline status
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { getPayload } from "payload";
import config from "@payload-config";
import { LEAD_STATUSES } from "@/lib/sales/types";

export const dynamic = "force-dynamic";

const VALID_STATUSES = new Set(LEAD_STATUSES);

function leadSummary(record: {
  id: number | string;
  companyName?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  status?: string | null;
}) {
  return {
    id: record.id,
    companyName: record.companyName ?? "",
    contactName: record.contactName ?? "",
    email: record.email ?? "",
    phone: record.phone ?? "",
    website: record.website ?? "",
    status: record.status ?? "new",
  };
}

export async function POST(req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const companyName = String(body.companyName ?? "").trim();
    const contactName = String(body.contactName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();

    if (!companyName || !contactName) {
      return NextResponse.json(
        { success: false, error: "Organization name and primary contact name are required." },
        { status: 400 },
      );
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: "Email is invalid." }, { status: 400 });
    }

    const payload = await getPayload({ config });

    // Practical duplicate guard among open pipeline leads — does not create clients.
    if (email) {
      const byEmail = await payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "sales-leads" as any,
        limit: 1,
        where: {
          and: [
            { email: { equals: email } },
            { status: { not_in: ["won", "lost"] } },
          ],
        },
        overrideAccess: true,
      });
      if (byEmail.docs[0]) {
        return NextResponse.json(
          {
            success: true,
            id: byEmail.docs[0].id,
            lead: leadSummary(byEmail.docs[0] as never),
            reusedExisting: true,
            message: "An open prospect with this email already exists and was selected.",
          },
          { status: 200 },
        );
      }
    }

    const byCompany = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "sales-leads" as any,
      limit: 1,
      where: {
        and: [
          { companyName: { equals: companyName } },
          { status: { not_in: ["won", "lost"] } },
        ],
      },
      overrideAccess: true,
    });
    if (byCompany.docs[0] && body.allowDuplicateCompany !== true) {
      return NextResponse.json(
        {
          success: false,
          error: "An open prospect with this organization name already exists.",
          existingId: byCompany.docs[0].id,
          lead: leadSummary(byCompany.docs[0] as never),
        },
        { status: 409 },
      );
    }

    const record = await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "sales-leads" as any,
      data: {
        companyName,
        contactName,
        email: email || undefined,
        phone: String(body.phone ?? "").trim() || undefined,
        website: String(body.website ?? "").trim() || undefined,
        industry: body.industry?.trim() || undefined,
        source: body.source?.trim() || "proposal-builder",
        estimatedValue: body.estimatedValue ? Number(body.estimatedValue) : undefined,
        estimatedMRR: body.estimatedMRR ? Number(body.estimatedMRR) : undefined,
        probability: body.probability ? Number(body.probability) : 25,
        notes: String(body.notes ?? "").trim() || undefined,
        status: "new",
      },
      overrideAccess: true,
    });

    return NextResponse.json({
      success: true,
      id: record.id,
      lead: leadSummary(record as never),
      reusedExisting: false,
    });
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
