/**
 * POST /api/admin/sales/leads/:id/outreach
 * Log meaningful outreach without auto-advancing commercial stage.
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { getPayload } from "payload";
import config from "@payload-config";
import { logSalesActivity } from "@/lib/sales/activities";
import {
  defaultObligationAfterOutreach,
  type OutreachKind,
} from "@/lib/sales/follow-up-policy";
import { isNextAction, NEXT_ACTION_LABEL, type NextAction } from "@/lib/sales/next-action";
import { validateObligationPatch } from "@/lib/sales/obligation";

export const dynamic = "force-dynamic";

const OUTREACH: Record<
  OutreachKind,
  { activityType: "email" | "call" | "meeting" | "note" | "follow-up"; title: string }
> = {
  email: { activityType: "email", title: "Email sent" },
  call: { activityType: "call", title: "Call logged" },
  meeting: { activityType: "meeting", title: "Meeting logged" },
  note: { activityType: "note", title: "Note added" },
  "follow-up": { activityType: "follow-up", title: "Follow-up logged" },
};

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id: rawId } = await ctx.params;
  const id = Number(rawId);
  if (!id) {
    return NextResponse.json({ success: false, error: "Valid lead id required." }, { status: 400 });
  }

  try {
    const body = await req.json();
    const kind = String(body.kind ?? "") as OutreachKind;
    if (!OUTREACH[kind]) {
      return NextResponse.json(
        { success: false, error: "kind must be email, call, meeting, note, or follow-up." },
        { status: 400 },
      );
    }

    const payload = await getPayload({ config });
    const lead = await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "sales-leads" as any,
      id,
      depth: 0,
      overrideAccess: true,
    });

    const meta = OUTREACH[kind];
    const summary = String(body.summary ?? "").trim() || undefined;
    await logSalesActivity({
      activityType: meta.activityType,
      title: meta.title,
      summary,
      leadId: id,
    });

    const status = String(lead.status ?? "new");
    if (status !== "won" && status !== "lost") {
      const fallback = defaultObligationAfterOutreach(kind);
      const nextAction = isNextAction(body.nextAction)
        ? body.nextAction
        : fallback.nextAction;
      const validated = validateObligationPatch({
        currentStatus: status,
        currentNextAction: isNextAction(lead.nextAction) ? lead.nextAction : "none",
        patch: {
          nextAction,
          nextFollowUp: body.nextFollowUp
            ? String(body.nextFollowUp)
            : fallback.nextFollowUp.toISOString(),
          nextActionNote: body.nextActionNote
            ? String(body.nextActionNote)
            : undefined,
        },
      });
      if (!validated.ok) {
        return NextResponse.json({ success: false, error: validated.message }, { status: 400 });
      }
      await payload.update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "sales-leads" as any,
        id,
        data: validated.data,
        overrideAccess: true,
      });
    }

    const nextActionValue: unknown = body.nextAction;
    const resolvedNextAction: NextAction = isNextAction(nextActionValue)
      ? nextActionValue
      : defaultObligationAfterOutreach(kind).nextAction;

    return NextResponse.json({
      success: true,
      nextAction: status === "won" || status === "lost" ? lead.nextAction : resolvedNextAction,
      nextActionLabel: NEXT_ACTION_LABEL[resolvedNextAction],
    });
  } catch (err) {
    console.error("[KXD Sales] Outreach log failed:", err);
    return NextResponse.json(
      { success: false, error: "Failed to log outreach." },
      { status: 500 },
    );
  }
}
