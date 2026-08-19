/**
 * /api/admin/sales/leads
 * POST — create lead / prospect (does not create a client)
 * PATCH — update pipeline status and/or next action
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { getPayload } from "payload";
import config from "@payload-config";
import { LEAD_STATUSES } from "@/lib/sales/types";
import { isNextAction, NEXT_ACTION_LABEL, type NextAction } from "@/lib/sales/next-action";
import { SECTION_LABEL, STATUS_TO_SECTION } from "@/lib/sales/workspace-stages";
import { logSalesActivity } from "@/lib/sales/activities";
import { initialResponseDueAt, isLostReason } from "@/lib/sales/follow-up-policy";
import {
  shouldLogObligationChange,
  validateObligationPatch,
} from "@/lib/sales/obligation";

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
        nextAction: "respond-today",
        nextFollowUp: initialResponseDueAt().toISOString(),
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

    if (!id) {
      return NextResponse.json({ success: false, error: "Valid id required." }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (body.status != null) {
      if (!VALID_STATUSES.has(body.status)) {
        return NextResponse.json({ success: false, error: "Invalid status." }, { status: 400 });
      }
      data.status = body.status;
    }
    if (body.nextAction != null) {
      if (!isNextAction(body.nextAction)) {
        return NextResponse.json({ success: false, error: "Invalid next action." }, { status: 400 });
      }
      data.nextAction = body.nextAction;
    }
    if (body.nextActionNote != null) {
      data.nextActionNote = String(body.nextActionNote).trim() || null;
    }
    if (body.nextFollowUp !== undefined) {
      data.nextFollowUp = body.nextFollowUp ? String(body.nextFollowUp) : null;
    }
    if (body.lostReason != null) {
      if (!isLostReason(body.lostReason)) {
        return NextResponse.json({ success: false, error: "Invalid lost reason." }, { status: 400 });
      }
      data.lostReason = body.lostReason;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { success: false, error: "Provide status, nextAction, or nextFollowUp." },
        { status: 400 },
      );
    }

    const payload = await getPayload({ config });
    const existing = await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "sales-leads" as any,
      id,
      depth: 0,
      overrideAccess: true,
    });

    const currentNextAction: NextAction = isNextAction(existing.nextAction)
      ? existing.nextAction
      : "none";
    const validated = validateObligationPatch({
      currentStatus: String(existing.status ?? "new"),
      currentNextAction,
      patch: {
        status: data.status as string | undefined,
        nextAction: data.nextAction as NextAction | undefined,
        nextFollowUp:
          data.nextFollowUp === undefined ? undefined : (data.nextFollowUp as string | null),
        nextActionNote: data.nextActionNote as string | null | undefined,
        lostReason: isLostReason(data.lostReason) ? data.lostReason : undefined,
      },
    });
    if (!validated.ok) {
      return NextResponse.json({ success: false, error: validated.message }, { status: 400 });
    }

    const write = {
      ...data,
      ...validated.data,
    };

    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "sales-leads" as any,
      id,
      data: write,
      overrideAccess: true,
    });

    if (write.status && String(existing.status) !== String(write.status)) {
      const section = STATUS_TO_SECTION[String(write.status)] ?? "new-leads";
      try {
        await logSalesActivity({
          activityType: write.status === "won" ? "note" : "follow-up",
          title:
            write.status === "won"
              ? "Opportunity won"
              : write.status === "lost"
                ? `Opportunity lost${write.lostReason ? ` · ${write.lostReason}` : ""}`
                : `Stage → ${SECTION_LABEL[section]}`,
          summary: `${String(existing.companyName ?? "Opportunity")} moved to ${SECTION_LABEL[section]}.`,
          leadId: id,
        });
      } catch (err) {
        console.error("[KXD Sales] Stage activity log failed:", err);
      }
    } else if (
      shouldLogObligationChange({
        prevAction: currentNextAction,
        nextAction: isNextAction(write.nextAction) ? write.nextAction : currentNextAction,
        prevFollowUp: existing.nextFollowUp ? String(existing.nextFollowUp) : null,
        nextFollowUp:
          write.nextFollowUp != null ? String(write.nextFollowUp) : existing.nextFollowUp
            ? String(existing.nextFollowUp)
            : null,
      })
    ) {
      const nextAction = isNextAction(write.nextAction) ? write.nextAction : currentNextAction;
      try {
        await logSalesActivity({
          activityType: "follow-up",
          title: "Next action updated",
          summary: [
            `Next: ${NEXT_ACTION_LABEL[nextAction]}.`,
            write.nextFollowUp ? `Due ${String(write.nextFollowUp)}.` : null,
          ]
            .filter(Boolean)
            .join(" "),
          leadId: id,
        });
      } catch (err) {
        console.error("[KXD Sales] Obligation activity log failed:", err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[KXD Sales] Failed to update lead:", err);
    return NextResponse.json({ success: false, error: "Failed to update lead." }, { status: 500 });
  }
}
